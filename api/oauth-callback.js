// Файл: /api/oauth-callback.js
// Универсальный обработчик для серверного приложения Битрикс24

export default async function handler(req, res) {
    // 1. Настраиваем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 2. Обработка OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // 3. Логируем для диагностики
    console.log(`📨 [${req.method}] Запрос от Битрикс24`);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    
    // 4. Извлекаем данные (и из query, и из body)
    const { 
        code, 
        DOMAIN, 
        APP_SID,
        AUTH_ID,
        REFRESH_ID,
        PLACEMENT
    } = { ...req.query, ...req.body };
    
    console.log('🔍 Извлечённые параметры:', { code, DOMAIN, APP_SID, AUTH_ID, PLACEMENT });
    
    // 5. КРИТИЧЕСКИ ВАЖНО: Если есть AUTH_ID но нет code - это запрос интерфейса
    // Битрикс24 при открытии iframe отправляет POST с AUTH_ID в теле
    if (AUTH_ID && !code && DOMAIN && APP_SID) {
        console.log('🖼️ Это запрос интерфейса приложения (есть AUTH_ID, нет code)');
        console.log('Возвращаем HTML интерфейс для iframe');
        
        // Возвращаем HTML фронтенда
        return res.status(200).setHeader('Content-Type', 'text/html').send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Мой AI-помощник</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            color: #333;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
            font-size: 28px;
        }
        .status-box {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            font-size: 16px;
        }
        .success { background: #e8f5e9; border-color: #4caf50; }
        .error { background: #ffebee; border-color: #f44336; }
        .info { background: #e3f2fd; border-color: #2196f3; }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 16px;
            border-radius: 50px;
            cursor: pointer;
            margin: 10px;
            transition: transform 0.2s, box-shadow 0.2s;
            font-weight: 600;
            width: 100%;
            max-width: 300px;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .button-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            margin: 30px 0;
        }
        #result {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            min-height: 100px;
        }
        .result-item {
            padding: 10px;
            margin: 10px 0;
            background: white;
            border-radius: 5px;
            border-left: 4px solid #4caf50;
        }
        .loader {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 Мой AI-помощник в Битрикс24</h1>
        
        <div class="status-box info" id="status">
            <div class="loader"></div>
            <div style="text-align: center; margin-top: 10px;">Инициализация приложения...</div>
        </div>
        
        <div class="button-group">
            <button onclick="checkAuth()" id="authBtn">
                🔐 Проверить авторизацию
            </button>
            <button onclick="callAPI()" id="apiBtn" disabled>
                🧪 Тест API Битрикс24
            </button>
        </div>
        
        <div id="result"></div>
    </div>
    
    <script src="//api.bitrix24.com/api/v1/"></script>
    <script>
        const statusEl = document.getElementById('status');
        const resultEl = document.getElementById('result');
        const authBtn = document.getElementById('authBtn');
        const apiBtn = document.getElementById('apiBtn');
        
        function updateStatus(message, type = 'info') {
            statusEl.innerHTML = \`
                <div style="color: \${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'}">
                    \${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} \${message}
                </div>
            \`;
            statusEl.className = \`status-box \${type}\`;
        }
        
        function addResult(message, type = 'info') {
            const div = document.createElement('div');
            div.className = \`result-item \${type}\`;
            div.innerHTML = \`
                <div style="color: \${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'}">
                    \${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} \${message}
                </div>
            \`;
            resultEl.appendChild(div);
            console.log(\`[\${type}] \${message}\`);
        }
        
        // Инициализация
        BX24.init(function() {
            updateStatus('Библиотека BX24 загружена', 'success');
            addResult('Приложение инициализировано в iframe Битрикс24');
            
            // Проверяем авторизацию
            const auth = BX24.getAuth();
            console.log('Auth data from BX24:', auth);
            
            if (auth && auth.access_token) {
                addResult(\`✅ Уже авторизован<br>Домен: \${auth.domain}\`, 'success');
                apiBtn.disabled = false;
                authBtn.textContent = '✅ Уже авторизовано';
                authBtn.disabled = true;
            } else {
                addResult('ℹ️ Требуется авторизация');
            }
        });
        
        function checkAuth() {
            updateStatus('Проверяем авторизацию...');
            addResult('Запрос авторизации...');
            
            const auth = BX24.getAuth();
            
            if (!auth || !auth.access_token) {
                addResult('Токена нет. Запрашиваем авторизацию...');
                authBtn.disabled = true;
                authBtn.textContent = '⏳ Запрашиваем доступ...';
                
                BX24.refreshAuth(function(newAuth) {
                    if (newAuth && newAuth.access_token) {
                        updateStatus(\`✅ Авторизация успешна!\`, 'success');
                        addResult(\`Токен получен: \${newAuth.access_token.substring(0, 25)}...\`, 'success');
                        apiBtn.disabled = false;
                        authBtn.textContent = '✅ Уже авторизовано';
                    } else {
                        updateStatus('❌ Ошибка авторизации', 'error');
                        addResult('Не удалось получить авторизацию', 'error');
                        authBtn.disabled = false;
                        authBtn.textContent = '🔐 Повторить авторизацию';
                    }
                });
            } else {
                addResult(\`✅ Токен уже есть: \${auth.access_token.substring(0, 20)}...\`, 'success');
                apiBtn.disabled = false;
                authBtn.textContent = '✅ Уже авторизовано';
                authBtn.disabled = true;
            }
        }
        
        function callAPI() {
            updateStatus('Выполняем запрос к API Битрикс24...');
            addResult('Запрос данных пользователя...');
            apiBtn.disabled = true;
            apiBtn.textContent = '⏳ Запрашиваем данные...';
            
            BX24.callMethod('user.current', {}, function(res) {
                if (res.error()) {
                    updateStatus(\`❌ Ошибка API\`, 'error');
                    addResult(\`Ошибка: \${res.error().error_description}\`, 'error');
                    apiBtn.disabled = false;
                    apiBtn.textContent = '🧪 Тест API Битрикс24';
                } else {
                    const user = res.data();
                    updateStatus(\`✅ API работает!\`, 'success');
                    addResult(\`
                        <strong>👤 Пользователь:</strong> \${user.NAME || ''} \${user.LAST_NAME || ''}<br>
                        <strong>📧 Email:</strong> \${user.EMAIL || 'не указан'}<br>
                        <strong>🆔 ID:</strong> \${user.ID}
                    \`, 'success');
                    
                    // Особый результат
                    const successDiv = document.createElement('div');
                    successDiv.className = 'result-item success';
                    successDiv.innerHTML = \`
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 24px; margin-bottom: 10px;">🎉</div>
                            <div style="font-size: 18px; font-weight: bold; color: #4caf50; margin-bottom: 10px;">
                                Связка Битрикс24 ↔ Vercel работает!
                            </div>
                            <div>Теперь можно интегрировать AI (Chutes)</div>
                        </div>
                    \`;
                    resultEl.appendChild(successDiv);
                    
                    apiBtn.disabled = false;
                    apiBtn.textContent = '🧪 Тест API Битрикс24';
                }
            });
        }
        
        // Автоматически проверяем авторизацию при загрузке
        setTimeout(() => {
            const auth = BX24.getAuth();
            if (!auth || !auth.access_token) {
                addResult('Нажмите "Проверить авторизацию" для начала работы');
            }
        }, 1000);
    </script>
</body>
</html>
        `);
    }
    
    // 6. Обработка OAuth-запросов (POST с code)
    if (req.method === 'POST' && code && DOMAIN) {
        console.log(`🔄 OAuth запрос для домена: ${DOMAIN} с code: ${code.substring(0, 15)}...`);
        
        try {
            const CLIENT_ID = process.env.B24_CLIENT_ID;
            const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;
            
            if (!CLIENT_ID || !CLIENT_SECRET) {
                throw new Error('Не заданы B24_CLIENT_ID или B24_CLIENT_SECRET в настройках Vercel');
            }
            
            // Обмен code на токен
            const tokenUrl = `https://${DOMAIN}/oauth/token/`;
            console.log(`Отправляем запрос на: ${tokenUrl}`);
            
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    code: code,
                }),
            });
            
            const tokenData = await response.json();
            console.log('Ответ от OAuth сервера:', tokenData);
            
            if (tokenData.error) {
                console.error('❌ Ошибка OAuth:', tokenData);
                return res.status(400).json({ 
                    result: 'error', 
                    error: tokenData.error_description || tokenData.error 
                });
            }
            
            console.log('✅ Токены получены успешно');
            return res.status(200).json({
                result: 'success',
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                domain: DOMAIN
            });
            
        } catch (error) {
            console.error('❌ Ошибка в OAuth обработке:', error);
            return res.status(500).json({ 
                result: 'error', 
                error: error.message 
            });
        }
    }
    
    // 7. Для всех остальных случаев (резервный ответ)
    console.log('📋 Стандартный ответ (нет AUTH_ID или code)');
    return res.status(200).json({
        result: 'success',
        message: 'Application handler is ready',
        mode: 'initialization',
        domain: DOMAIN,
        app_sid: APP_SID,
        next_step: 'OAuth authorization required'
    });
}
