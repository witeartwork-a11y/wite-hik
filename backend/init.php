<?php
// === ИНИЦИАЛИЗАЦИЯ И КОНФИГУРАЦИЯ ===

// Настройки PHP
@ini_set('upload_max_filesize', '256M');
@ini_set('post_max_size', '256M');
@ini_set('memory_limit', '512M');

// Заголовки
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Content-Type: application/json; charset=UTF-8");

// Пароль и секреты
if (file_exists(__DIR__ . '/../secrets.php')) {
    require_once __DIR__ . '/../secrets.php';
} else {
    $PASSWORD = getenv('API_PASSWORD') ?: ''; 
}

// Пути и константы
$BASE_DIR = dirname(__DIR__); // Родительская папка от backend/
$UPLOADS_DIR = $BASE_DIR . '/uploads';
$CLOUD_DIR = $BASE_DIR . '/uploads/cloud';
$ASSETS_DIR = $BASE_DIR . '/uploads/assets';
$DATA_DIR = $BASE_DIR . '/data';
$THUMBS_DIR = $BASE_DIR . '/data/thumbnails';
$SHORT_URLS_FILE = $DATA_DIR . '/short_urls.json';
$PROTECTED_FILES = ['thumbnails'];

$CONFIG_FILE = $DATA_DIR . '/products_config.json';
$PRINTS_CONFIG_FILE = $DATA_DIR . '/prints_config.json';
$PRINTS_CONFIGS_DIR = $DATA_DIR . '/prints_configs';

// Подключение модулей
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/images.php';
require_once __DIR__ . '/short_urls.php';

// Создание необходимых директорий
ensureDir($DATA_DIR);
ensureDir($THUMBS_DIR);
ensureDir($UPLOADS_DIR);
ensureDir($CLOUD_DIR);
ensureDir($ASSETS_DIR);
ensureDir($PRINTS_CONFIGS_DIR);
