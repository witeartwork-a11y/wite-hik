<?php
// === НАСТРОЙКИ ===
@ini_set('upload_max_filesize', '256M');
@ini_set('post_max_size', '256M');
@ini_set('memory_limit', '512M');
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Content-Type: application/json; charset=UTF-8");

$PASSWORD = 'hikomori1hikomori1'; 
$BASE_DIR = __DIR__;
$UPLOADS_DIR = $BASE_DIR . '/uploads';
$CLOUD_DIR = $BASE_DIR . '/uploads/cloud'; // Папка для облачных файлов
$ASSETS_DIR = $BASE_DIR . '/uploads/assets'; // Папка для масок и оверлеев
$DATA_DIR = $BASE_DIR . '/data';
$THUMBS_DIR = $BASE_DIR . '/data/thumbnails';
$SHORT_URLS_FILE = $DATA_DIR . '/short_urls.json'; // База коротких ссылок
$PROTECTED_FILES = ['thumbnails'];

$CONFIG_FILE = $DATA_DIR . '/products_config.json';
$PRINTS_CONFIG_FILE = $DATA_DIR . '/prints_config.json';
$PRINTS_CONFIGS_DIR = $DATA_DIR . '/prints_configs';

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
// Транслитерация кириллицы в латиницу
function transliterate($str) {
    $cyrillicToLatin = [
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 
        'е' => 'e', 'ё' => 'yo', 'ж' => 'zh', 'з' => 'z', 'и' => 'i',
        'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n',
        'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't',
        'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch',
        'ш' => 'sh', 'щ' => 'sch', 'ъ' => '', 'ы' => 'y', 'ь' => '',
        'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
        'А' => 'A', 'Б' => 'B', 'В' => 'V', 'Г' => 'G', 'Д' => 'D',
        'Е' => 'E', 'Ё' => 'Yo', 'Ж' => 'Zh', 'З' => 'Z', 'И' => 'I',
        'Й' => 'Y', 'К' => 'K', 'Л' => 'L', 'М' => 'M', 'Н' => 'N',
        'О' => 'O', 'П' => 'P', 'Р' => 'R', 'С' => 'S', 'Т' => 'T',
        'У' => 'U', 'Ф' => 'F', 'Х' => 'H', 'Ц' => 'Ts', 'Ч' => 'Ch',
        'Ш' => 'Sh', 'Щ' => 'Sch', 'Ъ' => '', 'Ы' => 'Y', 'Ь' => '',
        'Э' => 'E', 'Ю' => 'Yu', 'Я' => 'Ya'
    ];
    
    $result = '';
    for ($i = 0; $i < mb_strlen($str); $i++) {
        $char = mb_substr($str, $i, 1);
        $result .= $cyrillicToLatin[$char] ?? $char;
    }
    return $result;
}

// Исправление 1: Убираем лишнее расширение
function sanitize($name) {
    $info = pathinfo($name);
    $ext = $info['extension'] ?? '';
    $filename = $info['filename'];
    
    // Сначала транслитерируем кириллицу
    $filename = transliterate($filename);
    
    // Затем удаляем все символы кроме латиницы, цифр, дефиса и подчеркивания
    $clean = preg_replace('/[^a-zA-Z0-9\-_]/', '', $filename);
    
    // Заменяем множественные подряд идущие дефисы/подчеркивания на один
    $clean = preg_replace('/[\-_]+/', '_', $clean);
    
    if (!$clean) $clean = 'file_' . time();
    return $clean . '.' . strtolower($ext);
}

// Функция для очистки артикула (без расширения)
function sanitizeArticle($article) {
    // Только удаляем опасные символы (слэши, точки в конце и т.д.), но сохраняем цифры и подчеркивания
    $clean = preg_replace('/[^a-zA-Z0-9_\-.]/', '', $article);
    // Удаляем точки в конце (они появляются когда артикул содержал точку)
    $clean = rtrim($clean, '.');
    if (!$clean) $clean = 'article_' . time();
    return $clean;
}

