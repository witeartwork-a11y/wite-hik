<?php
require_once __DIR__ . '/backend/init.php';

// Short URL Redirect
require_once __DIR__ . '/backend/short_urls_handler.php';

$action = $_GET['action'] ?? '';

$actions = [
    'login' => 'auth.php',
    'load_config' => 'config.php',
    'save_config' => 'config.php',
    'load_prints_config' => 'config.php',
    'save_prints_config' => 'config.php',
    'generate_sku' => 'config.php',
    'rename' => 'file_ops.php',
    'delete' => 'file_ops.php',
    'delete_category' => 'file_ops.php',
    'delete_article' => 'file_ops.php',
    'list' => 'list.php',
    'upload' => 'upload.php'
];

if (isset($actions[$action])) {
    require __DIR__ . '/backend/actions/' . $actions[$action];
} else {
    jsonResponse(false, [], 'Unknown action');
}
?>
