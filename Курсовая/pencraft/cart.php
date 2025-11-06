<?php
require_once 'config.php';

$database = new Database();
$pdo = $database->getConnection();

// Проверяем авторизацию для всех операций с корзиной
$user = verifyToken($pdo);
$userId = $user['id'];

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        getCart($pdo, $userId);
        break;
    case 'POST':
        addToCart($pdo, $userId);
        break;
    case 'PUT':
        updateCart($pdo, $userId);
        break;
    case 'DELETE':
        removeFromCart($pdo, $userId);
        break;
    default:
        sendResponse(['error' => 'Метод не разрешен'], 405);
}

function getCart($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT c.*, p.name, p.image, p.stock 
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            WHERE c.user_id = ?
        ");
        $stmt->execute([$userId]);
        $cartItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

        sendResponse(['items' => $cartItems]);

    } catch (PDOException $e) {
        sendResponse(['error' => 'Ошибка при получении корзины: ' . $e->getMessage()], 500);
    }
}

function addToCart($pdo, $userId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['productId'])) {
        sendResponse(['error' => 'ID товара обязателен'], 400);
    }

    $productId = intval($input['productId']);
    $quantity = isset($input['quantity']) ? intval($input['quantity']) : 1;

    try {
        // Проверка существования товара
        $stmt = $pdo->prepare("SELECT price, stock FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            sendResponse(['error' => 'Товар не найден'], 404);
        }

        if ($product['stock'] < $quantity) {
            sendResponse(['error' => 'Недостаточно товара на складе'], 400);
        }

        // Проверка, есть ли товар уже в корзине
        $stmt = $pdo->prepare("SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$userId, $productId]);
        $existingItem = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existingItem) {
            // Обновление количества
            $newQuantity = $existingItem['quantity'] + $quantity;
            $stmt = $pdo->prepare("UPDATE cart SET quantity = ?, price = ? WHERE id = ?");
            $stmt->execute([$newQuantity, $product['price'], $existingItem['id']]);
        } else {
            // Добавление нового товара
            $stmt = $pdo->prepare("INSERT INTO cart (user_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $productId, $quantity, $product['price']]);
        }

        sendResponse(['message' => 'Товар добавлен в корзину']);

    } catch (PDOException $e) {
        sendResponse(['error' => 'Ошибка при добавлении в корзину: ' . $e->getMessage()], 500);
    }
}

function updateCart($pdo, $userId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['productId']) || !isset($input['quantity'])) {
        sendResponse(['error' => 'ID товара и количество обязательны'], 400);
    }

    $productId = intval($input['productId']);
    $quantity = intval($input['quantity']);

    if ($quantity < 1) {
        sendResponse(['error' => 'Количество должно быть не менее 1'], 400);
    }

    try {
        // Проверка наличия товара на складе
        $stmt = $pdo->prepare("SELECT stock FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            sendResponse(['error' => 'Товар не найден'], 404);
        }

        if ($product['stock'] < $quantity) {
            sendResponse(['error' => 'Недостаточно товара на складе'], 400);
        }

        // Проверка существования товара в корзине
        $stmt = $pdo->prepare("SELECT id FROM cart WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$userId, $productId]);
        
        if (!$stmt->fetch()) {
            sendResponse(['error' => 'Товар не найден в корзине'], 404);
        }

        // Обновление количества
        $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$quantity, $userId, $productId]);

        sendResponse(['message' => 'Количество обновлено']);

    } catch (PDOException $e) {
        sendResponse(['error' => 'Ошибка при обновлении корзины: ' . $e->getMessage()], 500);
    }
}

function removeFromCart($pdo, $userId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['productId'])) {
        sendResponse(['error' => 'ID товара обязателен'], 400);
    }

    $productId = intval($input['productId']);

    try {
        $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$userId, $productId]);

        if ($stmt->rowCount() === 0) {
            sendResponse(['error' => 'Товар не найден в корзине'], 404);
        }

        sendResponse(['message' => 'Товар удален из корзины']);

    } catch (PDOException $e) {
        sendResponse(['error' => 'Ошибка при удалении из корзины: ' . $e->getMessage()], 500);
    }
}
?>