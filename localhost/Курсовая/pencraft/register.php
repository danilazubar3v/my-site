<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    sendResponse(['error' => 'Метод не разрешен'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['name']) || !isset($input['email']) || !isset($input['password'])) {
    sendResponse(['error' => 'Все поля обязательны для заполнения'], 400);
}

$name = trim($input['name']);
$email = trim($input['email']);
$password = $input['password'];

if (strlen($password) < 6) {
    sendResponse(['error' => 'Пароль должен содержать минимум 6 символов'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(['error' => 'Неверный формат email'], 400);
}

$database = new Database();
$pdo = $database->getConnection();

try {
    // Проверка существующего пользователя
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        sendResponse(['error' => 'Пользователь с таким email уже существует'], 400);
    }

    // Хеширование пароля
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // Создание пользователя
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    $stmt->execute([$name, $email, $hashedPassword]);

    $userId = $pdo->lastInsertId();

    // Создание JWT токена (упрощенный вариант)
    $tokenData = [
        'user_id' => $userId,
        'name' => $name,
        'email' => $email,
        'expires' => time() + (24 * 60 * 60) // 24 часа
    ];
    $token = base64_encode(json_encode($tokenData));

    sendResponse([
        'message' => 'Пользователь успешно зарегистрирован',
        'token' => $token,
        'user' => [
            'id' => $userId,
            'name' => $name,
            'email' => $email
        ]
    ], 201);

} catch (PDOException $e) {
    sendResponse(['error' => 'Ошибка сервера: ' . $e->getMessage()], 500);
}
?>