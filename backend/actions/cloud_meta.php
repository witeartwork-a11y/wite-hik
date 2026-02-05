<?php
// === ОБНОВЛЕНИЕ МЕТАДАННЫХ ОБЛАКА ===

if ($action !== 'update_cloud_meta') {
    jsonResponse(false, [], 'Unknown action');
}

$input = json_decode(file_get_contents('php://input'), true);
if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');

$article = sanitizeArticle($input['article'] ?? '');
$printName = isset($input['print_name']) ? trim($input['print_name']) : null;

if (!$article) jsonResponse(false, [], 'Invalid article');

$articleDir = $CLOUD_DIR . '/' . $article;
if (!is_dir($articleDir)) jsonResponse(false, [], 'Article not found');

$metaFile = $articleDir . '/.meta.json';
$meta = [];
if (file_exists($metaFile)) {
    $decoded = json_decode(file_get_contents($metaFile), true);
    if (is_array($decoded)) $meta = $decoded;
}

if ($printName === null || $printName === '') {
    unset($meta['print_name']);
} else {
    $meta['print_name'] = $printName;
}

if (empty($meta)) {
    if (file_exists($metaFile)) @unlink($metaFile);
} else {
    $res = file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($res === false) jsonResponse(false, [], 'Failed to write meta file');
}

jsonResponse(true, ['print_name' => $meta['print_name'] ?? null]);
