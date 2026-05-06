<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['POST', 'DELETE']);

$data = request_data();
$userId = required_int($data, 'user_id', "L'utilisateur");
$memoryId = required_int($data, 'memory_id', 'Le souvenir');

$statement = $pdo->prepare('DELETE FROM memories WHERE id = :id AND user_id = :user_id');
$statement->execute([
    ':id' => $memoryId,
    ':user_id' => $userId,
]);

if ($statement->rowCount() === 0) {
    respond([
        'success' => false,
        'message' => 'Souvenir introuvable.',
    ], 404);
}

respond([
    'success' => true,
    'message' => 'Souvenir supprimé.',
]);
