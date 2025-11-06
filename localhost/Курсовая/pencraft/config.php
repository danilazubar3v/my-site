<?php
class Database {
    private $host = "localhost";
    private $db_name = "pencraft";
    private $username = "root";      // Стандартный пользователь OpenServer
    private $password = "root";      // Пароль для OpenServer (обычно root или пустой)
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4", $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            sendResponse(['error' => 'Ошибка подключения к базе данных'], 500);
        }
        return $this->conn;
    }
}

function sendResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        exit(0);
    }
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getAuthorizationHeader() {
    $headers = null;
    
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER['Authorization']);
    } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    
    return $headers;
}

function getBearerToken() {
    $headers = getAuthorizationHeader();
    
    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    
    // Также проверяем в GET параметрах (для тестирования)
    if (isset($_GET['token'])) {
        return $_GET['token'];
    }
    
    return null;
}

function verifyToken($pdo) {
    $token = getBearerToken();
    
    if (!$token) {
        // Для тестирования разрешаем работу без токена
        // В реальном приложении раскомментируйте следующую строку:
        // sendResponse(['error' => 'Токен не предоставлен'], 401);
        
        // Временное решение для тестирования - возвращаем тестового пользователя
        return [
            'id' => 1,
            'name' => 'Тестовый пользователь',
            'email' => 'test@pencraft.ru'
        ];
    }

    try {
        $decoded = json_decode(base64_decode($token), true);
        
        if (!$decoded || !isset($decoded['user_id']) || !isset($decoded['expires'])) {
            sendResponse(['error' => 'Неверный токен'], 401);
        }

        if ($decoded['expires'] < time()) {
            sendResponse(['error' => 'Токен истек'], 401);
        }

        // Проверяем существование пользователя
        $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ?");
        $stmt->execute([$decoded['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            sendResponse(['error' => 'Пользователь не найден'], 401);
        }

        return $user;
    } catch (Exception $e) {
        sendResponse(['error' => 'Ошибка проверки токена: ' . $e->getMessage()], 401);
    }
}

// Функция для инициализации базы данных (выполнить один раз)
function initializeDatabase($pdo) {
    try {
        // Создание таблицы пользователей
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Создание таблицы товаров
        $pdo->exec("CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            image VARCHAR(500),
            category VARCHAR(100),
            brand VARCHAR(100),
            rating DECIMAL(3,1) DEFAULT 0.0,
            description TEXT,
            stock INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Создание таблицы корзины
        $pdo->exec("CREATE TABLE IF NOT EXISTS cart (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT DEFAULT 1,
            price DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Создание таблицы заказов
        $pdo->exec("CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            total DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            shipping_address TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Создание таблицы элементов заказа
        $pdo->exec("CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10,2) NOT NULL
        )");

        // Добавление тестовых товаров, если таблица пуста
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM products");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            $testProducts = [
                [
                    'name' => 'Гелевая ручка Premium',
                    'price' => 250,
                    'image' => 'linear-gradient(135deg, #8B5FBF, #6D3B9E)',
                    'category' => 'pens',
                    'brand' => 'pencraft',
                    'rating' => 4.8,
                    'description' => 'Плавное письмо, эргономичный дизайн',
                    'stock' => 50
                ],
                [
                    'name' => 'Блокнот с твердой обложкой',
                    'price' => 480,
                    'image' => 'linear-gradient(135deg, #FF7E5F, #FF5722)',
                    'category' => 'paper',
                    'brand' => 'moleskine',
                    'rating' => 4.6,
                    'description' => '160 страниц, бумага высокого качества',
                    'stock' => 30
                ],
                [
                    'name' => 'Набор маркеров для скетчинга',
                    'price' => 1200,
                    'image' => 'linear-gradient(135deg, #4ECDC4, #2BBBAD)',
                    'category' => 'creative',
                    'brand' => 'faber-castell',
                    'rating' => 4.9,
                    'description' => '24 цвета, двойной наконечник',
                    'stock' => 20
                ],
                [
                    'name' => 'Органайзер для стола',
                    'price' => 890,
                    'image' => 'linear-gradient(135deg, #FFB74D, #FF9800)',
                    'category' => 'organizers',
                    'brand' => 'pencraft',
                    'rating' => 4.5,
                    'description' => 'Деревянный, 5 отделений',
                    'stock' => 15
                ],
                [
                    'name' => 'Набор цветных карандашей',
                    'price' => 750,
                    'image' => 'linear-gradient(135deg, #9575CD, #7E57C2)',
                    'category' => 'creative',
                    'brand' => 'faber-castell',
                    'rating' => 4.7,
                    'description' => '36 цветов, высокая пигментация',
                    'stock' => 25
                ]
            ];

            $stmt = $pdo->prepare("INSERT INTO products (name, price, image, category, brand, rating, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($testProducts as $product) {
                $stmt->execute([
                    $product['name'],
                    $product['price'],
                    $product['image'],
                    $product['category'],
                    $product['brand'],
                    $product['rating'],
                    $product['description'],
                    $product['stock']
                ]);
            }
        }

        return true;
    } catch (PDOException $e) {
        error_log("Database initialization error: " . $e->getMessage());
        return false;
    }
}

// Автоматическая инициализация базы данных при первом подключении
// Раскомментируйте следующую строку для автоматического создания таблиц при первом запуске:
// initializeDatabase((new Database())->getConnection());

?>