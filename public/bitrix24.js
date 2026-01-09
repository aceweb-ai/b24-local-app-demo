// Файл: /public/bitrix24.js
document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.getElementById('result');
    
    // Создаём кнопку для теста
    const testBtn = document.createElement('button');
    testBtn.id = 'testBtn';
    testBtn.textContent = '🧪 Тест: Проверить авторизацию и API';
    testBtn.style.cssText = `
        padding: 15px 25px; 
        font-size: 16px; 
        background: #4CAF50; 
        color: white; 
        border: none; 
        border-radius: 5px; 
        cursor: pointer;
        margin: 10px 0;
    `;
    
    resultDiv.appendChild(testBtn);
    resultDiv.appendChild(document.createElement('br'));
    
    // Функция для вывода сообщений
    function log(msg, isError = false) {
        const p = document.createElement('p');
        p.innerHTML = isError ? `<span style="color:red">❌ ${msg}</span>` : msg;
        p.style.margin = '10px 0';
        p.style.padding = '10px';
        p.style.background = isError ? '#ffe6e6' : '#f0f8ff';
        p.style.borderRadius = '5px';
        resultDiv.appendChild(p);
        console.log(isError ? '❌ ' + msg : '✅ ' + msg);
    }
    
    // 1. Инициализация
    BX24.init(function() {
        log('BX24 инициализирован в iframe Битрикс24');
        
        // 2. Проверяем авторизацию через BX24.getAuth()
        const authData = BX24.getAuth();
        console.log('Auth data from BX24:', authData);
        
        if (authData && authData.access_token) {
            log(`✅ Уже авторизован!<br>
                Домен: ${authData.domain}<br>
                Токен: ${authData.access_token.substring(0, 25)}...<br>
                Истекает: ${new Date(authData.expires_in).toLocaleTimeString()}`);
        } else {
            log('⚠️ Токен не найден через BX24.getAuth()');
        }
    });
    
    // 3. Обработчик тестовой кнопки
    testBtn.addEventListener('click', function() {
        log('🔄 Проверяем авторизацию и тестируем API...');
        
        // Вариант 1: Используем BX24.getAuth()
        const auth = BX24.getAuth();
        
        if (!auth || !auth.access_token) {
            log('❌ Токен не найден через BX24.getAuth(). Попробуем BX24.refreshAuth()...');
            
            // Пробуем запросить авторизацию, если токена нет
            BX24.refreshAuth(function(newAuth) {
                if (newAuth && newAuth.access_token) {
                    log('✅ Авторизация через refreshAuth успешна!');
                    testAPI();
                } else {
                    log('❌ Не удалось получить авторизацию. Пожалуйста, переустановите приложение в Битрикс24.', true);
                }
            });
        } else {
            log('✅ Токен найден через getAuth()!');
            testAPI();
        }
    });
    
    function testAPI() {
        log('🔄 Делаем тестовый запрос к API Битрикс24...');
        
        // Простой тестовый запрос
        BX24.callMethod('user.current', {}, function(res) {
            if (res.error()) {
                console.error('API Error:', res.error());
                log(`❌ Ошибка API: ${res.error().error_description}`, true);
            } else {
                const user = res.data();
                console.log('User data:', user);
                log(`✅ API работает! Получены данные пользователя:<br>
                    <strong>Имя:</strong> ${user.NAME || ''} ${user.LAST_NAME || ''}<br>
                    <strong>Email:</strong> ${user.EMAIL || 'не указан'}<br>
                    <strong>ID:</strong> ${user.ID}<br>
                    <hr>
                    <strong style="color:green">🎉 Связка Битрикс24 ↔ Vercel работает!</strong><br>
                    Теперь можно интегрировать AI (Chutes).`);
            }
        });
    }
    
    // Выводим инструкцию
    log(`
        <strong>Текущий статус:</strong><br>
        1. ✅ Бэкенд принимает запросы от Битрикс24<br>
        2. ✅ Битрикс24 передает токены (AUTH_ID, REFRESH_ID)<br>
        3. ⏳ Проверяем доступность токенов на фронтенде<br>
        4. ⏳ Тестируем вызовы API Битрикс24<br>
        <hr>
        Нажмите кнопку выше для тестирования.
    `);
});
