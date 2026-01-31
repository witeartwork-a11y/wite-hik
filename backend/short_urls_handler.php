<?php
// === ОБНОВЛЕНИЕ СТАТИСТИКИ И РЕДИРЕКТ КОРОТКИХ ССЫЛОК ===

// Если URL вида /img/ABC123, редиректим на полный путь
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
if (preg_match('~/img/([A-Za-z0-9]{8})~', $requestUri, $matches)) {
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
