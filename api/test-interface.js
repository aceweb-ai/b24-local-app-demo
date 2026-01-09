// Файл: /api/test-interface.js
export default async function handler(req, res) {
    console.log('✅ TEST-INTERFACE: Запрос получен');
    
    // Всегда возвращаем HTML
    return res.status(200).setHeader('Content-Type', 'text/html').send(`
<!DOCTYPE html>
<html>
<head><title>Тест</title><meta charset="utf-8"></head>
<body style="padding:20px;">
    <h1>✅ HTML работает!</h1>
    <p>Если вы видите это, фронтенд загружается.</p>
    <button onclick="alert('Кнопка работает!')">Тест кнопки</button>
    <script>
        console.log('Тестовый интерфейс загружен');
        alert('Интерфейс загружен! Закройте это окно.');
    </script>
</body>
</html>
    `);
}
