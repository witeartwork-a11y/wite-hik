<?php
// === ПАПКИ ===

if ($action === 'load_folders') {
    $galleryType = $_GET['gallery_type'] ?? null;
    $title = $_GET['title'] ?? null;
    
    if (!$galleryType || !$title) {
        jsonResponse(false, [], 'Missing parameters');
    }
    
    $folders = loadFolders();
    $key = $galleryType . '_' . $title;
    
    if (isset($folders[$key])) {
        jsonResponse(true, ['folders' => $folders[$key]]);
    } else {
        jsonResponse(true, ['folders' => []]);
    }
}

if ($action === 'save_folders') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    $galleryType = $input['gallery_type'] ?? null;
    $title = $input['title'] ?? null;
    $foldersData = $input['folders'] ?? [];
    
    if (!$galleryType || !$title) {
        jsonResponse(false, [], 'Missing parameters');
    }
    
    $folders = loadFolders();
    $key = $galleryType . '_' . $title;
    $folders[$key] = $foldersData;
    
    saveFolders($folders);
    jsonResponse(true, ['saved' => true]);
}

function loadFolders() {
    global $DATA_DIR;
    $file = $DATA_DIR . '/folders.json';
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function saveFolders($data) {
    global $DATA_DIR;
    $file = $DATA_DIR . '/folders.json';
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
