<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['POST']);

$data = request_data();
$name = clean_string($data['name'] ?? 'Utilisateur');
$phone = required_string($data, 'phone', 'Le téléphone');
$plainPassword = required_string($data, 'password', 'Le mot de passe');

$name = $name !== '' ? text_limit($name, 100) : 'Utilisateur';
validate_phone($phone);
validate_password($plainPassword);

try {
    $statement = $pdo->prepare(
        'INSERT INTO users (name, phone, password) VALUES (:name, :phone, :password)'
    );
    $statement->execute([
        ':name' => $name,
        ':phone' => $phone,
        ':password' => password_hash($plainPassword, PASSWORD_DEFAULT),
    ]);

    respond([
        'success' => true,
        'message' => 'Compte créé avec succès.',
        'user' => [
            'id' => (int) $pdo->lastInsertId(),
            'name' => $name,
            'phone' => $phone,
        ],
    ], 201);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000') {
        respond([
            'success' => false,
            'message' => 'Ce numéro de téléphone est déjà utilisé.',
        ], 409);
    }

    respond([
        'success' => false,
        'message' => 'Inscription impossible pour le moment.',
    ], 500);
}