// === Система коротких ссылок для товаров ===
function generateShortId() {
    // Генерируем уникальный ID из букв и цифр (8 символов)
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    $id = '';
    for ($i = 0; $i < 8; $i++) {
        $id .= $chars[rand(0, strlen($chars) - 1)];
    }
    return $id;
}

function loadShortUrls($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function saveShortUrls($file, $data) {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function createShortUrl($fullUrl, $isPublic = true, $shortUrlsFile = null) {
    global $SHORT_URLS_FILE;
    if ($shortUrlsFile === null) $shortUrlsFile = $SHORT_URLS_FILE;
    
    $urls = loadShortUrls($shortUrlsFile);
    
    // Проверяем есть ли уже такая ссылка
    foreach ($urls as $shortId => $entry) {
        if ($entry['url'] === $fullUrl) return $shortId;
    }
    
    // Генерируем новую
    do {
        $shortId = generateShortId();
    } while (isset($urls[$shortId]));
    
    $urls[$shortId] = [
        'url' => $fullUrl,
        'public' => $isPublic,
        'created' => time(),
        'accessed' => 0,
        'access_count' => 0
    ];
    
    saveShortUrls($shortUrlsFile, $urls);
    return $shortId;
}

// Функция для правильного имени превью (без дублирования расширения)
function getThumbnailName($filename) {
    $info = pathinfo($filename);
    $filename_clean = transliterate($info['filename']);
    $filename_clean = preg_replace('/[^a-zA-Z0-9\-_]/', '', $filename_clean);
    $filename_clean = preg_replace('/[\-_]+/', '_', $filename_clean);
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
    
    // Use temporary file for atomic write to avoid partial reads
    $tmpDest = $dest . '.tmp';
    $saved = imagejpeg($newImg, $tmpDest, 80);
    
    imagedestroy($newImg);
    imagedestroy($source);

    if ($saved && file_exists($tmpDest)) {
        rename($tmpDest, $dest);
        return true;
    }
    if (file_exists($tmpDest)) {
        @unlink($tmpDest);
    }
    return false;
}

// Сжатие товаров в JPG (оптимизация для маркетплейсов)
function compressProductImage($src, $dest, $quality = 80) {
    if (!extension_loaded('gd')) return false;
    $info = @getimagesize($src);
    if (!$info) return false;
    
    list($width, $height, $type) = $info;
    
    $source = null;
    switch ($type) {
        case IMAGETYPE_JPEG: $source = imagecreatefromjpeg($src); break;
        case IMAGETYPE_PNG:  $source = imagecreatefrompng($src); break;
        case IMAGETYPE_WEBP: $source = imagecreatefromwebp($src); break;
    }
    if (!$source) return false;
    
    // Если исходный файл уже JPG, сохраняем с оптимизацией
    $tmpDest = $dest . '.tmp';
    $saved = imagejpeg($source, $tmpDest, $quality);
    imagedestroy($source);
    
    if ($saved && file_exists($tmpDest)) {
        rename($tmpDest, $dest);
        return true;
    }
    if (file_exists($tmpDest)) {
        @unlink($tmpDest);
    }
    return false;
}

ensureDir($DATA_DIR);
ensureDir($THUMBS_DIR);
ensureDir($UPLOADS_DIR);
ensureDir($CLOUD_DIR);
ensureDir($ASSETS_DIR);
ensureDir($PRINTS_CONFIGS_DIR);

// === Обработчик коротких ссылок ===
// Если URL вида /img/ABC123, редиректим на полный путь
if (preg_match('~/img/([A-Za-z0-9]{8})~', $_SERVER['REQUEST_URI'], $matches)) {
    $shortId = $matches[1];
    $urls = loadShortUrls($SHORT_URLS_FILE);
    
    if (isset($urls[$shortId]) && $urls[$shortId]['public']) {
        // Обновляем статистику
        $urls[$shortId]['accessed'] = time();
        $urls[$shortId]['access_count'] = ($urls[$shortId]['access_count'] ?? 0) + 1;
        saveShortUrls($SHORT_URLS_FILE, $urls);
        
        // Редиректим на полный путь
        $targetUrl = $urls[$shortId]['url'];
        header('Location: ' . $targetUrl);
        exit;
    }
    
    // Если ссылка не найдена
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Short URL not found']);
    exit;
}

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
    
    $products = $input['products'] ?? [];
    
    // Логирование (только количество)
    error_log('📝 save_config: ' . count($products) . ' products');
    
    $result = file_put_contents($CONFIG_FILE, json_encode($products, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    if ($result === false) {
        jsonResponse(false, [], 'Failed to write config file. Permissions? ' . $CONFIG_FILE);
    }
    jsonResponse(true, ['saved' => count($products)]);
}

if ($action === 'load_prints_config') {
    $printName = $_GET['print_name'] ?? null;

    if ($printName) {
        $hash = md5($printName);
        $file = $PRINTS_CONFIGS_DIR . '/' . $hash . '.json';
        
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            jsonResponse(true, ['config' => $data]);
        } 
        
        // Fallback to big file
        if (file_exists($PRINTS_CONFIG_FILE)) {
            $allConfigs = json_decode(file_get_contents($PRINTS_CONFIG_FILE), true);
            if (isset($allConfigs[$printName])) {
                jsonResponse(true, ['config' => $allConfigs[$printName]]);
            }
        }
        
        jsonResponse(true, ['config' => null]);
    } else {
        if (file_exists($PRINTS_CONFIG_FILE)) {
            jsonResponse(true, ['config' => json_decode(file_get_contents($PRINTS_CONFIG_FILE), true)]);
        } else {
            jsonResponse(true, ['config' => []]);
        }
    }
}

if ($action === 'save_prints_config') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    if (isset($input['print_name']) && isset($input['print_data'])) {
        $hash = md5($input['print_name']);
        $file = $PRINTS_CONFIGS_DIR . '/' . $hash . '.json';
        
        $result = file_put_contents($file, json_encode($input['print_data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        if ($result === false) {
             jsonResponse(false, [], 'Failed to write config file. Permissions? Path: ' . $file);
        }
        jsonResponse(true);
    } else {
        jsonResponse(false, [], 'Bulk save not supported in optimized mode');
    }
}

if ($action === 'generate_sku') {
    // Формат: DDMMYYX
    // 29 - число, 01 - месяц, 26 - год (2 цифры)
    $today = date('dmy'); // 290126
    
    // Сканируем папку облака на наличие папок, начинающихся с $today
    $maxSuffix = 0;
    
    if (is_dir($CLOUD_DIR)) {
        $articles = scandir($CLOUD_DIR);
        foreach ($articles as $article) {
            if ($article === '.' || $article === '..') continue;
            if (!is_dir($CLOUD_DIR . '/' . $article)) continue;
            
            // Проверяем, начинается ли имя папки с сегодняшней даты
            if (strpos($article, $today) === 0) {
                // Извлекаем суффикс
                $suffixStr = substr($article, strlen($today));
                
                // Проверяем, является ли остаток числом
                if (is_numeric($suffixStr)) {
                    $suffix = intval($suffixStr);
                    if ($suffix > $maxSuffix) {
                        $maxSuffix = $suffix;
                    }
                }
            }
        }
    }
    
    // Генерируем следующий номер
    $nextSuffix = $maxSuffix + 1;
    $newSku = $today . $nextSuffix;
    
    jsonResponse(true, ['sku' => $newSku]);
}

if ($action === 'list') {
    $list = [];
    
    // Сканируем ОБЫЧНЫЕ файлы (загруженные пользователем), исключая cloud и assets
    $files = array_diff(scandir($UPLOADS_DIR), ['.', '..', 'cloud', 'assets', 'publication']);
    foreach ($files as $f) {
        $path = $UPLOADS_DIR . '/' . $f;
        if (!is_file($path)) continue;
        
        $thumbName = getThumbnailName($f);
        $thumbPath = $THUMBS_DIR . '/' . $thumbName;
        $thumbUrl = null;

        // Check exists AND if original is newer than thumbnail
        if (!file_exists($thumbPath) || filemtime($path) > filemtime($thumbPath)) {
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
    
    // Сканируем ФАЙЛЫ НА ПУБЛИКАЦИЮ
    $publicationDir = $BASE_DIR . '/uploads/publication';
    if (is_dir($publicationDir)) {
        $pubFiles = array_diff(scandir($publicationDir), ['.', '..']);
        foreach ($pubFiles as $f) {
            $path = $publicationDir . '/' . $f;
            if (!is_file($path)) continue;
            
            $thumbName = getThumbnailName($f);
            $thumbPath = $THUMBS_DIR . '/' . $thumbName;
            $thumbUrl = null;

            if (!file_exists($thumbPath) || filemtime($path) > filemtime($thumbPath)) {
                if (createThumbnail($path, $thumbPath)) {
                    $thumbUrl = '/data/thumbnails/' . $thumbName;
                }
            } else {
                $thumbUrl = '/data/thumbnails/' . $thumbName;
            }

            $list[] = [
                'name' => $f,
                'url' => '/uploads/publication/' . $f,
                'thumb' => $thumbUrl ? $thumbUrl : '/uploads/publication/' . $f,
                'mtime' => filemtime($path),
                'size' => filesize($path),
                'type' => 'publication'
            ];
        }
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
                    // Пропускаем файлы метаданных
                    if (substr($f, -10) === '.meta.json') continue;
                    
                    $thumbName = getThumbnailName($f);
                    $thumbPath = $THUMBS_DIR . '/' . $thumbName;
                    $thumbUrl = null;

                    if (!file_exists($thumbPath) || filemtime($path) > filemtime($thumbPath)) {
                        if (createThumbnail($path, $thumbPath)) {
                            $thumbUrl = '/data/thumbnails/' . $thumbName;
                        }
                    } else {
                        $thumbUrl = '/data/thumbnails/' . $thumbName;
                    }
                    
                    if (!$articleThumbnail) {
                        $articleThumbnail = $thumbUrl ? $thumbUrl : '/uploads/cloud/' . $article . '/' . $category . '/' . $f;
                    }

                    $cloudItem = [
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
                    
                    // Для товаров генерируем/получаем короткую ссылку
                    if ($category === 'products') {
                        $shortId = createShortUrl($cloudItem['url'], true, $SHORT_URLS_FILE);
                        $cloudItem['short_url'] = '/img/' . $shortId;
                    }
                    
                    // Пытаемся прочитать оригинальное имя файла из метаданных
                    $metaFile = $path . '.meta.json';
                    if (file_exists($metaFile)) {
                        $meta = json_decode(file_get_contents($metaFile), true);
                        if (isset($meta['print_name'])) {
                            $cloudItem['print_name'] = $meta['print_name'];
                        }
                        if (isset($meta['product_name'])) {
                            $cloudItem['product_name'] = $meta['product_name'];
                        }
                    }
                    
                    $list[] = $cloudItem;
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

    $uploadType = $_POST['type'] ?? 'upload'; // 'upload', 'publication', 'cloud' или 'asset'
    $article = $_POST['article'] ?? null; // Артикул (имя папки)
    $category = $_POST['category'] ?? 'files'; // 'mockups' или 'products'
    $printName = $_POST['print_name'] ?? null; // Оригинальное имя принта
    $productName = $_POST['product_name'] ?? null; // Имя продукта
    $assetType = $_POST['assetType'] ?? null; // 'mask' или 'overlay'

    // Определяем папку для загрузки
    if ($uploadType === 'cloud' && $article) {
        // Путь: /uploads/cloud/[артикул]/[категория]/
        $uploadPath = $CLOUD_DIR . '/' . sanitizeArticle($article) . '/' . $category;
        ensureDir($uploadPath);
    } elseif ($uploadType === 'publication') {
        // Путь: /uploads/publication/ для файлов на публикацию
        $uploadPath = $BASE_DIR . '/uploads/publication';
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
                $relUrl = '/uploads/cloud/' . sanitizeArticle($article) . '/' . $category . '/' . $newName;
            } elseif ($uploadType === 'asset') {
                $relUrl = '/uploads/assets/' . $newName;
            } else {
                $relUrl = '/uploads/' . $newName;
            }
            
            // Сжимаем товары в JPG для оптимизации на маркетплейсах
            if ($uploadType === 'cloud' && $article && $category === 'products') {
                $originalSize = filesize($finalPath);
                // Если файл PNG или больше 2MB, конвертуем в JPG качество 82
                if (strtolower(pathinfo($finalPath, PATHINFO_EXTENSION)) === 'png' || $originalSize > 2097152) {
                    $jpgPath = str_replace(pathinfo($finalPath, PATHINFO_EXTENSION), 'jpg', $finalPath);
                    if (compressProductImage($finalPath, $jpgPath, 82)) {
                        @unlink($finalPath);
                        $finalPath = $jpgPath;
                        $newName = pathinfo($jpgPath, PATHINFO_BASENAME);
                        $relUrl = '/uploads/cloud/' . sanitizeArticle($article) . '/' . $category . '/' . $newName;
                    }
                }
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
            
            $uploadedItem = [
                'name' => $newName,
                'url' => $relUrl,
                'thumb' => $thumbUrl,
                'mtime' => filemtime($finalPath),
                'size' => filesize($finalPath),
                'type' => $uploadType
            ];
            
            // Добавляем дополнительные поля для облачных файлов
            if ($uploadType === 'cloud' && $article) {
                $uploadedItem['article'] = $article;
                $uploadedItem['category'] = $category;
                
                // Для товаров создаём короткую ссылку
                if ($category === 'products') {
                    $shortId = createShortUrl($relUrl, true, $SHORT_URLS_FILE);
                    $uploadedItem['short_url'] = '/img/' . $shortId;
                }
                
                $metaData = [];
                if ($printName) {
                    $uploadedItem['print_name'] = $printName;
                    $metaData['print_name'] = $printName;
                }
                if ($productName) {
                    $uploadedItem['product_name'] = $productName;
                    $metaData['product_name'] = $productName;
                }
                
                if (!empty($metaData)) {
                    // Сохраняем метаданные
                    $metaFile = $finalPath . '.meta.json';
                    file_put_contents($metaFile, json_encode($metaData, JSON_UNESCAPED_UNICODE));
                }
            }
            
            $uploaded[] = $uploadedItem;
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
    $fileType = $input['type'] ?? 'upload'; // 'upload', 'publication', 'cloud' или 'asset'
    
    // Путь в зависимости от типа
    if ($isAsset || $fileType === 'asset') {
        // Файл из папки assets (маска/оверлей)
        $path = $ASSETS_DIR . '/' . $filename;
    } elseif ($fileType === 'publication') {
        // Файл из папки publication
        $path = $BASE_DIR . '/uploads/publication/' . $filename;
    } elseif ($article && $category) {
        $path = $CLOUD_DIR . '/' . sanitizeArticle($article) . '/' . $category . '/' . $filename;
    } else {
        $path = $UPLOADS_DIR . '/' . $filename;
    }
    
    if (file_exists($path)) {
        unlink($path);
        // Удаляем метаданные если они есть
        $metaFile = $path . '.meta.json';
        if (file_exists($metaFile)) unlink($metaFile);
        
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
    $article = sanitizeArticle($input['article'] ?? '');
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
    $article = sanitizeArticle($input['article'] ?? '');
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
