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

if (isset($data['completed']) && $data['completed'] !== '') {
    $completed = filter_var($data['completed'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

    if ($completed === null && !in_array((string) $data['completed'], ['0', '1'], true)) {
        respond([
            'success' => false,
            'message' => 'Filtre de statut invalide.',
        ], 422);
    }

    $conditions[] = 'is_completed = :completed';
    $parameters[':completed'] = (int) $completed;
}

$query = 'SELECT id, user_id, title, is_completed, date, created_at, updated_at
          FROM tasks
          WHERE ' . implode(' AND ', $conditions) . '
          ORDER BY date ASC, is_completed ASC, created_at DESC';

$statement = $pdo->prepare($query);
$statement->execute($parameters);
$tasks = $statement->fetchAll();

$grouped = [];
$completedCount = 0;

foreach ($tasks as &$task) {
    $task['id'] = (int) $task['id'];
    $task['user_id'] = (int) $task['user_id'];
    $task['is_completed'] = (int) $task['is_completed'];
    $completedCount += $task['is_completed'] === 1 ? 1 : 0;
    $grouped[$task['date']][] = $task;
}
unset($task);

$total = count($tasks);

respond([
    'success' => true,
    'tasks' => $tasks,
    'grouped' => (object) $grouped,
    'stats' => [
        'total' => $total,
        'completed' => $completedCount,
        'pending' => $total - $completedCount,
        'progress' => $total > 0 ? (int) round(($completedCount / $total) * 100) : 0,
    ],
]);
