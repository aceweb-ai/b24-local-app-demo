// Файл: /public/bitrix24.js
document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.getElementById('result');
    const testBtn = document.getElementById('testBtn');
    let authData = null;

    // 1. Инициализация в среде Битрикс24
    BX24.init(async function() {
        console.log('✅ Библиотека BX24 загружена. Приложение инициализировано в iframe.');
        
        // 2. ПОЛУЧАЕМ АВТОРИЗАЦИОННЫЕ ДАННЫЕ, переданные Битрикс24
        authData = BX24.getAuth();
        console.log('🔑 Auth data from BX24:', authData);
        
        // 3. Проверяем наличие токена
        if (authData && authData.access_token) {
            resultDiv.innerHTML = '<p><strong>✅ Статус:</strong> Приложение авторизовано и готово к работе.</p>' +
                                '<p><small>Можно отправлять тестовые запросы к API.</small></p>';
        } else {
            resultDiv.innerHTML = '<p style="color: orange;"><strong>⚠️ Внимание:</strong> Токен авторизации не получен. Некоторые функции могут не работать.</p>';
        }

        // 4. Обновляем заголовок окна
        BX24.setTitle('Мой AI-помощник (тестовый режим)');
    });

    // 5. ОБРАБОТЧИК ТЕСТОВОЙ КНОПКИ - запрос данных текущего пользователя
    testBtn.addEventListener('click', function() {
        if (!authData || !authData.access_token) {
            resultDiv.innerHTML = '<p style="color: red;">❌ Ошибка: токен авторизации отсутствует. Перезагрузите приложение.</p>';
            return;
        }

        resultDiv.innerHTML = '<p>⏳ Запрашиваю данные текущего пользователя через API Битрикс24...</p>';
        
        // 6. ВЫЗОВ API БИТРИКС24 ЧЕРЕЗ BX24.js
        BX24.callMethod('user.current', {}, function(res) {
            if(res.error()){
                console.error('❌ Ошибка API Битрикс24:', res.error());
                resultDiv.innerHTML = `<p style="color: red;"><strong>❌ Ошибка API:</strong> ${res.error().error_description || 'Неизвестная ошибка'}</p>`;
            } else {
                const user = res.data();
                console.log('✅ Данные пользователя получены:', user);
                resultDiv.innerHTML = `
                    <p><strong>✅ Успех! Данные получены через API Битрикс24</strong></p>
                    <p><strong>ID:</strong> ${user.ID}</p>
                    <p><strong>Имя:</strong> ${user.NAME} ${user.LAST_NAME}</p>
                    <p><strong>Должность:</strong> ${user.WORK_POSITION || 'Не указана'}</p>
                    <p><strong>Email:</strong> ${user.EMAIL}</p>
                    <p><small>Это подтверждает, что приложение имеет доступ к данным портала.</small></p>
                `;
            }
        });
    });

    // 7. Дополнительная кнопка для теста запроса через ваш бэкенд (опционально)
    const backendTestBtn = document.getElementById('backendTestBtn');
    if (backendTestBtn) {
        backendTestBtn.addEventListener('click', async function() {
            resultDiv.innerHTML = '<p>⏳ Отправляю запрос к бэкенду на Vercel...</p>';
            try {
                const response = await fetch('https://b24-local-app-demo.vercel.app/api/oauth-callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: 'ping', from_frontend: true })
                });
                const data = await response.json();
                resultDiv.innerHTML = `<p><strong>Ответ бэкенда:</strong> ${JSON.stringify(data)}</p>`;
            } catch (error) {
                resultDiv.innerHTML = `<p style="color: red;">❌ Ошибка связи с бэкендом: ${error.message}</p>`;
            }
        });
    }
});
