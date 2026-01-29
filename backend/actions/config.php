<?php
// === КОНФИГУРАЦИЯ И SKU ===

if ($action === 'load_config') {
    if (file_exists($CONFIG_FILE)) {
        jsonResponse(true, ['config' => json_decode(file_get_contents($CONFIG_FILE), true)]);
    } else {
        jsonResponse(true, ['config' => []]);
    }
}

if ($action === 'save_config') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    $products = $input['products'] ?? [];
    
    error_log('📝 save_config: ' . count($products) . ' products');
    
    $result = file_put_contents($CONFIG_FILE, json_encode($products, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    if ($result === false) {
        jsonResponse(false, [], 'Failed to write config file. Permissions? ' . $CONFIG_FILE);
    }
    jsonResponse(true, ['saved' => count($products)]);
}

if ($action === 'load_prints_config') {
    $printName = $_GET['print_name'] ?? null;

    if ($printName) {
        $hash = md5($printName);
        $file = $PRINTS_CONFIGS_DIR . '/' . $hash . '.json';
        
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            jsonResponse(true, ['config' => $data]);
        } 
        
        // Fallback to big file
        if (file_exists($PRINTS_CONFIG_FILE)) {
            $allConfigs = json_decode(file_get_contents($PRINTS_CONFIG_FILE), true);
            if (isset($allConfigs[$printName])) {
                jsonResponse(true, ['config' => $allConfigs[$printName]]);
            }
        }
        
        jsonResponse(true, ['config' => null]);
    } else {
        if (file_exists($PRINTS_CONFIG_FILE)) {
            jsonResponse(true, ['config' => json_decode(file_get_contents($PRINTS_CONFIG_FILE), true)]);
        } else {
            jsonResponse(true, ['config' => []]);
        }
    }
}

if ($action === 'save_prints_config') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $PASSWORD) jsonResponse(false, [], 'Auth error');
    
    if (isset($input['print_name']) && isset($input['print_data'])) {
        $hash = md5($input['print_name']);
        $file = $PRINTS_CONFIGS_DIR . '/' . $hash . '.json';
        
        $result = file_put_contents($file, json_encode($input['print_data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        if ($result === false) {
             jsonResponse(false, [], 'Failed to write config file. Permissions? Path: ' . $file);
        }
        jsonResponse(true);
    } else {
        jsonResponse(false, [], 'Bulk save not supported in optimized mode');
    }
}

if ($action === 'generate_sku') {
    // Формат: DDMMYYX
    $today = date('dmy'); 
    
    $maxSuffix = 0;
    
    if (is_dir($CLOUD_DIR)) {
        $articles = scandir($CLOUD_DIR);
        foreach ($articles as $article) {
            if ($article === '.' || $article === '..') continue;
            if (!is_dir($CLOUD_DIR . '/' . $article)) continue;
            
            if (strpos($article, $today) === 0) {
                $suffixStr = substr($article, strlen($today));
                
                if (is_numeric($suffixStr)) {
                    $suffix = intval($suffixStr);
                    if ($suffix > $maxSuffix) {
                        $maxSuffix = $suffix;
                    }
                }
            }
        }
    }
    
    $nextSuffix = $maxSuffix + 1;
    $newSku = $today . $nextSuffix;
    
    jsonResponse(true, ['sku' => $newSku]);
}
