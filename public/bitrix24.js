// Файл: /public/bitrix24.js
document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.getElementById('result');
    const testBtn = document.getElementById('testBtn');

    // 1. Инициализация в среде Битрикс24
    BX24.init(function() {
        console.log('✅ BX24 инициализирован.');
        
        // 2. Проверяем, есть ли авторизация
        let auth = BX24.getAuth();
        console.log('Токены от Битрикс24:', auth);
        
        if (auth && auth.access_token) {
            // 3. Если токен есть, приложение уже авторизовано
            resultDiv.innerHTML = `
                <p style="color:green;"><strong>✅ Приложение готово!</strong></p>
                <p>Токены получены автоматически. Можно тестировать API.</p>
            `;
            enableAppFeatures();
        } else {
            // 4. Если по какой-то причине токенов нет, запрашиваем авторизацию
            resultDiv.innerHTML = '<p>Запрос разрешений...</p>';
            BX24.refreshAuth(function(newAuth) {
                console.log('Новые токены:', newAuth);
                resultDiv.innerHTML += '<p style="color:green;">✅ Авторизация пройдена!</p>';
                enableAppFeatures();
            });
        }
    });

    function enableAppFeatures() {
        // Обновляем заголовок
        BX24.setTitle('Мой AI-помощник (Готов)');
        
        // Активируем кнопку
        testBtn.disabled = false;
        testBtn.textContent = 'Тест: Получить мои данные';
        
        // Показываем подсказку для следующего шага
        resultDiv.innerHTML += `
            <hr>
            <p><strong>Следующий шаг:</strong> Интегрировать AI (Chutes).</p>
            <p>Теперь ваш бэкенд на Vercel может:</p>
            <ol>
                <li>Принимать запросы из этого интерфейса</li>
                <li>Используя токены, работать с API Битрикс24</li>
                <li>Отправлять данные в AI (Chutes) и возвращать результат</li>
            </ol>
        `;
    }

    // 5. Тестовый запрос к API Битрикс24
    testBtn.addEventListener('click', function() {
        resultDiv.innerHTML = '<p>Запрос данных пользователя через API...</p>';
        
        BX24.callMethod('user.current', {}, function(res) {
            if (res.error()) {
                console.error('Ошибка API:', res.error());
                resultDiv.innerHTML = `<p style="color:red;">Ошибка API: ${res.error().error_description}</p>`;
            } else {
                const user = res.data();
                console.log('Данные пользователя:', user);
                resultDiv.innerHTML = `
                    <p><strong>✅ Данные из Битрикс24 получены!</strong></p>
                    <p><strong>Имя:</strong> ${user.NAME} ${user.LAST_NAME}</p>
                    <p><strong>Email:</strong> ${user.EMAIL}</p>
                    <p><strong>ID:</strong> ${user.ID}</p>
                `;
            }
        });
    });
});
