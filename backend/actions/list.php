<?php
// === СПИСОК ФАЙЛОВ ===

$list = [];

// Сканируем ОБЫЧНЫЕ файлы
$files = array_diff(scandir($UPLOADS_DIR), ['.', '..', 'cloud', 'assets', 'publication', 'source']);
foreach ($files as $f) {
    $path = $UPLOADS_DIR . '/' . $f;
    if (!is_file($path)) continue;
    
    $thumbName = getThumbnailName($f, 'upload');
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
        'url' => '/uploads/' . $f,
        'thumb' => $thumbUrl ? $thumbUrl : '/uploads/' . $f,
        'mtime' => filemtime($path),
        'size' => filesize($path),
        'type' => 'upload'
    ];
}

// Сканируем ИСХОДНИКИ В ПАПКАХ (source/DD-MM-YYYY)
$sourceDir = $UPLOADS_DIR . '/source';
if (is_dir($sourceDir)) {
    $dates = array_diff(scandir($sourceDir), ['.', '..']);
    foreach ($dates as $date) {
        $datePath = $sourceDir . '/' . $date;
        if (!is_dir($datePath)) continue;
        
        $dateFiles = array_diff(scandir($datePath), ['.', '..']);
        foreach ($dateFiles as $f) {
            $path = $datePath . '/' . $f;
            if (!is_file($path)) continue;
            
            $subPath = 'source/' . $date;
            $thumbPrefix = str_replace(['/', '-'], '_', $subPath);
            
            $thumbName = getThumbnailName($f, $thumbPrefix);
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
                'name' => $subPath . '/' . $f,
                'url' => '/uploads/' . $subPath . '/' . $f,
                'thumb' => $thumbUrl ? $thumbUrl : '/uploads/' . $subPath . '/' . $f,
                'mtime' => filemtime($path),
                'size' => filesize($path),
                'type' => 'upload'
            ];
        }
    }
}

// Загружаем ЛИНКОВАННЫЕ (удаленные) файлы
$linkedFile = __DIR__ . '/../../data/linked_files.json';
if (file_exists($linkedFile)) {
    $linkedData = json_decode(file_get_contents($linkedFile), true);
    if (is_array($linkedData)) {
        foreach ($linkedData as $l) {
            $list[] = [
                'name' => $l['name'],
                'url' => $l['url'],
                'thumb' => $l['thumb'] ?? $l['url'],
                'mtime' => $l['mtime'] ?? time(),
                'size' => $l['size'] ?? 0,
                'type' => 'linked',
                'is_remote' => true
            ];
        }
    }
}

// Сканируем ФАЙЛЫ НА ПУБЛИКАЦИЮ
$publicationDir = $BASE_DIR . '/uploads/publication';
if (is_dir($publicationDir)) {
    $pubFiles = array_diff(scandir($publicationDir), ['.', '..']);
    foreach ($pubFiles as $f) {
        $path = $publicationDir . '/' . $f;
        if (!is_file($path)) continue;
        
        $thumbName = getThumbnailName($f, 'pub');
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
        
        // $articlemtime = filemtime($articlePath); // Unused
        
        $categories = array_diff(scandir($articlePath), ['.', '..']);
        foreach ($categories as $category) {
            $categoryPath = $articlePath . '/' . $category;
            if (!is_dir($categoryPath)) continue;
            
            $categoryFiles = array_diff(scandir($categoryPath), ['.', '..']);
            foreach ($categoryFiles as $f) {
                $path = $categoryPath . '/' . $f;
                if (!is_file($path)) continue;
                if (substr($f, -10) === '.meta.json') continue;
                
                $thumbName = getThumbnailName($f, 'cloud_' . $article . '_' . $category);
                $thumbPath = $THUMBS_DIR . '/' . $thumbName;
                $thumbUrl = null;

                if (!file_exists($thumbPath) || filemtime($path) > filemtime($thumbPath)) {
                    if (createThumbnail($path, $thumbPath)) {
                        $thumbUrl = '/data/thumbnails/' . $thumbName;
                    }
                } else {
                    $thumbUrl = '/data/thumbnails/' . $thumbName;
                }
                
                $cloudItem = [
                    'name' => $f,
                    'url' => '/uploads/cloud/' . $article . '/' . $category . '/' . $f,
                    'thumb' => $thumbUrl ? $thumbUrl : '/uploads/cloud/' . $article . '/' . $category . '/' . $f,
                    'mtime' => filemtime($path),
                    'size' => filesize($path),
                    'type' => 'cloud',
                    'article' => $article,
                    'category' => $category
                ];
                
                // Для товаров получаем короткую ссылку, если она есть
                if ($category === 'products') {
                    $fullUrl = $cloudItem['url'];
                    $shortId = createShortUrl($fullUrl, true);
                    $cloudItem['short_url'] = '/img/' . $shortId;
                }
                
                // Метаданные (product_name, и т.д.)
                $metaFile = $path . '.meta.json';
                if (file_exists($metaFile)) {
                    $meta = json_decode(file_get_contents($metaFile), true);
                    if ($meta) {
                        $cloudItem['meta'] = $meta;
                        if (!empty($meta['product_name'])) {
                            $cloudItem['product_name'] = $meta['product_name'];
                        }
                        if (!empty($meta['print_name'])) {
                            $cloudItem['print_name'] = $meta['print_name'];
                        }
                    }
                }
                
                $list[] = $cloudItem;
            }
        }
    }
}

usort($list, function($a, $b) { return $b['mtime'] - $a['mtime']; });
jsonResponse(true, ['files' => $list]);
