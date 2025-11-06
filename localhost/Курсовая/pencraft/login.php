<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    sendResponse(['error' => 'Метод не разрешен'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['email']) || !isset($input['password'])) {
    sendResponse(['error' => 'Email и пароль обязательны'], 400);
}

$email = trim($input['email']);
$password = $input['password'];

$database = new Database();
$pdo = $database->getConnection();

try {
    // Поиск пользователя
    $stmt = $pdo->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password'])) {
        sendResponse(['error' => 'Неверный email или пароль'], 400);
    }

    // Создание JWT токена
    $tokenData = [
        'user_id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'expires' => time() + (24 * 60 * 60) // 24 часа
    ];
    $token = base64_encode(json_encode($tokenData));

    sendResponse([
        'message' => 'Вход выполнен успешно',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email']
        ]
    ]);

} catch (PDOException $e) {
    sendResponse(['error' => 'Ошибка сервера: ' . $e->getMessage()], 500);
}
?>