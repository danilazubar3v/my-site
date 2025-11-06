// ========== КОНФИГУРАЦИЯ API ==========
const API_BASE_URL = '/pencraft';

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentUser = null;
let authToken = localStorage.getItem('pencraft-token');
let products = [];
let userCart = [];

// ========== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    await checkAuth();
    await loadProducts();
    initModals();
    initCarousels();
    initFilters();
    initScrollAnimations();
    initEventListeners();
    
    if (document.querySelector('.cart-page')) {
        await loadCart();
    }
}

// ========== РАБОТА С API ==========

// Общая функция для API запросов
async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options
    };

    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка сервера');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ========== АУТЕНТИФИКАЦИЯ ==========

// Проверка авторизации
async function checkAuth() {
    if (authToken) {
        try {
            const userData = JSON.parse(localStorage.getItem('pencraft-user'));
            if (userData) {
                currentUser = userData;
                updateAuthUI();
                await loadCart();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            logout();
        }
    }
}

// Регистрация
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }

    try {
        const data = await apiRequest('/register.php', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        authToken = data.token;
        currentUser = data.user;
        
        localStorage.setItem('pencraft-token', authToken);
        localStorage.setItem('pencraft-user', JSON.stringify(currentUser));
        
        updateAuthUI();
        closeModal(document.getElementById('registerModal'));
        showNotification('Регистрация прошла успешно');
        
        // Очистка формы
        e.target.reset();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Вход
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const data = await apiRequest('/login.php', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        authToken = data.token;
        currentUser = data.user;
        
        localStorage.setItem('pencraft-token', authToken);
        localStorage.setItem('pencraft-user', JSON.stringify(currentUser));
        
        updateAuthUI();
        await loadCart();
        closeModal(document.getElementById('loginModal'));
        showNotification('Вход выполнен успешно');
        
        // Очистка формы
        e.target.reset();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Выход
function handleLogout() {
    logout();
    showNotification('Вы вышли из системы');
}

function logout() {
    currentUser = null;
    authToken = null;
    userCart = [];
    
    localStorage.removeItem('pencraft-token');
    localStorage.removeItem('pencraft-user');
    localStorage.removeItem('pencraft-cart');
    
    updateAuthUI();
    updateCartCount();
    
    if (document.querySelector('.cart-page')) {
        renderCartPage();
    }
}

// Обновление интерфейса авторизации
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        // Показываем меню пользователя
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            if (userName) userName.textContent = `Привет, ${currentUser.name}!`;
        }
    } else {
        // Показываем кнопки входа
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Выход из системы
function logout() {
    localStorage.removeItem('pencraft-token');
    localStorage.removeItem('pencraft-user');
    currentUser = null;
    updateAuthUI();
    
    // Показываем уведомление
    showNotification('Вы вышли из системы', 'success');
    
    // Перезагружаем страницу через небольшую задержку
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// ========== ТОВАРЫ ==========

// Загрузка товаров
async function loadProducts() {
    try {
        products = await apiRequest('/products.php');
        
        if (document.querySelector('.catalog-grid')) {
            renderProducts(products);
        }
        
        // Обновление товаров на главной странице
        updateFeaturedProducts();
    } catch (error) {
        console.error('Failed to load products:', error);
        showNotification('Ошибка при загрузке товаров', 'error');
        
        // Запасной вариант - локальные данные
        loadLocalProducts();
    }
}

// Запасная функция для загрузки локальных товаров
function loadLocalProducts() {
    products = [
        { id: 1, name: 'Гелевая ручка Premium', price: 250, image: 'linear-gradient(135deg, #8B5FBF, #6D3B9E)', category: 'pens', brand: 'pencraft', rating: 4.8, description: 'Плавное письмо, эргономичный дизайн', stock: 50 },
        { id: 2, name: 'Блокнот с твердой обложкой', price: 480, image: 'linear-gradient(135deg, #FF7E5F, #FF5722)', category: 'paper', brand: 'moleskine', rating: 4.6, description: '160 страниц, бумага высокого качества', stock: 30 },
        { id: 3, name: 'Набор маркеров для скетчинга', price: 1200, image: 'linear-gradient(135deg, #4ECDC4, #2BBBAD)', category: 'creative', brand: 'faber-castell', rating: 4.9, description: '24 цвета, двойной наконечник', stock: 20 },
        { id: 4, name: 'Органайзер для стола', price: 890, image: 'linear-gradient(135deg, #FFB74D, #FF9800)', category: 'organizers', brand: 'pencraft', rating: 4.5, description: 'Деревянный, 5 отделений', stock: 15 }
    ];
    
    if (document.querySelector('.catalog-grid')) {
        renderProducts(products);
    }
    updateFeaturedProducts();
}

// Обновление featured products на главной
function updateFeaturedProducts() {
    const featuredProducts = products.slice(0, 5);
    const productCards = document.querySelectorAll('.products-scroll .product-card');
    
    productCards.forEach((card, index) => {
        if (featuredProducts[index]) {
            const product = featuredProducts[index];
            const addToCartBtn = card.querySelector('.add-to-cart');
            if (addToCartBtn) {
                addToCartBtn.setAttribute('data-product-id', product.id);
            }
        }
    });
}

// ========== КОРЗИНА ==========

// Загрузка корзины
async function loadCart() {
    if (!currentUser) {
        // Для неавторизованных пользователей используем локальную корзину
        const localCart = localStorage.getItem('pencraft-cart');
        userCart = localCart ? JSON.parse(localCart) : [];
        updateCartCount();
        if (document.querySelector('.cart-page')) {
            renderCartPage();
        }
        return;
    }

    try {
        const data = await apiRequest('/cart.php');
        userCart = data.items || [];
        updateCartCount();
        
        if (document.querySelector('.cart-page')) {
            renderCartPage();
        }
    } catch (error) {
        console.error('Failed to load cart:', error);
        userCart = [];
        updateCartCount();
    }
}

// Добавление в корзину
async function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id == productId);
    if (!product) {
        showNotification('Товар не найден', 'error');
        return;
    }

    if (!currentUser) {
        // Для неавторизованных пользователей - локальная корзина
        const existingItem = userCart.find(item => item.product_id == productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            userCart.push({
                product_id: productId,
                quantity: quantity,
                price: product.price,
                name: product.name,
                image: product.image
            });
        }
        
        localStorage.setItem('pencraft-cart', JSON.stringify(userCart));
        updateCartCount();
        showAddToCartAnimation();
        showNotification('Товар добавлен в корзину');
        
        if (document.querySelector('.cart-page')) {
            renderCartPage();
        }
        return;
    }

    // Для авторизованных пользователей - запрос к API
    try {
        await apiRequest('/cart.php', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity })
        });
        
        await loadCart();
        showAddToCartAnimation();
        showNotification('Товар добавлен в корзину');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Обновление количества
