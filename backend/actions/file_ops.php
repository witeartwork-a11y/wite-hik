<?php
// === ФАЙЛОВЫЕ ОПЕРАЦИИ (RENAME, DELETE) ===

if ($action === 'rename') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    $filename = $input['filename'];
    $newBaseName = $input['new_name']; 
    $type = $input['type'] ?? 'upload';

    $basePath = $UPLOADS_DIR;
    $prefix = 'upload';
    
    // Support for subdirectories in uploads
    $subDir = '';
    if ($type === 'upload' && strpos($filename, 'source/') === 0) {
         $subDir = dirname($filename);
         if (strpos($subDir, '..') !== false) jsonResponse(false, [], 'Invalid path');
         $prefix = str_replace(['/', '-'], '_', $subDir);
    }
    
    if ($type === 'publication') {
        $basePath = $BASE_DIR . '/uploads/publication';
        $prefix = 'pub';
    } elseif ($type === 'cloud') {
         jsonResponse(false, [], 'Cloud rename not supported via this action');
    }

    $oldPath = $basePath . '/' . $filename;
    
    if (!file_exists($oldPath)) {
        jsonResponse(false, [], 'File not found');
    }
    
    $info = pathinfo($filename);
    $ext = $info['extension'] ?? '';
    
    // Only sanitize the filename part, preserve directory if present
    $finalNewName = sanitize($newBaseName . '.' . $ext);
    
    if ($subDir) {
        $newPath = $basePath . '/' . $subDir . '/' . $finalNewName;
        // Updated filename for response and thumb
        $finalRelativeName = $subDir . '/' . $finalNewName;
    } else {
        $newPath = $basePath . '/' . $finalNewName;
        $finalRelativeName = $finalNewName;
    }
    
    if ($filename === ($subDir ? $finalRelativeName : $finalNewName)) {
        jsonResponse(true, ['name' => $filename]);
    }
    
    if (file_exists($newPath)) {
        jsonResponse(false, [], 'File already exists');
    }
    
    if (rename($oldPath, $newPath)) {
        $oldThumb = $THUMBS_DIR . '/' . getThumbnailName(basename($filename), $prefix);
        $newThumb = $THUMBS_DIR . '/' . getThumbnailName($finalNewName, $prefix); // getThumbnailName expects flattened filename
        if (file_exists($oldThumb)) {
            rename($oldThumb, $newThumb);
        }
        jsonResponse(true, ['name' => $finalRelativeName]);
    } else {
        jsonResponse(false, [], 'Rename failed');
    }
}

if ($action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    $rawFilename = $input['filename'];
    $filename = basename($rawFilename);
    
    $article = $input['article'] ?? null;
    $category = $input['category'] ?? null;
    $isAsset = $input['isAsset'] ?? false;
    $fileType = $input['type'] ?? 'upload';
    $prefix = 'upload';
    
    if ($isAsset || $fileType === 'asset') {
        $path = $ASSETS_DIR . '/' . $filename;
        $prefix = 'asset';
    } elseif ($fileType === 'linked') {
        $linkedFile = __DIR__ . '/../../data/linked_files.json';
        if (file_exists($linkedFile)) {
            $data = json_decode(file_get_contents($linkedFile), true);
            $newData = [];
            $found = false;
            foreach ($data as $d) {
                if ($d['name'] === $rawFilename) { // Match against raw filename just in case
                    $found = true;
                } else {
                    $newData[] = $d;
                }
            }
            if ($found) {
                file_put_contents($linkedFile, json_encode($newData, JSON_PRETTY_PRINT));
                jsonResponse(true);
            }
        }
        jsonResponse(false, [], 'Linked file not found');
    } elseif ($fileType === 'publication') {
        $path = $BASE_DIR . '/uploads/publication/' . $filename;
        $prefix = 'pub';
    } elseif ($article && $category) {
        $path = $CLOUD_DIR . '/' . sanitizeArticle($article) . '/' . $category . '/' . $filename;
        $prefix = 'cloud_' . $article . '_' . $category;
    } else {
        if (strpos($rawFilename, 'source/') === 0 && strpos($rawFilename, '..') === false) {
             $path = $UPLOADS_DIR . '/' . $rawFilename;
             $subdir = dirname($rawFilename);
             $prefix = str_replace(['/', '-'], '_', $subdir);
        } else {
             $path = $UPLOADS_DIR . '/' . $filename;
             $prefix = 'upload';
        }
    }
    
    if (file_exists($path)) {
        unlink($path);
        $metaFile = $path . '.meta.json';
        if (file_exists($metaFile)) unlink($metaFile);
        
        $thumbName = getThumbnailName($filename, $prefix);
        $thumbPath = $THUMBS_DIR . '/' . $thumbName;
        if (file_exists($thumbPath)) unlink($thumbPath);
        jsonResponse(true);
    }
    jsonResponse(false, [], 'File not found');
}

if ($action === 'delete_category') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    $article = sanitizeArticle($input['article'] ?? '');
    $category = $input['category'] ?? '';
    if (!$article || !$category) jsonResponse(false, [], 'Invalid params');

    $targetDir = $CLOUD_DIR . '/' . $article . '/' . $category;
    if (!is_dir($targetDir)) jsonResponse(false, [], 'Category not found');

    $files = array_diff(scandir($targetDir), ['.', '..']);
    foreach ($files as $f) {
        $thumbName = getThumbnailName($f, 'cloud_' . $article . '_' . $category);
        $thumbPath = $THUMBS_DIR . '/' . $thumbName;
        if (file_exists($thumbPath)) @unlink($thumbPath);
    }

    rrmdir($targetDir);

    jsonResponse(true);
}

if ($action === 'delete_article') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    $article = sanitizeArticle($input['article'] ?? '');
    if (!$article) jsonResponse(false, [], 'Invalid params');

    $targetDir = $CLOUD_DIR . '/' . $article;
    if (!is_dir($targetDir)) jsonResponse(false, [], 'Article not found');

    $categories = array_diff(scandir($targetDir), ['.', '..']);
    foreach ($categories as $cat) {
        $categoryPath = $targetDir . '/' . $cat;
        if (!is_dir($categoryPath)) continue;
        $files = array_diff(scandir($categoryPath), ['.', '..']);
        foreach ($files as $f) {
            $thumbName = getThumbnailName($f, 'cloud_' . $article . '_' . $cat);
            $thumbPath = $THUMBS_DIR . '/' . $thumbName;
            if (file_exists($thumbPath)) @unlink($thumbPath);
        }
    }

    rrmdir($targetDir);

    jsonResponse(true);
}
