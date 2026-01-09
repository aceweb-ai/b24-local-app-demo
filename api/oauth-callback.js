// Файл: /api/oauth-callback.js
// Полноценный OAuth-обработчик для Битрикс24 (рабочая версия)

export default async function handler(req, res) {
  // 1. Настраиваем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Обработка предварительного запроса OPTIONS
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Preflight request');
    return res.status(200).end();
  }

  // 3. Обрабатываем POST-запросы
  if (req.method === 'POST') {
    try {
      console.log('📨 [MAIN] Получен POST запрос от Битрикс24');
      
      // ВАЖНО: Битрикс24 может отправлять данные в теле (req.body) или в query (req.query)
      // Логируем всё для диагностики
      const requestData = {
        body: req.body,
        query: req.query,
        headers: req.headers
      };
      console.log('📦 Полные данные запроса:', JSON.stringify(requestData, null, 2));

      // 4. Извлекаем данные. Судя по логам, данные приходят в req.query
      const { DOMAIN, PROTOCOL, LANG, APP_SID, code, event } = { ...req.body, ...req.query };

      console.log(`🔍 Извлечённые параметры:`, { DOMAIN, code, event, APP_SID });

      // 5. Если есть код (code) — это запрос на OAuth авторизацию
      if (code && DOMAIN) {
        console.log(`🔄 Начинаем OAuth обмен для домена: ${DOMAIN}, код: ${code.substring(0, 10)}...`);

        // 6. Используем переменные окружения
        const CLIENT_ID = process.env.B24_CLIENT_ID;
        const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;
        
        if (!CLIENT_ID || !CLIENT_SECRET) {
          console.error('❌ Ошибка: B24_CLIENT_ID или B24_CLIENT_SECRET не заданы в Environment Variables Vercel!');
          return res.status(500).json({ 
            error: 'Server configuration error',
            message: 'Check environment variables in Vercel settings' 
          });
        }

        // 7. ОБМЕН КОДА НА ТОКЕН
        const tokenUrl = `https://${DOMAIN}/oauth/token/`;
        console.log(`🔄 Отправляем запрос на: ${tokenUrl}`);
        
        const requestBody = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: code,
        });

        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Vercel-Serverless-Function' 
          },
          body: requestBody,
        });

        const tokenData = await tokenResponse.json();
        console.log('🔐 Ответ от OAuth сервера:', tokenData);
        
        if (tokenData.error) {
          console.error('❌ Ошибка OAuth:', tokenData.error_description || tokenData.error);
          return res.status(400).json({ 
            error: 'OAuth exchange failed',
            details: tokenData 
          });
        }

        // 8. УСПЕХ
        console.log('✅ Токены успешно получены!');
        return res.status(200).json({
          result: 'success',
          message: 'Приложение авторизовано',
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in,
          domain: DOMAIN
        });

      } 
      // 9. Если это не OAuth, а инициализация приложения (данные из логов)
      else if (DOMAIN && APP_SID) {
        console.log(`🏁 Инициализация приложения для домена: ${DOMAIN}, APP_SID: ${APP_SID}`);
        
        // Отвечаем, что готовы к работе
        return res.status(200).json({
          result: 'success',
          message: 'Application handler is ready',
          mode: 'initialization',
          domain: DOMAIN,
          app_sid: APP_SID,
          next_step: 'OAuth authorization required'
        });
      }
      else {
        // Неизвестный формат запроса
        console.warn('⚠️ Неизвестный формат POST-запроса');
        return res.status(400).json({ 
          error: 'Invalid request format',
          received_data: { DOMAIN, code, event, APP_SID } 
        });
      }

    } catch (error) {
      console.error('❌ Критическая ошибка в обработчике:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // 10. Все остальные методы (GET, PUT, DELETE и т.д.)
  console.warn(`🚫 Метод ${req.method} не разрешён`);
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    allowed: ['POST', 'OPTIONS'],
    message: 'Этот endpoint принимает только POST запросы от Битрикс24'
  });
}
