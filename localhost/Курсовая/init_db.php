<?php
// Простая инициализация базы данных для OpenServer
require_once 'pencraft/config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Инициализация базы данных PenCraft</h1>";

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception('Не удалось подключиться к базе данных');
    }
    
    echo "<p style='color: green;'>✅ Подключение к базе данных успешно</p>";
    
    // Инициализируем базу данных
    $result = initializeDatabase($pdo);
    
    if ($result) {
        echo "<p style='color: green;'>✅ База данных успешно инициализирована</p>";
        echo "<p>Таблицы созданы, тестовые данные добавлены</p>";
        echo "<p><a href='index.html'>Перейти на главную страницу</a></p>";
    } else {
        echo "<p style='color: red;'>❌ Ошибка при инициализации базы данных</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Ошибка: " . $e->getMessage() . "</p>";
    echo "<h3>Возможные решения:</h3>";
    echo "<ul>";
    echo "<li>Убедитесь, что OpenServer запущен</li>";
    echo "<li>Проверьте, что MySQL сервер работает</li>";
    echo "<li>Убедитесь, что база данных 'pencraft' создана</li>";
    echo "</ul>";
}
?>

<style>
body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 50px auto;
    padding: 20px;
    background-color: #f5f5f5;
}
h1 {
    color: #333;
    text-align: center;
}
p {
    background: white;
    padding: 10px;
    border-radius: 5px;
    margin: 10px 0;
}
ul {
    background: white;
    padding: 20px;
    border-radius: 5px;
}
</style>
