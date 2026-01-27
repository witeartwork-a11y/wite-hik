<?php
// === НАСТРОЙКИ ===
@ini_set('upload_max_filesize', '256M');
@ini_set('post_max_size', '256M');
@ini_set('memory_limit', '512M');
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$PASSWORD = 'hikomori1hikomori1'; 
$BASE_DIR = __DIR__;
$UPLOADS_DIR = $BASE_DIR . '/uploads';
$CLOUD_DIR = $BASE_DIR . '/uploads/cloud'; // Папка для облачных файлов
$ASSETS_DIR = $BASE_DIR . '/uploads/assets'; // Папка для масок и оверлеев
$DATA_DIR = $BASE_DIR . '/data';
$THUMBS_DIR = $BASE_DIR . '/data/thumbnails';
$CONFIG_FILE = $DATA_DIR . '/products_config.json';

// === ПОМОЩНИКИ ===
function jsonResponse($success, $data = [], $msg = '') {
    echo json_encode(array_merge(['success' => $success, 'message' => $msg], $data));
    exit;
}
function ensureDir($path) {
    if (!file_exists($path)) mkdir($path, 0775, true);
}

// Рекурсивное удаление папки (для очистки артикула/категории)
function rrmdir($dir) {
    if (!is_dir($dir)) return;
    $objects = array_diff(scandir($dir), ['.', '..']);
    foreach ($objects as $object) {
        $path = $dir . '/' . $object;
        if (is_dir($path)) {
            rrmdir($path);
        } else {
            @unlink($path);
        }
    }
    @rmdir($dir);
}
// Исправление 1: Убираем лишнее расширение
function sanitize($name) {
    $info = pathinfo($name);
    $ext = $info['extension'] ?? '';
    $filename = $info['filename'];
    $clean = preg_replace('/[^a-zA-Z0-9\-_]/', '', $filename);
    if (!$clean) $clean = 'file_' . time();
    return $clean . '.' . strtolower($ext);
}

// Функция для правильного имени превью (без дублирования расширения)
function getThumbnailName($filename) {
    $info = pathinfo($filename);
    $filename_clean = preg_replace('/[^a-zA-Z0-9\-_]/', '', $info['filename']);
    if (!$filename_clean) $filename_clean = 'file_' . time();
    return 'thumb_' . $filename_clean . '.jpg';
}

// Исправление 2: .jpg для превью
function createThumbnail($src, $dest, $targetWidth = 300) {
    if (!extension_loaded('gd')) return false;
    $info = @getimagesize($src);
    if (!$info) return false;
    
    list($width, $height, $type) = $info;

    $ratio = $height / $width;
    $targetHeight = $targetWidth * $ratio;

    $newImg = imagecreatetruecolor($targetWidth, $targetHeight);
    
    $white = imagecolorallocate($newImg, 255, 255, 255);
    imagefilledrectangle($newImg, 0, 0, $targetWidth, $targetHeight, $white);

    $source = null;
    switch ($type) {
        case IMAGETYPE_JPEG: $source = imagecreatefromjpeg($src); break;
        case IMAGETYPE_PNG:  $source = imagecreatefrompng($src); break;
        case IMAGETYPE_WEBP: $source = imagecreatefromwebp($src); break;
    }
    if (!$source) {
        imagedestroy($newImg);
        return false;
    }

    imagecopyresampled($newImg, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
    imagejpeg($newImg, $dest, 80);
    
    imagedestroy($newImg);
    imagedestroy($source);
    return true;
}

ensureDir($DATA_DIR);
ensureDir($THUMBS_DIR);
ensureDir($UPLOADS_DIR);
ensureDir($CLOUD_DIR);
ensureDir($ASSETS_DIR);

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') === $PASSWORD) {
        jsonResponse(true);
    } else {
        jsonResponse(false, ['error' => 'invalid_password']);
    }
}

if ($action === 'load_config') {
    if (file_exists($CONFIG_FILE)) {
        jsonResponse(true, ['config' => json_decode(file_get_contents($CONFIG_FILE), true)]);
    } else {
        jsonResponse(true, ['config' => []]);
    }
}

