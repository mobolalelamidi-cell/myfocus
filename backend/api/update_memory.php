<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['POST', 'PATCH']);

$data = request_data();
$userId = required_int($data, 'user_id', "L'utilisateur");
$memoryId = required_int($data, 'memory_id', 'Le souvenir');
$updates = [];
$parameters = [
    ':id' => $memoryId,
    ':user_id' => $userId,
];

if (array_key_exists('content', $data)) {
    $content = required_string($data, 'content', 'Le souvenir');

    if (text_length($content) > 5000) {
        respond([
            'success' => false,
            'message' => 'Le souvenir ne doit pas dépasser 5000 caractères.',
        ], 422);
    }

    $updates[] = 'content = :content';
    $parameters[':content'] = $content;
}

if (array_key_exists('mood', $data)) {
    $mood = clean_string($data['mood']);
    $updates[] = 'mood = :mood';
    $parameters[':mood'] = text_limit($mood !== '' ? $mood : '🙂', 16);
}

if (array_key_exists('date', $data)) {
    $updates[] = 'date = :date';
    $parameters[':date'] = normalize_date($data['date']);
}

if ($updates === []) {
    respond([
        'success' => false,
        'message' => 'Aucune modification reçue.',
    ], 422);
}

$query = 'UPDATE memories SET ' . implode(', ', $updates) . ' WHERE id = :id AND user_id = :user_id';
$statement = $pdo->prepare($query);
$statement->execute($parameters);

if ($statement->rowCount() === 0) {
    respond([
        'success' => false,
        'message' => 'Souvenir introuvable ou inchangé.',
    ], 404);
}

respond([
    'success' => true,
    'message' => 'Souvenir mis à jour.',
]);
