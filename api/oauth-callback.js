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
    
    // 4. КРИТИЧЕСКИ ВАЖНО: Проверяем, если это запрос интерфейса
    // Битрикс24 при открытии iframe отправляет GET без code
    const { code, DOMAIN, APP_SID } = { ...req.query, ...req.body };
    
    if (!code && DOMAIN && APP_SID) {
        // Это запрос на загрузку интерфейса приложения
        console.log('🖼️ Возвращаем HTML интерфейс для iframe');
        return res.status(200).setHeader('Content-Type', 'text/html').send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Мой AI-помощник</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        button { padding: 12px 24px; margin: 10px; font-size: 16px; cursor: pointer; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .info { background: #d1ecf1; color: #0c5460; }
    </style>
</head>
<body>
    <h1>🧠 Мой AI-помощник в Битрикс24</h1>
    
    <div class="status info" id="status">Инициализация...</div>
    
    <button onclick="checkAuth()" id="authBtn">🔐 Проверить авторизацию</button>
    <button onclick="callAPI()" id="apiBtn" disabled>🧪 Тест API Битрикс24</button>
    
    <div id="result" style="margin-top: 20px;"></div>
    
    <script src="//api.bitrix24.com/api/v1/"></script>
    <script>
        const statusEl = document.getElementById('status');
        const resultEl = document.getElementById('result');
        
        function log(message, type = 'info') {
            const div = document.createElement('div');
            div.className = \`status \${type}\`;
            div.innerHTML = message;
            resultEl.appendChild(div);
            console.log(message);
        }
        
        // Инициализация
        BX24.init(function() {
            statusEl.textContent = '✅ Библиотека BX24 загружена';
            log('Приложение инициализировано в iframe Битрикс24');
            
            // Проверяем авторизацию
            const auth = BX24.getAuth();
            if (auth && auth.access_token) {
                log(\`✅ Уже авторизован<br>Домен: \${auth.domain}<br>Токен: \${auth.access_token.substring(0, 20)}...\`, 'success');
                document.getElementById('apiBtn').disabled = false;
            } else {
                log('⚠️ Требуется авторизация', 'info');
            }
        });
        
        function checkAuth() {
            log('Проверяем авторизацию...');
            const auth = BX24.getAuth();
            
            if (!auth) {
                log('Токена нет. Запрашиваем авторизацию...', 'info');
                BX24.refreshAuth(function(newAuth) {
                    if (newAuth && newAuth.access_token) {
                        log(\`✅ Авторизация успешна!<br>Токен получен: \${newAuth.access_token.substring(0, 20)}...\`, 'success');
                        document.getElementById('apiBtn').disabled = false;
                    } else {
                        log('❌ Ошибка авторизации', 'error');
                    }
                });
            } else {
                log(\`✅ Токен уже есть: \${auth.access_token.substring(0, 20)}...\`, 'success');
                document.getElementById('apiBtn').disabled = false;
            }
        }
        
        function callAPI() {
            log('Выполняем запрос к API Битрикс24...');
            
            BX24.callMethod('user.current', {}, function(res) {
                if (res.error()) {
                    log(\`❌ Ошибка API: \${res.error().error_description}\`, 'error');
                } else {
                    const user = res.data();
                    log(\`
                        ✅ API работает!<br>
                        <strong>Имя:</strong> \${user.NAME || ''} \${user.LAST_NAME || ''}<br>
                        <strong>Email:</strong> \${user.EMAIL || 'не указан'}<br>
                        <strong>ID:</strong> \${user.ID}<br><br>
                        🎉 <strong>Связка Битрикс24 ↔ Vercel работает!</strong>
                    \`, 'success');
                }
            });
        }
    </script>
</body>
</html>
        `);
    }
    
    // 5. Обработка OAuth-запросов (POST с code)
    if (req.method === 'POST' && code && DOMAIN) {
        console.log(`🔄 OAuth запрос для домена: ${DOMAIN}`);
        
        try {
            const CLIENT_ID = process.env.B24_CLIENT_ID;
            const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;
            
            if (!CLIENT_ID || !CLIENT_SECRET) {
                throw new Error('Не заданы B24_CLIENT_ID или B24_CLIENT_SECRET в настройках Vercel');
            }
            
            // Обмен code на токен
            const tokenUrl = `https://${DOMAIN}/oauth/token/`;
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
            
            if (tokenData.error) {
                console.error('❌ Ошибка OAuth:', tokenData);
                return res.status(400).json({ 
                    result: 'error', 
                    error: tokenData.error_description || tokenData.error 
                });
            }
            
            console.log('✅ Токены получены');
            return res.status(200).json({
                result: 'success',
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                domain: DOMAIN
            });
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            return res.status(500).json({ 
                result: 'error', 
                error: error.message 
            });
        }
    }
    
    // 6. Для всех остальных случаев
    return res.status(200).json({
        result: 'success',
        message: 'Обработчик работает',
        mode: 'general',
        domain: DOMAIN,
        app_sid: APP_SID
    });
}