if ($action === 'save_config') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    file_put_contents($CONFIG_FILE, json_encode($input['products'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    jsonResponse(true);
}

if ($action === 'list') {
    $list = [];
    
    // Сканируем ОБЫЧНЫЕ файлы (загруженные пользователем), исключая cloud и assets
    $files = array_diff(scandir($UPLOADS_DIR), ['.', '..', 'cloud', 'assets']);
    foreach ($files as $f) {
        $path = $UPLOADS_DIR . '/' . $f;
        if (!is_file($path)) continue;
        
        $thumbName = getThumbnailName($f);
        $thumbPath = $THUMBS_DIR . '/' . $thumbName;
        $thumbUrl = null;

        if (!file_exists($thumbPath)) {
            if (createThumbnail($path, $thumbPath)) {
                $thumbUrl = '/data/thumbnails/' . $thumbName;
            }
        } else {
            $thumbUrl = '/data/thumbnails/' . $thumbName;
        }

        $list[] = [
            'name' => $f,
            'url' => '/uploads/' . $f,
            'thumb' => $thumbUrl ? $thumbUrl : '/uploads/' . $f,
            'mtime' => filemtime($path),
            'size' => filesize($path),
            'type' => 'upload'
        ];
    }
    
    // Сканируем ОБЛАЧНЫЕ ПАПКИ
    if (is_dir($CLOUD_DIR)) {
        $articlesDir = array_diff(scandir($CLOUD_DIR), ['.', '..']);
        foreach ($articlesDir as $article) {
            $articlePath = $CLOUD_DIR . '/' . $article;
            if (!is_dir($articlePath)) continue;
            
            $articlemtime = filemtime($articlePath);
            $articleThumbnail = null;
            
            // Проходим по категориям (mockups, products)
            $categories = array_diff(scandir($articlePath), ['.', '..']);
            foreach ($categories as $category) {
                $categoryPath = $articlePath . '/' . $category;
                if (!is_dir($categoryPath)) continue;
                
                $categoryFiles = array_diff(scandir($categoryPath), ['.', '..']);
                foreach ($categoryFiles as $f) {
                    $path = $categoryPath . '/' . $f;
                    if (!is_file($path)) continue;
                    
                    $thumbName = getThumbnailName($f);
                    $thumbPath = $THUMBS_DIR . '/' . $thumbName;
                    $thumbUrl = null;

                    if (!file_exists($thumbPath)) {
                        if (createThumbnail($path, $thumbPath)) {
                            $thumbUrl = '/data/thumbnails/' . $thumbName;
                        }
                    } else {
                        $thumbUrl = '/data/thumbnails/' . $thumbName;
                    }
                    
                    if (!$articleThumbnail) {
                        $articleThumbnail = $thumbUrl ? $thumbUrl : '/uploads/cloud/' . $article . '/' . $category . '/' . $f;
                    }

                    $list[] = [
                        'name' => $f,
                        'url' => '/uploads/cloud/' . $article . '/' . $category . '/' . $f,
                        'thumb' => $thumbUrl ? $thumbUrl : '/uploads/cloud/' . $article . '/' . $category . '/' . $f,
                        'mtime' => filemtime($path),
                        'size' => filesize($path),
                        'type' => 'cloud',
                        'article' => $article,
                        'category' => $category,
                        'article_thumb' => $articleThumbnail
                    ];
                }
            }
        }
    }
    
    usort($list, function($a, $b) { return $b['mtime'] - $a['mtime']; });
    jsonResponse(true, ['files' => $list]);
}

if ($action === 'upload') {
    if (($_POST['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    $uploaded = [];
    $files = $_FILES['files'];
    $count = is_array($files['name']) ? count($files['name']) : 1;

    $uploadType = $_POST['type'] ?? 'upload'; // 'upload', 'cloud' или 'asset'
    $article = $_POST['article'] ?? null; // Артикул (имя папки)
    $category = $_POST['category'] ?? 'files'; // 'mockups' или 'products'
    $assetType = $_POST['assetType'] ?? null; // 'mask' или 'overlay'

    // Определяем папку для загрузки
    if ($uploadType === 'cloud' && $article) {
        // Путь: /uploads/cloud/[артикул]/[категория]/
        $uploadPath = $CLOUD_DIR . '/' . sanitize($article) . '/' . $category;
        ensureDir($uploadPath);
    } elseif ($uploadType === 'asset') {
        // Путь: /uploads/assets/ для масок и оверлеев
        $uploadPath = $ASSETS_DIR;
    } else {
        // Обычная загрузка в /uploads/
        $uploadPath = $UPLOADS_DIR;
    }

    for ($i = 0; $i < $count; $i++) {
        $name = is_array($files['name']) ? $files['name'][$i] : $files['name'];
        $tmp = is_array($files['name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
        
        $newName = sanitize($name);
        $finalPath = $uploadPath . '/' . $newName;

        // Если файл с таким именем уже есть, удаляем его, чтобы новое сохранение перезаписывало старое
        if (file_exists($finalPath)) {
            @unlink($finalPath);
        }
        
        if (move_uploaded_file($tmp, $finalPath)) {
            if ($uploadType === 'cloud' && $article) {
                $relUrl = '/uploads/cloud/' . sanitize($article) . '/' . $category . '/' . $newName;
            } elseif ($uploadType === 'asset') {
                $relUrl = '/uploads/assets/' . $newName;
            } else {
                $relUrl = '/uploads/' . $newName;
            }
            
            // Создаем превью сразу при загрузке
            $thumbName = getThumbnailName($newName);
            $thumbPath = $THUMBS_DIR . '/' . $thumbName;
            $thumbUrl = null;
            
            if (createThumbnail($finalPath, $thumbPath)) {
                $thumbUrl = '/data/thumbnails/' . $thumbName;
            } else {
                $thumbUrl = $relUrl; // Если не получилось создать, используем оригинал
            }
            
            $uploaded[] = [
                'name' => $newName,
                'url' => $relUrl,
                'thumb' => $thumbUrl,
                'mtime' => filemtime($finalPath),
                'size' => filesize($finalPath),
                'type' => $uploadType
            ];
        }
    }
    
    jsonResponse(true, ['files' => $uploaded]);
}

if ($action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    $filename = basename($input['filename']);
    $article = $input['article'] ?? null;
    $category = $input['category'] ?? null;
    $isAsset = $input['isAsset'] ?? false;
    
    // Путь в зависимости от типа
    if ($isAsset) {
        // Файл из папки assets (маска/оверлей)
        $path = $ASSETS_DIR . '/' . $filename;
    } elseif ($article && $category) {
        $path = $CLOUD_DIR . '/' . sanitize($article) . '/' . $category . '/' . $filename;
    } else {
        $path = $UPLOADS_DIR . '/' . $filename;
    }
    
    if (file_exists($path)) {
        unlink($path);
        $thumbName = getThumbnailName($filename);
        $thumbPath = $THUMBS_DIR . '/' . $thumbName;
        if (file_exists($thumbPath)) unlink($thumbPath);
        jsonResponse(true);
    }
    jsonResponse(false, [], 'File not found');
}

// Удалить всю категорию внутри артикула (например только mockups)
if ($action === 'delete_category') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    $article = sanitize($input['article'] ?? '');
    $category = $input['category'] ?? '';
    if (!$article || !$category) jsonResponse(false, [], 'Invalid params');

    $targetDir = $CLOUD_DIR . '/' . $article . '/' . $category;
    if (!is_dir($targetDir)) jsonResponse(false, [], 'Category not found');

    // Удаляем превью для файлов категории
    $files = array_diff(scandir($targetDir), ['.', '..']);
    foreach ($files as $f) {
        $thumbName = getThumbnailName($f);
        $thumbPath = $THUMBS_DIR . '/' . $thumbName;
        if (file_exists($thumbPath)) @unlink($thumbPath);
    }

    rrmdir($targetDir);

    jsonResponse(true);
}

// Удалить весь артикул целиком
if ($action === 'delete_article') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    $article = sanitize($input['article'] ?? '');
    if (!$article) jsonResponse(false, [], 'Invalid params');

    $targetDir = $CLOUD_DIR . '/' . $article;
    if (!is_dir($targetDir)) jsonResponse(false, [], 'Article not found');

    // Удаляем превью всех файлов артикула
    $categories = array_diff(scandir($targetDir), ['.', '..']);
    foreach ($categories as $cat) {
        $categoryPath = $targetDir . '/' . $cat;
        if (!is_dir($categoryPath)) continue;
        $files = array_diff(scandir($categoryPath), ['.', '..']);
        foreach ($files as $f) {
            $thumbName = getThumbnailName($f);
            $thumbPath = $THUMBS_DIR . '/' . $thumbName;
            if (file_exists($thumbPath)) @unlink($thumbPath);
        }
    }

    rrmdir($targetDir);

    jsonResponse(true);
}

jsonResponse(false, [], 'Unknown action');
?>
