// Файл: /api/oauth-callback.js
// Минимальный рабочий обработчик для теста

export default async function handler(req, res) {
  // 1. Настраиваем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Обработка OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Логируем входящий запрос
  console.log(`📨 Запрос: ${req.method}`, { query: req.query });

  // 4. ВСЕГДА возвращаем простой HTML-интерфейс
  const htmlResponse = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Тест AI чат для Битрикс24</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2d3748; border-bottom: 2px solid #4299e1; padding-bottom: 10px; }
            .status-box { background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 6px; padding: 15px; margin: 20px 0; }
            button { padding: 12px 24px; background: #4299e1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 5px; }
            button:hover { background: #3182ce; }
            #result { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; min-height: 100px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>✅ Приложение работает!</h1>
            <div class="status-box">
                <h3>Статус: <span id="statusText">Готово</span></h3>
                <p>Базовый обработчик успешно загружен.</p>
            </div>
            
            <div>
                <button onclick="testApi()">👤 Тест API Битрикс24</button>
                <button onclick="showLogs()">📊 Показать логи</button>
            </div>
            
            <div id="result">
                <p>Нажмите кнопку для теста</p>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #f0f8ff; border-radius: 6px; font-size: 14px;">
                <h4>Отладочная информация:</h4>
                <p><strong>Метод запроса:</strong> <span id="method">${req.method}</span></p>
                <p><strong>Время:</strong> <span id="time">${new Date().toISOString()}</span></p>
                <p><strong>Домен:</strong> <span id="domain">${req.query.DOMAIN || 'не указан'}</span></p>
            </div>
        </div>

        <!-- Библиотека Битрикс24 -->
        <script src="//api.bitrix24.com/api/v1/"></script>
        
        <script>
            // Инициализация приложения
            BX24.init(function() {
                console.log('✅ Библиотека BX24 загружена');
                document.getElementById('statusText').textContent = 'Авторизован';
                BX24.setTitle('Тест AI чат');
            });
            
            // Функция тестирования API
            function testApi() {
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = '<p>⏳ Запрашиваю данные пользователя...</p>';
                
                BX24.callMethod('user.current', {}, function(res) {
                    if(res.error()) {
                        resultDiv.innerHTML = '<p style="color: red;">❌ Ошибка: ' + res.error().error_description + '</p>';
                    } else {
                        const user = res.data();
                        resultDiv.innerHTML = \`
                            <p><strong>✅ Данные получены:</strong></p>
                            <p><strong>Имя:</strong> \${user.NAME} \${user.LAST_NAME}</p>
                            <p><strong>Email:</strong> \${user.EMAIL}</p>
                        \`;
                    }
                });
            }
            
            // Показать логи
            function showLogs() {
                document.getElementById('result').innerHTML = \`
                    <p><strong>Логи запроса:</strong></p>
                    <pre>Метод: ${req.method}</pre>
                    <pre>Query параметры: ${JSON.stringify(req.query, null, 2)}</pre>
                \`;
            }
        </script>
    </body>
    </html>
  `;

  return res.status(200).send(htmlResponse);
}
