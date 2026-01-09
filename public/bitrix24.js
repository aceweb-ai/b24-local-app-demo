// Файл: /public/bitrix24.js
document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.getElementById('result');
    
    // Создаём кнопку для запуска OAuth
    const authButton = document.createElement('button');
    authButton.id = 'authBtn';
    authButton.textContent = '🔐 ШАГ 1: Авторизовать приложение';
    authButton.style.cssText = 'padding: 15px; font-size: 16px; margin: 10px; background: #2d7ee7; color: white; border: none; border-radius: 5px; cursor: pointer;';
    
    // Создаём кнопку для теста API (изначально неактивна)
    const testButton = document.createElement('button');
    testButton.id = 'testBtn';
    testButton.textContent = '🧪 ШАГ 2: Проверить API (сначала авторизуйтесь)';
    testButton.style.cssText = 'padding: 15px; font-size: 16px; margin: 10px; background: #ccc; color: #666; border: none; border-radius: 5px; cursor: not-allowed;';
    testButton.disabled = true;
    
    // Вставляем кнопки в интерфейс
    resultDiv.appendChild(authButton);
    resultDiv.appendChild(document.createElement('br'));
    resultDiv.appendChild(testButton);
    
    // 1. Инициализация
    BX24.init(function() {
        console.log('BX24 инициализирован в iframe');
        updateStatus('Приложение загружено. Нажмите "Шаг 1" для авторизации.');
    });
    
    // 2. Обработчик кнопки авторизации
    authButton.addEventListener('click', function() {
        updateStatus('Открывается окно авторизации... Разрешите всплывающие окна!');
        authButton.disabled = true;
        authButton.textContent = 'Ждём подтверждения...';
        
        // ЗАПУСК OAuth
        BX24.refreshAuth(function(newAuth) {
            if (newAuth && newAuth.access_token) {
                console.log('✅ Успех! Токен:', newAuth);
                updateStatus('✅ Авторизация успешна! Теперь можно тестировать API.');
                
                // Активируем кнопку теста
                testButton.disabled = false;
                testButton.style.background = '#4CAF50';
                testButton.style.color = 'white';
                testButton.style.cursor = 'pointer';
                testButton.textContent = '🧪 ШАГ 2: Получить мои данные из Битрикс24';
                
                authButton.textContent = '✅ Уже авторизовано';
            } else {
                updateStatus('❌ Ошибка авторизации. Проверьте консоль (F12).');
                authButton.disabled = false;
                authButton.textContent = '🔐 Повторить авторизацию';
            }
        });
    });
    
    // 3. Обработчик тестовой кнопки
    testButton.addEventListener('click', function() {
        updateStatus('Запрашиваем данные...');
        BX24.callMethod('user.current', {}, function(res) {
            if (res.error()) {
                updateStatus('❌ Ошибка API: ' + res.error().error_description);
            } else {
                const user = res.data();
                updateStatus(`
                    ✅ Данные получены!<br>
                    <strong>Имя:</strong> ${user.NAME} ${user.LAST_NAME}<br>
                    <strong>Email:</strong> ${user.EMAIL}<br>
                    <strong>ID:</strong> ${user.ID}<br>
                    <hr>
                    🎉 <strong>Связка работает! Можно интегрировать AI.</strong>
                `);
            }
        });
    });
    
    function updateStatus(msg) {
        const statusDiv = document.getElementById('status') || (function() {
            const div = document.createElement('div');
            div.id = 'status';
            div.style.marginTop = '20px';
            resultDiv.appendChild(div);
            return div;
        })();
        statusDiv.innerHTML = `<p>${msg}</p>`;
    }
});
