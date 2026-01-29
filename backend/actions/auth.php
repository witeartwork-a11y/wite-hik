<?php
// === АВТОРИЗАЦИЯ ===

$input = json_decode(file_get_contents('php://input'), true);
if (($input['password'] ?? '') === $PASSWORD) {
    jsonResponse(true);
} else {
    jsonResponse(false, ['error' => 'invalid_password']);
}
