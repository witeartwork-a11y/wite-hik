<?php
// === КОРОТКИЕ ССЫЛКИ ===

function generateShortId() {
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
    global $SHORT_URLS_FILE; // Используем глобальную переменную из config
    if ($shortUrlsFile === null) $shortUrlsFile = $SHORT_URLS_FILE;
    
    $urls = loadShortUrls($shortUrlsFile);
    
    foreach ($urls as $shortId => $entry) {
        if ($entry['url'] === $fullUrl) return $shortId;
    }
    
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
