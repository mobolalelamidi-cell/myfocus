<?php
declare(strict_types=1);

$host = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'myfocus';
$username = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASSWORD') ?: (getenv('DB_PASS') ?: '');
$port = getenv('DB_PORT') ?: '';

$dsn = "mysql:host={$host};" . ($port !== '' ? "port={$port};" : '') . "dbname={$dbName};charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $exception) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Connexion à la base de données impossible.',
    ]);
    exit;
}
