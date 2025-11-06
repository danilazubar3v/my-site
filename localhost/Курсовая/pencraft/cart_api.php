<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$database = new Database();
$pdo = $database->getConnection();

if (!$pdo) {
    sendResponse(['error' => 'Ошибка подключения к базе данных'], 500);
}

try {
    // Проверяем и создаем таблицу cart если не существует
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cart (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            price DECIMAL(10,2) NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Получение корзины пользователя
            $userId = $_GET['user_id'] ?? null;
            
            if (!$userId) {
                sendResponse(['error' => 'ID пользователя не указан'], 400);
            }
            
            $stmt = $pdo->prepare("
                SELECT c.*, c.name, c.price 
                FROM cart c 
                WHERE c.user_id = ?
            ");
            $stmt->execute([$userId]);
            $cartItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $totalItems = 0;
            $totalPrice = 0;
            
            foreach ($cartItems as $item) {
                $totalItems += $item['quantity'];
                $totalPrice += $item['price'] * $item['quantity'];
            }
            
            sendResponse([
                'success' => true,
                'items' => $cartItems,
                'total_items' => $totalItems,
                'total_price' => $totalPrice
            ]);
            break;
            
        case 'POST':
            // Добавление товара в корзину
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Отладочная информация
            error_log('Cart API POST: ' . json_encode($input));
            
            if (!isset($input['user_id']) || !isset($input['product_id'])) {
                error_log('Cart API: Missing required parameters');
                sendResponse(['error' => 'Необходимые параметры не указаны'], 400);
            }
            
            $userId = $input['user_id'];
            $productId = $input['product_id'];
            $quantity = $input['quantity'] ?? 1;
            
            // Проверяем, есть ли уже такой товар в корзине
            $stmt = $pdo->prepare("SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$userId, $productId]);
            $existingItem = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingItem) {
                // Обновляем количество
                $newQuantity = $existingItem['quantity'] + $quantity;
                $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE id = ?");
                $stmt->execute([$newQuantity, $existingItem['id']]);
            } else {
            // Получаем данные товара
            $stmt = $pdo->prepare("SELECT name, price FROM products WHERE id = ?");
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                sendResponse(['error' => 'Товар не найден'], 404);
            }
            
            // Добавляем новый товар
            $stmt = $pdo->prepare("INSERT INTO cart (user_id, product_id, quantity, price, name) VALUES (?, ?, ?, ?, ?)");
            $result = $stmt->execute([$userId, $productId, $quantity, $product['price'], $product['name']]);
            
            if ($result) {
                error_log('Cart API: Product added successfully');
            } else {
                error_log('Cart API: Failed to add product');
            }
        }
        
        error_log('Cart API: Sending success response');
        sendResponse(['success' => true, 'message' => 'Товар добавлен в корзину']);
            break;
            
        case 'PUT':
            // Обновление количества товара в корзине
            $input = json_decode(file_get_contents('php://input'), true);
            
            error_log('Cart API PUT: ' . json_encode($input));
            
            if (!isset($input['user_id']) || !isset($input['product_id']) || !isset($input['quantity'])) {
                error_log('Cart API PUT: Missing required parameters');
                sendResponse(['error' => 'Необходимые параметры не указаны'], 400);
            }
            
            $userId = $input['user_id'];
            $productId = $input['product_id'];
            $quantity = $input['quantity'];
            
            if ($quantity <= 0) {
                // Если количество <= 0, удаляем товар
                $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
                $stmt->execute([$userId, $productId]);
                error_log('Cart API PUT: Product removed (quantity <= 0)');
            } else {
                // Получаем актуальные данные товара
                $stmt = $pdo->prepare("SELECT name, price FROM products WHERE id = ?");
                $stmt->execute([$productId]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($product) {
                    // Обновляем количество, цену и название
                    $stmt = $pdo->prepare("UPDATE cart SET quantity = ?, price = ?, name = ? WHERE user_id = ? AND product_id = ?");
                    $result = $stmt->execute([$quantity, $product['price'], $product['name'], $userId, $productId]);
                } else {
                    // Если товар не найден, просто обновляем количество
                    $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?");
                    $result = $stmt->execute([$quantity, $userId, $productId]);
                }
                
                if ($result) {
                    error_log('Cart API PUT: Quantity updated successfully');
                } else {
                    error_log('Cart API PUT: Failed to update quantity');
                }
            }
            
            error_log('Cart API PUT: Sending success response');
            sendResponse(['success' => true, 'message' => 'Количество обновлено']);
            break;
            
        case 'DELETE':
            // Удаление товара из корзины
            $input = json_decode(file_get_contents('php://input'), true);
            
            error_log('Cart API DELETE: ' . json_encode($input));
            
            if (!isset($input['user_id']) || !isset($input['product_id'])) {
                error_log('Cart API DELETE: Missing required parameters');
                sendResponse(['error' => 'Необходимые параметры не указаны'], 400);
            }
            
            $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
            $result = $stmt->execute([$input['user_id'], $input['product_id']]);
            
            if ($result) {
                error_log('Cart API DELETE: Product removed successfully');
            } else {
                error_log('Cart API DELETE: Failed to remove product');
            }
            
            error_log('Cart API DELETE: Sending success response');
            sendResponse(['success' => true, 'message' => 'Товар удален из корзины']);
            break;
            
        case 'CLEAR':
            // Очистка всей корзины пользователя
            $input = json_decode(file_get_contents('php://input'), true);
            
            error_log('Cart API CLEAR: ' . json_encode($input));
            
            if (!isset($input['user_id'])) {
                error_log('Cart API CLEAR: Missing user_id parameter');
                sendResponse(['error' => 'ID пользователя не указан'], 400);
            }
            
            $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ?");
            $result = $stmt->execute([$input['user_id']]);
            
            if ($result) {
                error_log('Cart API CLEAR: Cart cleared successfully');
            } else {
                error_log('Cart API CLEAR: Failed to clear cart');
            }
            
            error_log('Cart API CLEAR: Sending success response');
            sendResponse(['success' => true, 'message' => 'Корзина очищена']);
            break;
            
        default:
            sendResponse(['error' => 'Метод не поддерживается'], 405);
    }
    
} catch (PDOException $e) {
    sendResponse(['error' => 'Ошибка базы данных: ' . $e->getMessage()], 500);
}
?>