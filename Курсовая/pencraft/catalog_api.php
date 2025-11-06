<?php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method == 'GET') {
        // Получение списка товаров
        $category = $_GET['category'] ?? null;
        $search = $_GET['search'] ?? null;
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 1000); // Показываем все товары
        $offset = ($page - 1) * $limit;
        
        $whereConditions = ["is_active = 1"];
        $params = [];
        
        if ($category) {
            $whereConditions[] = "category = ?";
            $params[] = $category;
        }
        
        if ($search) {
            $whereConditions[] = "(name LIKE ? OR description LIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        // Получаем общее количество товаров
        $countStmt = $pdo->prepare("SELECT COUNT(*) as total FROM products WHERE $whereClause");
        $countStmt->execute($params);
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Получаем товары с пагинацией (без изображений)
        $stmt = $pdo->prepare("
            SELECT id, name, description, price, category, is_active, created_at 
            FROM products 
            WHERE $whereClause 
            ORDER BY created_at DESC 
            LIMIT $limit OFFSET $offset
        ");
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Получаем категории
        $categoryStmt = $pdo->query("SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category");
        $categories = $categoryStmt->fetchAll(PDO::FETCH_COLUMN);
        
        sendResponse([
            'success' => true,
            'products' => $products,
            'categories' => $categories,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($totalCount / $limit),
                'total_items' => $totalCount,
                'items_per_page' => $limit
            ]
        ]);
        
    } else {
        sendResponse(['error' => 'Метод не поддерживается'], 405);
    }
    
} catch (PDOException $e) {
    sendResponse(['error' => 'Ошибка базы данных: ' . $e->getMessage()], 500);
}
?>
