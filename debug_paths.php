<?php
require_once __DIR__ . '/backend/init.php';

echo "BASE_DIR: " . $BASE_DIR . "\n";
echo "DATA_DIR: " . $DATA_DIR . "\n";
echo "PRINTS_CONFIG_FILE: " . $PRINTS_CONFIG_FILE . "\n";
echo "File Exists?: " . (file_exists($PRINTS_CONFIG_FILE) ? 'YES' : 'NO') . "\n";

$content = file_get_contents($PRINTS_CONFIG_FILE);
echo "Content Length: " . strlen($content) . "\n";
$json = json_decode($content, true);
echo "JSON Decode: " . ((json_last_error() === JSON_ERROR_NONE) ? 'OK' : 'ERROR: ' . json_last_error_msg()) . "\n";
echo "Print keys count: " . (is_array($json) ? count($json) : 'Not array') . "\n";
