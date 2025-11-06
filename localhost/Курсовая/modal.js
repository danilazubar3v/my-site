// Универсальная система модальных окон для PenCraft

class ModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        // Обработчик закрытия по клику на overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.close();
            }
        });

        // Обработчик закрытия по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.close();
            }
        });
    }

    // Создание модального окна
    createModal(options = {}) {
        const {
            id = 'modal-' + Date.now(),
            title = 'Модальное окно',
            content = '',
            type = 'default',
            size = 'medium',
            showClose = true,
            footer = '',
            onClose = null,
            onConfirm = null
        } = options;

        // Удаляем существующее модальное окно, если есть
        this.close();

        const modalHTML = `
            <div class="modal-overlay" id="${id}">
                <div class="modal modal-${type} modal-${size}">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        ${showClose ? '<button class="modal-close" onclick="modalManager.close()">&times;</button>' : ''}
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById(id);
        this.activeModal = modal;
        
        console.log('Модальное окно создано:', modal);
        console.log('HTML модального окна:', modalHTML);

        // Анимация появления
        setTimeout(() => {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            console.log('Модальное окно активировано:', modal.classList.contains('active'));
        }, 10);

        // Сохраняем обработчики
        if (onClose) {
            modal._onClose = onClose;
        }
        if (onConfirm) {
            modal._onConfirm = onConfirm;
        }

        return modal;
    }

    // Закрытие модального окна
    close() {
        if (this.activeModal) {
            const modal = this.activeModal;
            
            // Вызываем обработчик закрытия
            if (modal._onClose) {
                modal._onClose();
            }

            // Анимация исчезновения
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);

            this.activeModal = null;
        }
    }

    // Модальное окно подтверждения
    showConfirm(options = {}) {
        const {
            title = 'Подтверждение',
            message = 'Вы уверены?',
            confirmText = 'Да',
            cancelText = 'Отмена',
            onConfirm = null,
            onCancel = null
        } = options;

        const content = `
            <div class="modal-confirm-icon">⚠️</div>
            <div class="modal-confirm-message">${message}</div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="modalManager.close()">${cancelText}</button>
            <button class="btn btn-primary" onclick="modalManager.confirmAction()">${confirmText}</button>
        `;

        this.createModal({
            title,
            content,
            footer,
            type: 'confirm',
            onConfirm
        });

        // Сохраняем обработчик подтверждения
        this.activeModal._onConfirm = onConfirm;
    }

    // Подтверждение действия
    confirmAction() {
        if (this.activeModal && this.activeModal._onConfirm) {
            this.activeModal._onConfirm();
        }
        this.close();
    }

    // Модальное окно информации о товаре
    showProductInfo(product) {
        const content = `
            <div class="modal-product-image" style="background-image: url('${product.image || 'https://picsum.photos/400/400?random=1'}'); background-size: cover; background-position: center;">
                ${!product.image ? '📦' : ''}
            </div>
            <div class="modal-product-info">
                <h3>${product.name}</h3>
                <div class="modal-product-price">${parseFloat(product.price).toLocaleString('ru-RU')} ₽</div>
                <div class="modal-product-description">
                    ${product.description || 'Описание товара отсутствует.'}
                </div>
                <ul class="modal-product-features">
                    <li>Высокое качество материалов</li>
                    <li>Современный дизайн</li>
                    <li>Долговечность использования</li>
                    <li>Экологически безопасные материалы</li>
                </ul>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="modalManager.close()">Закрыть</button>
            <button class="btn btn-primary" onclick="modalManager.close(); addToCart(${product.id})">Добавить в корзину</button>
        `;

        this.createModal({
            title: 'Информация о товаре',
            content,
            footer,
            type: 'product'
        });
    }

    // Модальное окно оформления заказа
    showOrderForm(cartItems, totalPrice) {
        const orderItems = cartItems.map(item => `
            <div class="modal-order-item">
                <span>${item.name} × ${item.quantity}</span>
                <span>${(parseFloat(item.price) * item.quantity).toLocaleString('ru-RU')} ₽</span>
            </div>
        `).join('');

        const content = `
            <div class="modal-order-summary">
                <h4>Содержимое заказа</h4>
                ${orderItems}
                <div class="modal-order-item">
                    <span><strong>Итого</strong></span>
                    <span><strong>${totalPrice.toLocaleString('ru-RU')} ₽</strong></span>
                </div>
            </div>
            <form class="modal-order-form" id="orderForm">
                <div class="form-group">
                    <label class="form-label">Имя</label>
                    <input type="text" class="form-input" name="name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Телефон</label>
                    <input type="tel" class="form-input" name="phone" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" name="email" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Адрес доставки</label>
                    <textarea class="form-input form-textarea" name="address" required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Комментарий к заказу</label>
                    <textarea class="form-input form-textarea" name="comment" placeholder="Дополнительные пожелания..."></textarea>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="modalManager.close()">Отмена</button>
            <button class="btn btn-primary" onclick="modalManager.submitOrder()">Оформить заказ</button>
        `;

        this.createModal({
            title: 'Оформление заказа',
            content,
            footer,
            type: 'order'
        });
    }

    // Отправка заказа
    async submitOrder() {
        const form = document.getElementById('orderForm');
        if (!form) return;

        const formData = new FormData(form);
        const orderData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            address: formData.get('address'),
            comment: formData.get('comment')
        };

        // Валидация
        if (!orderData.name || !orderData.phone || !orderData.email || !orderData.address) {
            this.showNotification('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }

        try {
            // Получаем ID пользователя из токена
            const token = localStorage.getItem('userToken');
            if (!token) {
                this.showNotification('Необходимо войти в систему', 'error');
                return;
            }

            const tokenData = JSON.parse(atob(token));
            const userId = tokenData.user_id;

            // Здесь можно добавить отправку данных на сервер
            console.log('Данные заказа:', orderData);
            console.log('ID пользователя:', userId);
            
            // Очищаем корзину после оформления заказа
            if (typeof clearCart === 'function') {
                await clearCart(userId);
            }
            
            this.close();
            this.showNotification('Заказ успешно оформлен! Мы свяжемся с вами в ближайшее время.', 'success');
            
            // Перезагружаем корзину
            if (typeof loadCart === 'function') {
                setTimeout(() => {
                    loadCart();
                }, 1000);
            }
        } catch (error) {
            console.error('Ошибка оформления заказа:', error);
            this.showNotification('Произошла ошибка при оформлении заказа', 'error');
        }
    }

    // Модальное окно приветствия
    showWelcome() {
        const content = `
            <div class="modal-welcome-icon">🎉</div>
            <div class="modal-welcome-title">Добро пожаловать в PenCraft!</div>
            <div class="modal-welcome-message">
                Мы рады приветствовать вас в нашем магазине премиальной канцелярии. 
                Здесь вы найдете качественные товары для работы, учебы и творчества.
            </div>
        `;

        const footer = `
            <button class="btn btn-primary" onclick="modalManager.close()">Начать покупки</button>
        `;

        this.createModal({
            title: 'Добро пожаловать!',
            content,
            footer,
            type: 'welcome'
        });
    }

    // Показ уведомления
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#f59e0b' : '#4caf50'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Создаем глобальный экземпляр
const modalManager = new ModalManager();

// Экспортируем для использования в других файлах
window.modalManager = modalManager;
