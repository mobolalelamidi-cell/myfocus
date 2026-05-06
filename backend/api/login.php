<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['POST']);

$data = request_data();
$phone = required_string($data, 'phone', 'Le téléphone');
$plainPassword = required_string($data, 'password', 'Le mot de passe');

validate_phone($phone);

$statement = $pdo->prepare('SELECT id, name, phone, password FROM users WHERE phone = :phone LIMIT 1');
$statement->execute([':phone' => $phone]);
$user = $statement->fetch();

if (!$user || !password_verify($plainPassword, $user['password'])) {
    respond([
        'success' => false,
        'message' => 'Téléphone ou mot de passe incorrect.',
    ], 401);
}

respond([
    'success' => true,
    'message' => 'Connexion réussie.',
    'user' => [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'phone' => $user['phone'],
    ],
]);
