<?php
// === ОБРАБОТКА ИЗОБРАЖЕНИЙ ===

function getThumbnailName($filename, $prefix = '') {
    $info = pathinfo($filename);
    $filename_clean = transliterate($info['filename']); // Используем transliterate из utils.php
    $filename_clean = preg_replace('/[^a-zA-Z0-9\-_]/', '', $filename_clean);
    $filename_clean = preg_replace('/[\-_]+/', '_', $filename_clean);
    if (!$filename_clean) $filename_clean = 'file_' . time();
    
    $prefix_clean = '';
    if ($prefix) {
        $prefix_clean = preg_replace('/[^a-zA-Z0-9\-_]/', '', $prefix);
        $prefix_clean = preg_replace('/[\-_]+/', '_', $prefix_clean);
        if ($prefix_clean) $prefix_clean .= '_';
    }

    return 'thumb_' . $prefix_clean . $filename_clean . '.jpg';
}

function createThumbnail($src, $dest, $targetWidth = 300) {
    if (!extension_loaded('gd')) return false;
    $info = @getimagesize($src);
    if (!$info) return false;
    
    list($width, $height, $type) = $info;

    $ratio = $height / $width;
    $targetHeight = $targetWidth * $ratio;

    $newImg = imagecreatetruecolor($targetWidth, $targetHeight);
    
    $white = imagecolorallocate($newImg, 255, 255, 255);
    imagefilledrectangle($newImg, 0, 0, $targetWidth, $targetHeight, $white);

    $source = null;
    switch ($type) {
        case IMAGETYPE_JPEG: $source = imagecreatefromjpeg($src); break;
        case IMAGETYPE_PNG:  $source = imagecreatefrompng($src); break;
        case IMAGETYPE_WEBP: $source = imagecreatefromwebp($src); break;
    }
    if (!$source) {
        imagedestroy($newImg);
        return false;
    }

    imagecopyresampled($newImg, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
    
    $tmpDest = $dest . '.tmp';
    $saved = imagejpeg($newImg, $tmpDest, 80);
    
    imagedestroy($newImg);
    imagedestroy($source);

    if ($saved && file_exists($tmpDest)) {
        rename($tmpDest, $dest);
        return true;
    }
    if (file_exists($tmpDest)) {
        @unlink($tmpDest);
    }
    return false;
}

function compressProductImage($src, $dest, $quality = 80) {
    if (!extension_loaded('gd')) return false;
    $info = @getimagesize($src);
    if (!$info) return false;
    
    list($width, $height, $type) = $info;
    
    $source = null;
    switch ($type) {
        case IMAGETYPE_JPEG: $source = imagecreatefromjpeg($src); break;
        case IMAGETYPE_PNG:  $source = imagecreatefrompng($src); break;
        case IMAGETYPE_WEBP: $source = imagecreatefromwebp($src); break;
    }
    if (!$source) return false;
    
    $tmpDest = $dest . '.tmp';
    $saved = imagejpeg($source, $tmpDest, $quality);
    imagedestroy($source);
    
    if ($saved && file_exists($tmpDest)) {
        rename($tmpDest, $dest);
        return true;
    }
    if (file_exists($tmpDest)) {
        @unlink($tmpDest);
    }
    return false;
}
