<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['POST', 'DELETE']);

$data = request_data();
$userId = required_int($data, 'user_id', "L'utilisateur");
$taskId = required_int($data, 'task_id', 'La tâche');

$statement = $pdo->prepare('DELETE FROM tasks WHERE id = :id AND user_id = :user_id');
$statement->execute([
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
    'message' => 'Tâche supprimée.',
]);
