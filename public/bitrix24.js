// Файл: /public/bitrix24.js
document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.getElementById('result');
    const testBtn = document.getElementById('testBtn');

    // Функция для обновления интерфейса
    function updateUI(status, message) {
        resultDiv.innerHTML = `<p><strong>${status}</strong> ${message}</p>`;
    }

    // 1. Инициализация
    BX24.init(async function() {
        console.log('✅ BX24 инициализирован. Проверяем авторизацию...');
        updateUI('🔄', 'Проверка авторизации...');

        // 2. Проверяем, есть ли токен
        const auth = BX24.getAuth();
        
        if (auth && auth.access_token) {
            console.log('✅ Токен уже есть:', auth);
            updateUI('✅', 'Уже авторизован!');
            enableAppFeatures();
        } else {
            console.log('❌ Токена нет. Запускаем авторизацию...');
            updateUI('🔄', 'Запуск OAuth-авторизации...');
            
            // 3. КРИТИЧЕСКИ ВАЖНО: Запрашиваем авторизацию
            // Этот метод откроет всплывающее окно для подтверждения прав
            BX24.refreshAuth(function(newAuth) {
                if (newAuth && newAuth.access_token) {
                    console.log('✅ Новый токен получен:', newAuth);
                    updateUI('✅', 'Авторизация успешна!');
                    enableAppFeatures();
                } else {
                    console.error('❌ Авторизация не удалась');
                    updateUI('❌', 'Ошибка авторизации. Попробуйте перезагрузить приложение.');
                }
            });
        }
    });

    function enableAppFeatures() {
        // Обновляем заголовок
        BX24.setTitle('Мой AI-помощник (Авторизован)');
        
        // Активируем кнопку
        testBtn.disabled = false;
        testBtn.textContent = 'Тест: Получить мои данные';
        
        // Показываем инструкцию
        resultDiv.innerHTML += `
            <hr>
            <p><strong>Приложение готово к работе!</strong></p>
            <p>Нажмите кнопку ниже, чтобы проверить доступ к API Битрикс24.</p>
        `;
    }

    // 4. Тестовый запрос
    testBtn.addEventListener('click', function() {
        updateUI('🔄', 'Запрос данных пользователя...');
        
        BX24.callMethod('user.current', {}, function(res) {
            if (res.error()) {
                console.error('Ошибка API:', res.error());
                updateUI('❌', `Ошибка API: ${res.error().error_description}`);
            } else {
                const user = res.data();
                console.log('✅ Данные пользователя:', user);
                resultDiv.innerHTML = `
                    <p><strong>✅ Данные из Битрикс24 получены!</strong></p>
                    <p><strong>Имя:</strong> ${user.NAME || ''} ${user.LAST_NAME || ''}</p>
                    <p><strong>Email:</strong> ${user.EMAIL || 'не указан'}</p>
                    <p><strong>ID:</strong> ${user.ID}</p>
                    <hr>
                    <p style="color:green;"><strong>🎉 Поздравляю! Связка Битрикс24 ↔ Vercel работает!</strong></p>
                    <p>Теперь можно интегрировать AI (Chutes).</p>
                `;
            }
        });
    });
});
