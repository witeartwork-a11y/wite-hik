<?php
// === PRESETS ACTIONS ===

// Load Presets
if ($action === 'load_presets') {
    if (file_exists($PRESETS_FILE)) {
        $content = file_get_contents($PRESETS_FILE);
        $data = json_decode($content, true);
        if ($data === null) $data = new stdClass();
        // Если массив пустой, возвращаем объект, чтобы в JS это было {}
        if (is_array($data) && empty($data)) $data = new stdClass();
        
        jsonResponse(true, ['presets' => $data]);
    } else {
        jsonResponse(true, ['presets' => new stdClass()]);
    }
}

// Save Preset (Add/Edit)
if ($action === 'save_presets') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');

    $name = $input['name'] ?? null;
    $data = $input['data'] ?? null;

    if (!$name || $data === null) {
        jsonResponse(false, [], 'Missing name or data');
    }

    $presets = [];
    if (file_exists($PRESETS_FILE)) {
        $presets = json_decode(file_get_contents($PRESETS_FILE), true) ?: [];
    }

    $presets[$name] = $data;

    $json = json_encode($presets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($PRESETS_FILE, $json) !== false) {
        jsonResponse(true);
    } else {
        jsonResponse(false, [], 'Failed to save preset');
    }
}

// Delete Preset
if ($action === 'delete_preset') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');

    $name = $input['name'] ?? null;

    if (!$name) {
        jsonResponse(false, [], 'Missing name');
    }

    $presets = [];
    if (file_exists($PRESETS_FILE)) {
        $presets = json_decode(file_get_contents($PRESETS_FILE), true) ?: [];
    }

    if (isset($presets[$name])) {
        unset($presets[$name]);
        $json = json_encode($presets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        // Если массив стал пустым, записываем {} (хотя encode [] -> [] это не критично для PHP, но для JS лучше {})
        if (empty($presets)) $json = '{}';

        if (file_put_contents($PRESETS_FILE, $json) !== false) {
            jsonResponse(true);
        } else {
            jsonResponse(false, [], 'Failed to save file after delete');
        }
    } else {
        jsonResponse(true); // Already gone
    }
}
