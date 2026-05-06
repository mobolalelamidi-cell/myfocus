<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['POST', 'PATCH']);

$data = request_data();
$userId = required_int($data, 'user_id', "L'utilisateur");
$taskId = required_int($data, 'task_id', 'La tâche');

if (array_key_exists('is_completed', $data)) {
    $isCompleted = filter_var($data['is_completed'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

    if ($isCompleted === null && !in_array((string) $data['is_completed'], ['0', '1'], true)) {
        respond([
            'success' => false,
            'message' => 'Statut de tâche invalide.',
        ], 422);
    }

    $nextStatus = (int) $isCompleted;
} else {
    $current = $pdo->prepare('SELECT is_completed FROM tasks WHERE id = :id AND user_id = :user_id LIMIT 1');
    $current->execute([':id' => $taskId, ':user_id' => $userId]);
    $task = $current->fetch();

    if (!$task) {
        respond([
            'success' => false,
            'message' => 'Tâche introuvable.',
        ], 404);
    }

    $nextStatus = (int) !$task['is_completed'];
}

$statement = $pdo->prepare(
    'UPDATE tasks SET is_completed = :is_completed WHERE id = :id AND user_id = :user_id'
);
$statement->execute([
    ':is_completed' => $nextStatus,
    ':id' => $taskId,
    ':user_id' => $userId,
]);

if ($statement->rowCount() === 0) {
    respond([
        'success' => false,
        'message' => 'Tâche introuvable.',
    ], 404);
}

respond([
    'success' => true,
    'message' => 'Statut mis à jour.',
    'task_id' => $taskId,
    'is_completed' => $nextStatus,
]);
