<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function request_data(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $json = json_decode($raw, true);

    if (is_array($json)) {
        return array_merge($_GET, $_POST, $json);
    }

    return array_merge($_GET, $_POST);
}

function require_method(array $methods): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
        respond([
            'success' => false,
            'message' => 'Méthode HTTP non autorisée.',
        ], 405);
    }
}

function clean_string(mixed $value): string
{
    return trim((string) $value);
}

function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
}

function text_limit(string $value, int $limit): string
{
    return function_exists('mb_substr') ? mb_substr($value, 0, $limit) : substr($value, 0, $limit);
}

function required_string(array $data, string $key, string $label): string
{
    $value = clean_string($data[$key] ?? '');

    if ($value === '') {
        respond([
            'success' => false,
            'message' => "{$label} est obligatoire.",
        ], 422);
    }

    return $value;
}

function required_int(array $data, string $key, string $label): int
{
    $value = filter_var($data[$key] ?? null, FILTER_VALIDATE_INT);

    if ($value === false || $value <= 0) {
        respond([
            'success' => false,
            'message' => "{$label} est invalide.",
        ], 422);
    }

    return (int) $value;
}

function normalize_date(?string $date = null): string
{
    $candidate = clean_string($date ?? '');

    if ($candidate === '') {
        return date('Y-m-d');
    }

    $parsed = DateTime::createFromFormat('Y-m-d', $candidate);

    if (!$parsed || $parsed->format('Y-m-d') !== $candidate) {
        respond([
            'success' => false,
            'message' => 'La date doit être au format YYYY-MM-DD.',
        ], 422);
    }

    return $candidate;
}

function validate_phone(string $phone): void
{
    if (!preg_match('/^[0-9+\s().-]{6,25}$/', $phone)) {
        respond([
            'success' => false,
            'message' => 'Numéro de téléphone invalide.',
        ], 422);
    }
}

function validate_password(string $password): void
{
    if (strlen($password) < 6) {
        respond([
            'success' => false,
            'message' => 'Le mot de passe doit contenir au moins 6 caractères.',
        ], 422);
    }
}
