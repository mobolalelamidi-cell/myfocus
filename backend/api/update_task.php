<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['POST', 'PATCH']);

$data = request_data();
$userId = required_int($data, 'user_id', "L'utilisateur");
$taskId = required_int($data, 'task_id', 'La tâche');
$updates = [];
$parameters = [
    ':id' => $taskId,
    ':user_id' => $userId,
];

if (array_key_exists('title', $data)) {
    $title = required_string($data, 'title', 'Le titre');

    if (text_length($title) > 255) {
        respond([
            'success' => false,
            'message' => 'Le titre ne doit pas dépasser 255 caractères.',
        ], 422);
    }

    $updates[] = 'title = :title';
    $parameters[':title'] = $title;
}

if (array_key_exists('date', $data)) {
    $updates[] = 'date = :date';
    $parameters[':date'] = normalize_date($data['date']);
}

if (array_key_exists('is_completed', $data)) {
    $isCompleted = filter_var($data['is_completed'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

    if ($isCompleted === null && !in_array((string) $data['is_completed'], ['0', '1'], true)) {
        respond([
            'success' => false,
            'message' => 'Statut de tâche invalide.',
        ], 422);
    }

    $updates[] = 'is_completed = :is_completed';
    $parameters[':is_completed'] = (int) $isCompleted;
}

if ($updates === []) {
    respond([
        'success' => false,
        'message' => 'Aucune modification reçue.',
    ], 422);
}

$query = 'UPDATE tasks SET ' . implode(', ', $updates) . ' WHERE id = :id AND user_id = :user_id';
$statement = $pdo->prepare($query);
$statement->execute($parameters);

if ($statement->rowCount() === 0) {
    respond([
        'success' => false,
        'message' => 'Tâche introuvable ou inchangée.',
    ], 404);
}

respond([
    'success' => true,
    'message' => 'Tâche mise à jour.',
]);
