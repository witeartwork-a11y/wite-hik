<?php
// === ЗАГРУЗКА ФАЙЛОВ ===

if (($_POST['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');

$uploaded = [];
$files = $_FILES['files'];
$count = is_array($files['name']) ? count($files['name']) : 1;

$uploadType = $_POST['type'] ?? 'upload'; 
$article = $_POST['article'] ?? null;
$category = $_POST['category'] ?? 'files';
$printName = $_POST['print_name'] ?? null;
$productName = $_POST['product_name'] ?? null;
$assetType = $_POST['assetType'] ?? null; 

// Определяем папку
if ($uploadType === 'cloud' && $article) {
    $uploadPath = $CLOUD_DIR . '/' . sanitizeArticle($article) . '/' . $category;
    ensureDir($uploadPath);
} elseif ($uploadType === 'publication') {
    $uploadPath = $BASE_DIR . '/uploads/publication';
    ensureDir($uploadPath);
} elseif ($uploadType === 'asset') {
    $uploadPath = $ASSETS_DIR;
} else {
    $uploadPath = $UPLOADS_DIR;
}

for ($i = 0; $i < $count; $i++) {
    $name = is_array($files['name']) ? $files['name'][$i] : $files['name'];
    $tmp = is_array($files['name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
    
    $newName = sanitize($name);
    
    // Если это ассет, добавляем уникальный суффикс, чтобы избежать перезаписи и коллизий
    if ($uploadType === 'asset') {
        $info = pathinfo($newName);
        $newName = $info['filename'] . '_' . uniqid() . '.' . $info['extension'];
    }

    $finalPath = $uploadPath . '/' . $newName;

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
        
        // Сжатие в JPG
        if ($uploadType === 'cloud' && $article && $category === 'products') {
            $originalSize = filesize($finalPath);
            if (strtolower(pathinfo($finalPath, PATHINFO_EXTENSION)) === 'png' || $originalSize > 2097152) {
                $jpgPath = str_replace(pathinfo($finalPath, PATHINFO_EXTENSION), 'jpg', $finalPath);
                if (compressProductImage($finalPath, $jpgPath, 82)) {
                    @unlink($finalPath); // Удаляем тяжелый PNG
                    $finalPath = $jpgPath;
                    $newName = basename($finalPath);
                    $relUrl = '/uploads/cloud/' . sanitizeArticle($article) . '/' . $category . '/' . $newName;
                }
            }
        }
        
        // Превью
        $thumbPrefix = 'upload';
        if ($uploadType === 'cloud' && $article) {
             $thumbPrefix = 'cloud_' . sanitizeArticle($article) . '_' . $category;
        } elseif ($uploadType === 'publication') {
             $thumbPrefix = 'pub';
        } elseif ($uploadType === 'asset') {
             $thumbPrefix = 'asset';
        }

        $thumbName = getThumbnailName($newName, $thumbPrefix);
        $thumbPath = $THUMBS_DIR . '/' . $thumbName;
        $thumbUrl = null;
        
        if (createThumbnail($finalPath, $thumbPath)) {
            $thumbUrl = '/data/thumbnails/' . $thumbName;
        } else {
            $thumbUrl = $relUrl; 
        }
        
        $uploadedItem = [
            'name' => $newName,
            'url' => $relUrl,
            'thumb' => $thumbUrl,
            'mtime' => filemtime($finalPath),
            'size' => filesize($finalPath),
            'type' => $uploadType
        ];
        
        // Доп. поля
        if ($uploadType === 'cloud' && $article) {
            $uploadedItem['article'] = $article;
            $uploadedItem['category'] = $category;
            
            if ($category === 'products') {
                $shortId = createShortUrl($relUrl, true);
                $uploadedItem['short_url'] = '/img/' . $shortId;
            }
            
            $metaData = [];
            if ($printName) {
                $metaData['print_name'] = $printName;
            }
            if ($productName) {
                $metaData['product_name'] = $productName;
            }
            
            if (!empty($metaData)) {
                file_put_contents($finalPath . '.meta.json', json_encode($metaData));
                $uploadedItem['meta'] = $metaData;
                
                // Copy to top level for frontend compatibility
                if (isset($metaData['print_name'])) $uploadedItem['print_name'] = $metaData['print_name'];
                if (isset($metaData['product_name'])) $uploadedItem['product_name'] = $metaData['product_name'];
            }

        }
        
        $uploaded[] = $uploadedItem;
    }
}

jsonResponse(true, ['files' => $uploaded]);
