<?php
require_once 'pencraft/config.php';

$database = new Database();
$pdo = $database->getConnection();

if (!$pdo) {
    echo "Ошибка подключения к базе данных\n";
    exit();
}

try {
    $stmt = $pdo->query("SELECT id, name FROM products ORDER BY id ASC");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Всего товаров: " . count($products) . "\n\n";
    
    foreach ($products as $product) {
        echo "ID: " . $product['id'] . " | Название: " . $product['name'] . "\n";
    }
} catch (PDOException $e) {
    echo "Ошибка базы данных: " . $e->getMessage() . "\n";
}
?>

