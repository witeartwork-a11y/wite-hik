<?php
// === ПОМОЩНИКИ ===

function jsonResponse($success, $data = [], $msg = '') {
    echo json_encode(array_merge(['success' => $success, 'message' => $msg], $data));
    exit;
}

function ensureDir($path) {
    if (!file_exists($path)) mkdir($path, 0775, true);
}

// Рекурсивное удаление папки
function rrmdir($dir) {
    if (!is_dir($dir)) return;
    $objects = array_diff(scandir($dir), ['.', '..']);
    foreach ($objects as $object) {
        $path = $dir . '/' . $object;
        if (is_dir($path)) {
            rrmdir($path);
        } else {
            @unlink($path);
        }
    }
    @rmdir($dir);
}

// Транслитерация кириллицы в латиницу (полная таблица)
function transliterate($str) {
    $cyrillicToLatin = [
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 
        'е' => 'e', 'ё' => 'yo', 'ж' => 'zh', 'з' => 'z', 'и' => 'i',
        'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n',
        'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't',
        'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch',
        'ш' => 'sh', 'щ' => 'sch', 'ъ' => '', 'ы' => 'y', 'ь' => '',
        'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
        'А' => 'A', 'Б' => 'B', 'В' => 'V', 'Г' => 'G', 'Д' => 'D',
        'Е' => 'E', 'Ё' => 'Yo', 'Ж' => 'Zh', 'З' => 'Z', 'И' => 'I',
        'Й' => 'Y', 'К' => 'K', 'Л' => 'L', 'М' => 'M', 'Н' => 'N',
        'О' => 'O', 'П' => 'P', 'Р' => 'R', 'С' => 'S', 'Т' => 'T',
        'У' => 'U', 'Ф' => 'F', 'Х' => 'H', 'Ц' => 'Ts', 'Ч' => 'Ch',
        'Ш' => 'Sh', 'Щ' => 'Sch', 'Ъ' => '', 'Ы' => 'Y', 'Ь' => '',
        'Э' => 'E', 'Ю' => 'Yu', 'Я' => 'Ya'
    ];
    
    $result = '';
    for ($i = 0; $i < mb_strlen($str); $i++) {
        $char = mb_substr($str, $i, 1);
        $result .= $cyrillicToLatin[$char] ?? $char;
    }
    return $result;
}

function sanitize($name) {
    $info = pathinfo($name);
    $ext = $info['extension'] ?? '';
    $filename = $info['filename'];
    
    $filename = transliterate($filename);
    
    // Удаляем все символы кроме латиницы, цифр, дефиса и подчеркивания
    $clean = preg_replace('/[^a-zA-Z0-9\-_]/', '', $filename);
    
    // Заменяем множественные дефисы/подчеркивания
    $clean = preg_replace('/[\-_]+/', '_', $clean);
    
    if (!$clean) $clean = 'file_' . time();
    return $clean . '.' . strtolower($ext);
}

function sanitizeArticle($article) {
    $clean = preg_replace('/[^a-zA-Z0-9_\-.]/', '', $article);
    $clean = rtrim($clean, '.');
    if (!$clean) $clean = 'article_' . time();
    return $clean;
}
