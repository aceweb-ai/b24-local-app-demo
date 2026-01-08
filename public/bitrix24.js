
// Файл: /public/bitrix24.js
document.addEventListener('DOMContentLoaded', function() {

    const resultDiv = document.getElementById('result');
    const testBtn = document.getElementById('testBtn');

    // Инициализируем приложение в среде Битрикс24
    BX24.init(async function() {
        console.log('✅ Библиотека BX24 загружена. Приложение инициализировано.');
        console.log('Данные от Битрикс24:', {
            domain: BX24.getDomain(),
            auth: BX24.getAuth(), // Тут будут токены после OAuth
            isAdmin: BX24.isAdmin(),
            lang: BX24.getLang()
        });

        resultDiv.innerHTML = '<p><strong>Статус:</strong> Приложение загружено в интерфейсе Битрикс24.</p>';

        // Обновляем заголовок окна
        BX24.setTitle('Моё тестовое приложение');
    });

    // Обработчик тестовой кнопки
    testBtn.addEventListener('click', function() {
        resultDiv.innerHTML = '<p>Запрос к API Битрикс24...</p>';
        // Простой тестовый запрос на получение данных текущего пользователя
        BX24.callMethod('user.current', {}, function(res) {
            if(res.error()){
                console.error('Ошибка API:', res.error());
                resultDiv.innerHTML = `<p style="color:red;">Ошибка: ${res.error().error_description}</p>`;
            } else {
                const user = res.data();
                console.log('Данные пользователя:', user);
                resultDiv.innerHTML = `
                    <p><strong>✅ Успех!</strong></p>
                    <p>ID: ${user.ID}</p>
                    <p>Имя: ${user.NAME} ${user.LAST_NAME}</p>
                    <p>Email: ${user.EMAIL}</p>
                `;
            }
        });
    });
});
