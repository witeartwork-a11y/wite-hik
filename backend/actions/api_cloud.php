<?php
// === CLOUD PRODUCTS API ===

$apiKey = $_GET['key'] ?? '';

// Check API Key
if (!isset($API_KEY) || $apiKey !== $API_KEY) {
    jsonResponse(false, ['error' => 'auth_failed'], 'Invalid or missing API Key');
}

$products = [];
if (is_dir($CLOUD_DIR)) {
    $scanned = scandir($CLOUD_DIR);
    foreach ($scanned as $f) {
        if ($f === '.' || $f === '..') continue;
        
        $path = $CLOUD_DIR . '/' . $f;
        if (is_file($path)) {
             $publicUrl = '/uploads/cloud/' . $f;
             
             // Extract article from filename (filename without extension)
             $parts = pathinfo($f);
             $article = $parts['filename'];
             
             $products[] = [
                 'filename' => $f,
                 'article' => $article,
                 'link' => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$publicUrl",
                 'size' => filesize($path),
                 'updated_at' => date('Y-m-d H:i:s', filemtime($path))
             ];
        }
    }
}

jsonResponse(true, ['products' => $products]);
