// Файл: /public/bitrix24.js
document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.getElementById('result');
    const testBtn = document.getElementById('testBtn');

    // 1. Инициализация в среде Битрикс24
    BX24.init(function() {
        console.log('✅ BX24 инициализирован. Проверяем авторизацию...');
        resultDiv.innerHTML = '<p><strong>Статус:</strong> Инициализация...</p>';

        // 2. Проверяем, есть ли уже токен
        let auth = BX24.getAuth();
        if (!auth) {
            // 3. Если токена нет, запрашиваем авторизацию
            console.log('Токен не найден. Запуск OAuth...');
            resultDiv.innerHTML += '<p>Запрос разрешений...</p>';
            
            // Этот метод откроет окно авторизации
            BX24.refreshAuth(function(newAuth) {
                console.log('✅ Новый токен получен:', newAuth);
                resultDiv.innerHTML += '<p style="color:green;">✅ Авторизация пройдена!</p>';
                enableAppFeatures(); // Включаем функции приложения
            });
        } else {
            console.log('✅ Токен уже есть:', auth);
            resultDiv.innerHTML += '<p style="color:green;">✅ Уже авторизован.</p>';
            enableAppFeatures();
        }
    });

    function enableAppFeatures() {
        // Обновляем заголовок окна
        BX24.setTitle('Мой AI-помощник (Готов)');
        
        // Активируем кнопку тестирования
        testBtn.disabled = false;
        testBtn.textContent = 'Получить мои данные из Битрикс24';
        
        // Показываем инструкцию
        resultDiv.innerHTML += `
            <p><strong>Приложение готово к работе!</strong></p>
            <p>Нажмите кнопку выше, чтобы получить данные текущего пользователя через API Битрикс24.</p>
        `;
    }

    // 4. Обработчик тестовой кнопки
    testBtn.addEventListener('click', function() {
        resultDiv.innerHTML = '<p>Запрос данных пользователя...</p>';
        
        // Тестовый запрос к API Битрикс24
        BX24.callMethod('user.current', {}, function(res) {
            if (res.error()) {
                console.error('Ошибка API:', res.error());
                resultDiv.innerHTML = `<p style="color:red;">Ошибка: ${res.error().error_description}</p>`;
            } else {
                const user = res.data();
                console.log('Данные пользователя:', user);
                resultDiv.innerHTML = `
                    <p><strong>✅ Данные получены!</strong></p>
                    <p><strong>Имя:</strong> ${user.NAME} ${user.LAST_NAME}</p>
                    <p><strong>Email:</strong> ${user.EMAIL}</p>
                    <p><strong>ID:</strong> ${user.ID}</p>
                    <hr>
                    <p><em>Теперь можно интегрировать AI (Chutes).</em></p>
                `;
            }
        });
    });
});
