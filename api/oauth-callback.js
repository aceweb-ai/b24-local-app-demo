// Файл: /api/oauth-callback.js
// Полноценный обработчик с поддержкой авторизации

export default async function handler(req, res) {
  // 1. Настраиваем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Обработка OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Парсим тело запроса (важно!)
  let bodyData = {};
  if (req.method === 'POST') {
    try {
      // Битрикс24 отправляет данные как x-www-form-urlencoded
      const text = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
      
      // Преобразуем строку параметров в объект
      const params = new URLSearchParams(text);
      bodyData = Object.fromEntries(params);
      console.log('📦 Данные от Битрикс24:', bodyData);
    } catch (error) {
      console.error('❌ Ошибка парсинга тела:', error);
    }
  }

  // 4. Объединяем данные из query и body
  const requestData = { ...req.query, ...bodyData };
  const { DOMAIN, AUTH_ID, REFRESH_ID, member_id, APP_SID } = requestData;

  // 5. Формируем HTML-ответ с ВСТРОЕННЫМИ авторизационными данными
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
            .success { color: #38a169; }
            .error { color: #e53e3e; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>✅ Тестовое приложение для Битрикс24</h1>
            
            <div class="status-box">
                <h3>Статус: <span id="statusText">Инициализация...</span></h3>
                <p id="statusDetails">Загрузка авторизационных данных</p>
                <p><small>Домен: ${DOMAIN || 'не указан'}</small></p>
            </div>
            
            <div>
                <button id="apiTestBtn" disabled>👤 Тест API Битрикс24</button>
                <button onclick="showAuthData()">🔑 Показать auth данные</button>
                <button onclick="location.reload()">🔄 Перезагрузить</button>
            </div>
            
            <div id="result">
                <p>Нажмите "Показать auth данные" для проверки</p>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #f0f8ff; border-radius: 6px; font-size: 14px;">
                <h4>Отладочная информация:</h4>
                <p><strong>Метод запроса:</strong> ${req.method}</p>
                <p><strong>Получено auth данных:</strong> ${AUTH_ID ? '✅ Да' : '❌ Нет'}</p>
                <p><strong>APP_SID:</strong> ${APP_SID || 'нет'}</p>
            </div>
        </div>

        <!-- Библиотека Битрикс24 -->
        <script src="//api.bitrix24.com/api/v1/"></script>
        
        <script>
            // КРИТИЧЕСКИ ВАЖНО: Передаем авторизационные данные в BX24
            const authData = {
                ${AUTH_ID ? `AUTH_ID: "${AUTH_ID}",` : ''}
                ${REFRESH_ID ? `REFRESH_ID: "${REFRESH_ID}",` : ''}
                ${member_id ? `member_id: "${member_id}",` : ''}
                ${DOMAIN ? `DOMAIN: "${DOMAIN}",` : ''}
                LANG: "ru"
            };
            
            console.log('🔐 Авторизационные данные:', authData);
            
            // Инициализация приложения с ПЕРЕДАННЫМИ данными
            BX24.init(function() {
                console.log('✅ Библиотека BX24 инициализирована');
                
                // Проверяем, есть ли доступ к API
                const currentAuth = BX24.getAuth();
                console.log('🔍 BX24.getAuth() вернул:', currentAuth);
                
                if (currentAuth && currentAuth.access_token) {
                    document.getElementById('statusText').innerHTML = '<span class="success">✅ Авторизован</span>';
                    document.getElementById('statusDetails').textContent = 'Готов к работе с API';
                    document.getElementById('apiTestBtn').disabled = false;
                } else {
                    document.getElementById('statusText').innerHTML = '<span class="error">⚠️ Нет доступа к API</span>';
                    document.getElementById('statusDetails').textContent = 'Авторизационные данные не получены';
                }
                
                BX24.setTitle('Тест AI чат');
            });
            
            // Активируем кнопку теста API
            document.getElementById('apiTestBtn').addEventListener('click', function() {
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = '<p>⏳ Запрашиваю данные пользователя через API...</p>';
                
                BX24.callMethod('user.current', {}, function(res) {
                    if(res.error()) {
                        console.error('Ошибка API:', res.error());
                        resultDiv.innerHTML = \`
                            <p class="error"><strong>❌ Ошибка API:</strong></p>
                            <pre>\${JSON.stringify(res.error(), null, 2)}</pre>
                            <p>Попробуйте перезагрузить приложение</p>
                        \`;
                    } else {
                        const user = res.data();
                        console.log('✅ Данные пользователя:', user);
                        resultDiv.innerHTML = \`
                            <p class="success"><strong>✅ Данные получены!</strong></p>
                            <p><strong>Имя:</strong> \${user.NAME} \${user.LAST_NAME}</p>
                            <p><strong>Email:</strong> \${user.EMAIL}</p>
                            <p><strong>Должность:</strong> \${user.WORK_POSITION || 'Не указана'}</p>
                            <p><small>ID: \${user.ID}</small></p>
                        \`;
                    }
                });
            });
            
            // Функция показа auth данных
            function showAuthData() {
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = \`
                    <p><strong>Авторизационные данные:</strong></p>
                    <pre>\${JSON.stringify(authData, null, 2)}</pre>
                    <p><strong>BX24.getAuth():</strong></p>
                    <pre>\${JSON.stringify(BX24.getAuth(), null, 2)}</pre>
                \`;
            }
        </script>
    </body>
    </html>
  `;

  return res.status(200).send(htmlResponse);
}
