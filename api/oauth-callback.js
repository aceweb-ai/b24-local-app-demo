// Файл: /api/oauth-callback.js
// Полноценный OAuth-обработчик для Битрикс24

export default async function handler(req, res) {
  // 1. Настраиваем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Обработка предварительного запроса OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Обрабатываем ТОЛЬКО POST-запросы (которые присылает Битрикс24)
  if (req.method === 'POST') {
    try {
      console.log('📨 Получен POST от Битрикс24');
      
      // 4. Парсим данные из запроса
      const { event, data } = req.body;
      console.log('Event:', event, 'Data:', data);

      // 5. Проверяем, что это запрос на авторизацию
      if (event === 'ONAPPINSTALL' || data?.code) {
        const authCode = data.code;
        const domain = data.domain || req.headers['referer']?.match(/https?:\/\/([^\/]+)/)?.[1];
        
        console.log(`🔄 Начинаем OAuth обмен для домена: ${domain}`);

        // 6. ОБМЕН КОДА НА ТОКЕН (самое важное!)
        // Получите client_id и client_secret из настроек приложения в Битрикс24
        const CLIENT_ID = process.env.B24_CLIENT_ID;     // Хранить в переменных окружения Vercel!
        const CLIENT_SECRET = process.env.B24_CLIENT_SECRET; // Хранить в переменных окружения Vercel!
        
        if (!CLIENT_ID || !CLIENT_SECRET) {
          console.error('❌ Не заданы CLIENT_ID или CLIENT_SECRET');
          return res.status(500).json({ error: 'Server configuration error' });
        }

        // Формируем запрос для обмена кода на токен
        const tokenResponse = await fetch(`https://${domain}/oauth/token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: authCode,
          }),
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          console.error('❌ Ошибка OAuth:', tokenData);
          return res.status(400).json({ error: 'OAuth exchange failed', details: tokenData });
        }

        console.log('✅ Токены получены:', {
          access_token: tokenData.access_token?.substring(0, 20) + '...',
          expires_in: tokenData.expires_in,
        });

        // 7. Возвращаем успешный ответ
        return res.status(200).json({
          result: 'success',
          message: 'Приложение успешно авторизовано',
          // В реальном приложении токены нужно сохранить в БД
          // и связать с пользователем/доменом
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
        });

      } else {
        // Это другой тип события (например, обновление приложения)
        console.log('📋 Другое событие:', event);
        return res.status(200).json({
          result: 'success',
          message: 'Событие обработано',
          event: event,
        });
      }

    } catch (error) {
      console.error('❌ Ошибка в обработчике:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        details: error.message 
      });
    }
  }

  // 8. Для GET и других методов возвращаем ошибку
  return res.status(405).json({ 
    error: 'Method Not Allowed',
    allowed: ['POST', 'OPTIONS'] 
  });
}
