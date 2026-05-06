<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['POST']);

$data = request_data();
$userId = required_int($data, 'user_id', "L'utilisateur");
$content = required_string($data, 'content', 'Le souvenir');
$mood = clean_string($data['mood'] ?? '🙂');
$date = normalize_date($data['date'] ?? null);

if (text_length($content) > 5000) {
    respond([
        'success' => false,
        'message' => 'Le souvenir ne doit pas dépasser 5000 caractères.',
    ], 422);
}

if (text_length($mood) > 16) {
    $mood = text_limit($mood, 16);
}

$statement = $pdo->prepare(
    'INSERT INTO memories (user_id, content, mood, date) VALUES (:user_id, :content, :mood, :date)'
);
$statement->execute([
    ':user_id' => $userId,
    ':content' => $content,
    ':mood' => $mood,
    ':date' => $date,
]);

respond([
    'success' => true,
    'message' => 'Moment mémorable ajouté.',
    'memory' => [
        'id' => (int) $pdo->lastInsertId(),
        'user_id' => $userId,
        'content' => $content,
        'mood' => $mood,
        'date' => $date,
    ],
], 201);
