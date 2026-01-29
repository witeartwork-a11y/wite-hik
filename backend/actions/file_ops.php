<?php
// === ФАЙЛОВЫЕ ОПЕРАЦИИ (RENAME, DELETE) ===

if ($action === 'rename') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    $filename = $input['filename'];
    $newBaseName = $input['new_name']; 
    $type = $input['type'] ?? 'upload';

    $basePath = $UPLOADS_DIR;
    if ($type === 'publication') {
        $basePath = $BASE_DIR . '/uploads/publication';
    } elseif ($type === 'cloud') {
         jsonResponse(false, [], 'Cloud rename not supported via this action');
    }

    $oldPath = $basePath . '/' . $filename;
    
    if (!file_exists($oldPath)) {
        jsonResponse(false, [], 'File not found');
    }
    
    $info = pathinfo($filename);
    $ext = $info['extension'] ?? '';
    
    $finalNewName = sanitize($newBaseName . '.' . $ext);
    $newPath = $basePath . '/' . $finalNewName;
    
    if ($filename === $finalNewName) {
        jsonResponse(true, ['name' => $filename]);
    }
    
    if (file_exists($newPath)) {
        jsonResponse(false, [], 'File already exists');
    }
    
    if (rename($oldPath, $newPath)) {
        $oldThumb = $THUMBS_DIR . '/' . getThumbnailName($filename);
        $newThumb = $THUMBS_DIR . '/' . getThumbnailName($finalNewName);
        if (file_exists($oldThumb)) {
            rename($oldThumb, $newThumb);
        }
        jsonResponse(true, ['name' => $finalNewName]);
    } else {
        jsonResponse(false, [], 'Rename failed');
    }
}

if ($action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    $filename = basename($input['filename']);
    $article = $input['article'] ?? null;
    $category = $input['category'] ?? null;
    $isAsset = $input['isAsset'] ?? false;
    $fileType = $input['type'] ?? 'upload'; 
    
    if ($isAsset || $fileType === 'asset') {
        $path = $ASSETS_DIR . '/' . $filename;
    } elseif ($fileType === 'publication') {
        $path = $BASE_DIR . '/uploads/publication/' . $filename;
    } elseif ($article && $category) {
        $path = $CLOUD_DIR . '/' . sanitizeArticle($article) . '/' . $category . '/' . $filename;
    } else {
        $path = $UPLOADS_DIR . '/' . $filename;
    }
    
    if (file_exists($path)) {
        unlink($path);
        $metaFile = $path . '.meta.json';
        if (file_exists($metaFile)) unlink($metaFile);
        
        $thumbName = getThumbnailName($filename);
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
        $thumbName = getThumbnailName($f);
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
            $thumbName = getThumbnailName($f);
            $thumbPath = $THUMBS_DIR . '/' . $thumbName;
            if (file_exists($thumbPath)) @unlink($thumbPath);
        }
    }

    rrmdir($targetDir);

    jsonResponse(true);
}
