<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

require_method(['GET', 'POST']);

$data = request_data();
$userId = required_int($data, 'user_id', "L'utilisateur");
$conditions = ['user_id = :user_id'];
$parameters = [':user_id' => $userId];

if (!empty($data['month'])) {
    $month = clean_string($data['month']);

    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        respond([
            'success' => false,
            'message' => 'Le mois doit être au format YYYY-MM.',
        ], 422);
    }

    $firstDay = DateTime::createFromFormat('Y-m-d', "{$month}-01");
    if (!$firstDay || $firstDay->format('Y-m') !== $month) {
        respond([
            'success' => false,
            'message' => 'Mois invalide.',
        ], 422);
    }

    $lastDay = (clone $firstDay)->modify('last day of this month');
    $conditions[] = 'date BETWEEN :start_date AND :end_date';
    $parameters[':start_date'] = $firstDay->format('Y-m-d');
    $parameters[':end_date'] = $lastDay->format('Y-m-d');
} else {
    $date = normalize_date($data['date'] ?? null);
    $conditions[] = 'date = :date';
    $parameters[':date'] = $date;
}

$query = 'SELECT id, user_id, content, mood, date, created_at, updated_at
          FROM memories
          WHERE ' . implode(' AND ', $conditions) . '
          ORDER BY date DESC, created_at DESC';

$statement = $pdo->prepare($query);
$statement->execute($parameters);
$memories = $statement->fetchAll();

$grouped = [];

foreach ($memories as &$memory) {
    $memory['id'] = (int) $memory['id'];
    $memory['user_id'] = (int) $memory['user_id'];
    $grouped[$memory['date']][] = $memory;
}
unset($memory);

respond([
    'success' => true,
    'memories' => $memories,
    'grouped' => (object) $grouped,
    'stats' => [
        'total' => count($memories),
    ],
]);
