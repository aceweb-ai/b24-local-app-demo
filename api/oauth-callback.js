// Файл: /api/oauth-callback.js
// Универсальный обработчик с поддержкой ES6 модулей

export default async function handler(req, res) {
  // 1. Настраиваем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Обработка OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`📨 Запрос: ${req.method}`, { 
    query: req.query, 
    hasCode: !!req.query.code || !!(req.body && req.body.code) 
  });

  // 3. ОБРАБОТКА GET-ЗАПРОСОВ (загрузка интерфейса приложения)
  if (req.method === 'GET' && !req.query.code) {
    console.log('🖼️ Возвращаем HTML интерфейс приложения');
    return res.status(200).send(`
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
              <h1>🧪 Тестовый AI чат</h1>
              <div class="status-box">
                  <h3>Статус: <span id="statusText">Загрузка...</span></h3>
                  <p id="statusDetails">Инициализация приложения в Битрикс24</p>
              </div>
              
              <div>
                  <button onclick="getUserData()">👤 Получить данные пользователя</button>
                  <button onclick="testBackend()">🔗 Тест связи с бэкендом</button>
                  <button onclick="testAI()">🤖 Тест AI (Chutes)</button>
              </div>
              
              <div id="result">
                  <p>Результаты запросов появятся здесь</p>
              </div>
              
              <div style="margin-top: 30px; padding: 15px; background: #fff8e1; border-radius: 6px; font-size: 14px;">
                  <h4>Информация:</h4>
                  <p>Это тестовое приложение демонстрирует интеграцию:</p>
                  <ul>
                      <li>✅ Работа внутри iframe Битрикс24</li>
                      <li>✅ Авторизация OAuth 2.0</li>
                      <li>✅ Вызов API Битрикс24</li>
                      <li>⏳ Интеграция с AI (Chutes) - в разработке</li>
                  </ul>
              </div>
          </div>

          <!-- Библиотека Битрикс24 -->
          <script src="//api.bitrix24.com/api/v1/"></script>
          
          <script>
              let authData = null;
              
              // Инициализация приложения
              BX24.init(function() {
                  document.getElementById('statusText').textContent = '✅ Готово';
                  document.getElementById('statusDetails').textContent = 'Приложение инициализировано';
                  authData = BX24.getAuth();
                  console.log('Данные авторизации:', authData);
                  
                  // Обновляем заголовок
                  BX24.setTitle('Тест AI чат');
              });
              
              // Функция получения данных пользователя
              async function getUserData() {
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
                              <p><strong>Должность:</strong> \${user.WORK_POSITION || 'Не указана'}</p>
                          \`;
                      }
                  });
              }
              
              // Тест связи с бэкендом
              async function testBackend() {
                  const resultDiv = document.getElementById('result');
                  resultDiv.innerHTML = '<p>⏳ Тестирую связь с бэкендом Vercel...</p>';
                  
                  try {
                      const response = await fetch('/api/oauth-callback?test=ping', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ test: 'frontend_check', time: new Date().toISOString() })
                      });
                      const data = await response.json();
                      resultDiv.innerHTML = \`
                          <p><strong>✅ Ответ от бэкенда:</strong></p>
                          <pre>\${JSON.stringify(data, null, 2)}</pre>
                      \`;
                  } catch (error) {
                      resultDiv.innerHTML = '<p style="color: red;">❌ Ошибка связи: ' + error.message + '</p>';
                  }
              }
              
              // Тест AI (заглушка)
              function testAI() {
                  document.getElementById('result').innerHTML = \`
                      <p><strong>🤖 Тест AI (Chutes)</strong></p>
                      <p>Эта функция будет подключена позже.</p>
                      <p>Для теста AI используйте предыдущий проект: <a href="https://aceweb-ai.github.io/ai-bot/" target="_blank">Чат-бот для сайта</a></p>
                  \`;
              }
          </script>
      </body>
      </html>
    `);
  }

  // 4. ОБРАБОТКА POST-ЗАПРОСОВ (OAuth и API вызовы)
  if (req.method === 'POST') {
    try {
      console.log('📨 POST запрос от Битрикс24');
      
      // Собираем данные из разных источников
      const data = {
        ...req.query,
        ...(req.body || {})
      };
      
      const { code, DOMAIN, event, APP_SID } = data;
      
      // 5. Если это OAuth-авторизация (есть код)
      if (code && DOMAIN) {
        console.log(\`🔄 OAuth обмен для \${DOMAIN}\`);
        
        const CLIENT_ID = process.env.B24_CLIENT_ID;
        const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;
        
        if (!CLIENT_ID || !CLIENT_SECRET) {
          throw new Error('Не заданы B24_CLIENT_ID или B24_CLIENT_SECRET в настройках Vercel');
        }
        
        // Обмен кода на токен
        const tokenResponse = await fetch(\`https://\${DOMAIN}/oauth/token/\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
          }),
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          console.error('❌ Ошибка OAuth:', tokenData);
          return res.status(400).json({ error: 'OAuth failed', details: tokenData });
        }
        
        console.log('✅ Токены получены');
        return res.status(200).json({
          result: 'success',
          message: 'Авторизация успешна',
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in
        });
      }
      
      // 6. Если это инициализация приложения (как в логах)
      if (DOMAIN && APP_SID) {
        console.log(\`🏁 Инициализация приложения для \${DOMAIN}\`);
        return res.status(200).json({
          result: 'success',
          message: 'Application handler is ready',
          mode: 'initialization',
          domain: DOMAIN,
          app_sid: APP_SID,
          frontend_available: true,
          note: 'Интерфейс приложения доступен по этому же URL'
        });
      }
      
      // 7. Простой тестовый запрос
      return res.status(200).json({
        result: 'success',
        message: 'POST запрос получен',
        data: data,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Ошибка:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // 8. Для остальных методов
  return res.status(405).json({ error: 'Method Not Allowed' });
}
