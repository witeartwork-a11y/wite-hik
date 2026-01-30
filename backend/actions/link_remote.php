<?php
// === LINK REMOTE FILE ===

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, [], 'Method not allowed');
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['url']) || !isset($input['name'])) {
    jsonResponse(false, [], 'Missing URL or Name');
}

$linkedFile = __DIR__ . '/../../data/linked_files.json';
$linkedData = [];

if (file_exists($linkedFile)) {
    $content = file_get_contents($linkedFile);
    $linkedData = json_decode($content, true) ?? [];
}

// Check for duplicates by URL
foreach ($linkedData as $item) {
    if ($item['url'] === $input['url']) {
        jsonResponse(true, ['message' => 'File already linked']);
        exit;
    }
}

$newItem = [
    'id' => uniqid('linked_'),
    'name' => $input['name'],
    'url' => $input['url'],
    'thumb' => $input['thumb'] ?? $input['url'], // Use thumbnail if provided, else main image
    'mtime' => time(),
    'size' => 0,
    'type' => 'linked',
    'prompt' => $input['prompt'] ?? '',
    'model' => $input['model'] ?? ''
];

$linkedData[] = $newItem;

if (file_put_contents($linkedFile, json_encode($linkedData, JSON_PRETTY_PRINT))) {
    jsonResponse(true, ['message' => 'File linked successfully', 'file' => $newItem]);
} else {
    jsonResponse(false, [], 'Failed to save link');
}