async function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        await removeFromCart(productId);
        return;
    }

    if (!currentUser) {
        // Локальное обновление для неавторизованных
        const item = userCart.find(item => item.product_id == productId);
        if (item) {
            item.quantity = newQuantity;
            localStorage.setItem('pencraft-cart', JSON.stringify(userCart));
            updateCartCount();
            renderCartPage();
        }
        return;
    }

    // API запрос для авторизованных
    try {
        await apiRequest('/cart.php', {
            method: 'PUT',
            body: JSON.stringify({ productId, quantity: newQuantity })
        });
        
        await loadCart();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Удаление из корзины
async function removeFromCart(productId) {
    if (!currentUser) {
        // Локальное удаление для неавторизованных
        userCart = userCart.filter(item => item.product_id != productId);
        localStorage.setItem('pencraft-cart', JSON.stringify(userCart));
        updateCartCount();
        if (document.querySelector('.cart-page')) {
            renderCartPage();
        }
        showNotification('Товар удален из корзины');
        return;
    }

    // API запрос для авторизованных
    try {
        await apiRequest('/cart.php', {
            method: 'DELETE',
            body: JSON.stringify({ productId })
        });
        
        await loadCart();
        showNotification('Товар удален из корзины');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Оформление заказа
async function handleCheckout() {
    if (!currentUser) {
        showNotification('Пожалуйста, войдите в систему для оформления заказа', 'error');
        openModal(document.getElementById('loginModal'));
        return;
    }

    if (userCart.length === 0) {
        showNotification('Корзина пуста!', 'error');
        return;
    }

    // В реальном приложении здесь должна быть форма для ввода адреса доставки
    const shippingAddress = {
        name: currentUser.name,
        address: "ул. Примерная, д. 123",
        city: "Москва",
        postalCode: "123456",
        phone: "+7 (999) 123-45-67"
    };

    try {
        await apiRequest('/orders.php', {
            method: 'POST',
            body: JSON.stringify({ shippingAddress })
        });
        
        await loadCart();
        showNotification('Заказ успешно оформлен!');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ========== ОТОБРАЖЕНИЕ ТОВАРОВ И КОРЗИНЫ ==========

// Отображение товаров в каталоге
function renderProducts(productsToRender) {
    const productsGrid = document.getElementById('productsGrid');
    const resultsCount = document.getElementById('resultsCount');
    
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '';
    
    if (productsToRender.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 50px;">
                <h3>Товары не найдены</h3>
                <p>Попробуйте изменить параметры фильтрации</p>
            </div>
        `;
    } else {
        productsToRender.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                ${product.stock < 10 ? '<div class="product-badge">Заканчивается</div>' : ''}
                <div class="product-image" style="background: ${product.image};"></div>
                <div class="product-content">
                    <p class="product-brand">${getBrandName(product.brand)}</p>
                    <h4>${product.name}</h4>
                    <div class="product-rating">
                        <div class="rating-stars">
                            ${getStarRating(product.rating)}
                        </div>
                        <span class="rating-value">${product.rating}</span>
                    </div>
                    <p class="product-description">${product.description || 'Качественный продукт для работы и творчества'}</p>
                    <div class="product-footer">
                        <p class="product-price">${product.price} ₽</p>
                        <button class="add-to-cart" data-product-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.4 5.2 16.4H17M17 17C16.5 17 16 17.4 16 18C16 18.6 16.4 19 17 19C17.6 19 18 18.6 18 18C18 17.4 17.6 17 17 17ZM9 18C9 18.6 8.6 19 8 19C7.4 19 7 18.6 7 18C7 17.4 7.4 17 8 17C8.6 17 9 17.4 9 18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    ${product.stock === 0 ? '<p style="color: #f44336; font-size: 12px; margin-top: 5px;">Нет в наличии</p>' : ''}
                </div>
            `;
            productsGrid.appendChild(productCard);
        });
        
        // Добавляем обработчики для кнопок добавления в корзину
        const addToCartButtons = productsGrid.querySelectorAll('.add-to-cart');
        addToCartButtons.forEach(button => {
            button.addEventListener('click', function() {
                if (this.disabled) return;
                const productId = this.getAttribute('data-product-id');
                addToCart(productId);
            });
        });
    }
    
    if (resultsCount) {
        const countText = getProperItemText(productsToRender.length, 'товар', 'товара', 'товаров');
        resultsCount.textContent = `Найдено ${productsToRender.length} ${countText}`;
    }
}

// Отображение корзины
function renderCartPage() {
    const cartItemsList = document.getElementById('cartItemsList');
    const emptyCart = document.getElementById('emptyCart');
    const itemsCount = document.getElementById('itemsCount');
    const subtotal = document.getElementById('subtotal');
    const shipping = document.getElementById('shipping');
    const total = document.getElementById('total');
    
    if (!cartItemsList || !emptyCart) return;
    
    cartItemsList.innerHTML = '';
    
    if (userCart.length === 0) {
        emptyCart.style.display = 'block';
        cartItemsList.style.display = 'none';
        
        if (itemsCount) itemsCount.textContent = '0 товаров';
        if (subtotal) subtotal.textContent = '0 ₽';
        if (shipping) shipping.textContent = '0 ₽';
        if (total) total.textContent = '0 ₽';
        return;
    }
    
    emptyCart.style.display = 'none';
    cartItemsList.style.display = 'block';
    
    let totalItems = 0;
    let totalPrice = 0;
    
    userCart.forEach(item => {
        const product = products.find(p => p.id == item.product_id) || item;
        if (!product) return;
        
        totalItems += item.quantity;
        totalPrice += item.price * item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image" style="background: ${product.image};"></div>
            <div class="cart-item-details">
                <h4>${product.name}</h4>
                <p class="cart-item-price">${item.price} ₽</p>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" data-product-id="${product.id || product.product_id}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" data-product-id="${product.id || product.product_id}">+</button>
                    </div>
                    <button class="remove-item" data-product-id="${product.id || product.product_id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Удалить
                    </button>
                </div>
            </div>
        `;
        
        cartItemsList.appendChild(cartItem);
    });
    
    const shippingCost = totalPrice >= 3000 ? 0 : 350;
    
    if (itemsCount) {
        itemsCount.textContent = `${totalItems} ${getProperItemText(totalItems, 'товар', 'товара', 'товаров')}`;
    }
    
    if (subtotal) subtotal.textContent = `${totalPrice} ₽`;
    if (shipping) shipping.textContent = shippingCost === 0 ? 'Бесплатно' : `${shippingCost} ₽`;
    if (total) total.textContent = `${totalPrice + shippingCost} ₽`;
    
    // Обработчики для кнопок управления количеством и удаления
    const minusButtons = cartItemsList.querySelectorAll('.quantity-btn.minus');
    const plusButtons = cartItemsList.querySelectorAll('.quantity-btn.plus');
    const removeButtons = cartItemsList.querySelectorAll('.remove-item');
    
    minusButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const item = userCart.find(item => item.product_id == productId);
            if (item) {
                updateCartItemQuantity(productId, item.quantity - 1);
            }
        });
    });
    
    plusButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const item = userCart.find(item => item.product_id == productId);
            if (item) {
                updateCartItemQuantity(productId, item.quantity + 1);
            }
        });
    });
    
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            removeFromCart(productId);
        });
    });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Правильное склонение слов
function getProperItemText(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
}

// Получение названия бренда
function getBrandName(brand) {
    const brands = {
        'pencraft': 'PenCraft',
        'artline': 'ArtLine',
        'moleskine': 'Moleskine',
        'faber-castell': 'Faber-Castell'
    };
    return brands[brand] || brand;
}

// Генерация звезд рейтинга
function getStarRating(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars += '<span>★</span>';
        } else if (i === fullStars && hasHalfStar) {
            stars += '<span>½</span>';
        } else {
            stars += '<span>☆</span>';
        }
    }
    
    return stars;
}

// Обновление счетчика товаров в корзине
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const totalItems = userCart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

// Анимация добавления в корзину
function showAddToCartAnimation() {
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.classList.add('pulse');
        setTimeout(() => {
            cartBtn.classList.remove('pulse');
        }, 500);
    }
}

// ========== УВЕДОМЛЕНИЯ ==========

function showNotification(message, type = 'success') {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content ${type}">
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease, slideOut 0.3s ease 2.7s;
        border-left: 4px solid ${type === 'error' ? '#f44336' : 'var(--primary)'};
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// ========== МОДАЛЬНЫЕ ОКНА ==========

function initModals() {
    // Элементы модальных окон
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const closeLogin = document.getElementById('closeLogin');
    const closeRegister = document.getElementById('closeRegister');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    
    // Открытие модальных окон
    if (loginBtn) {
        loginBtn.addEventListener('click', () => openModal(loginModal));
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => openModal(registerModal));
    }
    
    // Закрытие модальных окон
    if (closeLogin) {
        closeLogin.addEventListener('click', () => closeModal(loginModal));
    }
    
    if (closeRegister) {
        closeRegister.addEventListener('click', () => closeModal(registerModal));
    }
    
    // Переключение между модальными окнами
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(loginModal);
            openModal(registerModal);
        });
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(registerModal);
            openModal(loginModal);
        });
    }
    
    // Закрытие по клику вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) closeModal(loginModal);
        if (e.target === registerModal) closeModal(registerModal);
    });
    
    // Обработка форм
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

function openModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ========== КАРУСЕЛИ ==========

function initCarousels() {
    initProductsCarousel();
    initReviewsCarousel();
}

function initProductsCarousel() {
    const carousel = document.querySelector('.products-carousel');
    if (!carousel) return;
    
    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');
    const scrollContainer = carousel.querySelector('.products-scroll');
    
    if (prevBtn && nextBtn && scrollContainer) {
        prevBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
        });
        
        nextBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
        });
    }
}

function initReviewsCarousel() {
    const carousel = document.querySelector('.reviews-carousel');
    if (!carousel) return;
    
    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');
    const scrollContainer = carousel.querySelector('.reviews-slider');
    
    if (prevBtn && nextBtn && scrollContainer) {
        prevBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: -320, behavior: 'smooth' });
        });
        
        nextBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: 320, behavior: 'smooth' });
        });
    }
}

// ========== ФИЛЬТРЫ И ПОИСК ==========

function initFilters() {
    const applyFiltersBtn = document.querySelector('.apply-filters');
    const clearFiltersBtn = document.querySelector('.clear-filters');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFilters);
    }
}

function applyFilters() {
    let filteredProducts = [...products];
    
    // Фильтрация по категориям
    const categoryCheckboxes = document.querySelectorAll('input[data-category]:checked');
    if (categoryCheckboxes.length > 0) {
        const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.getAttribute('data-category'));
        filteredProducts = filteredProducts.filter(product => 
            selectedCategories.includes(product.category)
        );
    }
    
    // Фильтрация по цене
    const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseInt(document.getElementById('maxPrice').value) || 5000;
    filteredProducts = filteredProducts.filter(product => 
        product.price >= minPrice && product.price <= maxPrice
    );
    
    // Фильтрация по брендам
    const brandCheckboxes = document.querySelectorAll('input[data-brand]:checked');
    if (brandCheckboxes.length > 0) {
        const selectedBrands = Array.from(brandCheckboxes).map(cb => cb.getAttribute('data-brand'));
        filteredProducts = filteredProducts.filter(product => 
            selectedBrands.includes(product.brand)
        );
    }
    
    // Фильтрация по рейтингу
    const ratingCheckboxes = document.querySelectorAll('input[data-rating]:checked');
    if (ratingCheckboxes.length > 0) {
        const selectedRatings = Array.from(ratingCheckboxes).map(cb => parseInt(cb.getAttribute('data-rating')));
        filteredProducts = filteredProducts.filter(product => 
            selectedRatings.some(rating => product.rating >= rating)
        );
    }
    
    // Поиск
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Сортировка
    const sortValue = document.getElementById('sortSelect').value;
    switch (sortValue) {
        case 'price-asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'new':
            // Здесь можно добавить логику сортировки по новизне
            break;
        case 'rating':
            filteredProducts.sort((a, b) => b.rating - a.rating);
            break;
        default:
            // Сортировка по популярности (по умолчанию)
            break;
    }
    
    renderProducts(filteredProducts);
}

function clearFilters() {
    // Сброс чекбоксов
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Сброс цен
    document.getElementById('minPrice').value = 0;
    document.getElementById('maxPrice').value = 5000;
    
    // Сброс поиска и сортировки
    document.getElementById('searchInput').value = '';
    document.getElementById('sortSelect').value = 'popular';
    
    applyFilters();
}

// ========== АНИМАЦИИ ПРИ СКРОЛЛЕ ==========

function initScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    fadeElements.forEach(element => {
        observer.observe(element);
    });
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

function initEventListeners() {
    // Обработчики для кнопок добавления в корзину на главной странице
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.hasAttribute('data-product-id')) {
                const productId = this.getAttribute('data-product-id');
                addToCart(productId);
            }
        });
    });
    
    // Обработчик для кнопки оформления заказа
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }
    
    // Обработчик для кнопки поиска
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', toggleSearch);
    }
}

function toggleSearch() {
    if (document.querySelector('.search-box input')) {
        document.querySelector('.search-box input').focus();
    } else {
        window.location.href = 'catalog.html';
    }
}

// Добавляем стили для анимации уведомления и других элементов
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .logout-btn {
        padding: 8px 20px;
        background: transparent;
        color: var(--primary);
        border: 1px solid var(--primary);
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: var(--transition);
    }
    
    .logout-btn:hover {
        background-color: var(--primary);
        color: white;
    }
    
    .notification-content.error {
        color: #f44336;
    }
    
    .notification-content.success {
        color: var(--primary);
    }
    
    /* Анимация пульсации для кнопки корзины */
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    .pulse {
        animation: pulse 0.5s ease-in-out;
    }
    
    /* Анимации появления при скролле */
    .fade-in {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.5s, transform 0.5s;
    }
    
    .fade-in.visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    .add-to-cart:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .add-to-cart:disabled:hover {
        transform: none;
        box-shadow: none;
    }
`;
document.head.appendChild(style);
