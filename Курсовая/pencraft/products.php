<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] != 'GET') {
    sendResponse(['error' => 'Метод не разрешен'], 405);
}

$database = new Database();
$pdo = $database->getConnection();

try {
    $stmt = $pdo->query("SELECT * FROM products ORDER BY created_at DESC");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse($products);

} catch (PDOException $e) {
    sendResponse(['error' => 'Ошибка при получении товаров: ' . $e->getMessage()], 500);
}
?>