<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['POST']);

$data = request_data();
$userId = required_int($data, 'user_id', "L'utilisateur");
$title = required_string($data, 'title', 'Le titre');
$date = normalize_date($data['date'] ?? null);

if (text_length($title) > 255) {
    respond([
        'success' => false,
        'message' => 'Le titre ne doit pas dépasser 255 caractères.',
    ], 422);
}

$statement = $pdo->prepare(
    'INSERT INTO tasks (user_id, title, date) VALUES (:user_id, :title, :date)'
);
$statement->execute([
    ':user_id' => $userId,
    ':title' => $title,
    ':date' => $date,
]);

respond([
    'success' => true,
    'message' => 'Tâche ajoutée.',
    'task' => [
        'id' => (int) $pdo->lastInsertId(),
        'user_id' => $userId,
        'title' => $title,
        'is_completed' => 0,
        'date' => $date,
    ],
], 201);
