// Файл: /api/oauth-callback.js
// Универсальный обработчик для запросов от Битрикс24
export default async function handler(req, res) {
  // 1. Настраиваем CORS для всех типов запросов
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Обработка предварительного OPTIONS-запроса
  if (req.method === 'OPTIONS') {
    console.log('🔧 [Preflight] OPTIONS request received');
    return res.status(200).end();
  }

  // 3. Логируем ВСЕ входящие запросы для диагностики
  console.log(`📨 [Request] Метод: ${req.method}, Query:`, req.query, 'Body:', req.body);

  // 4. ОБРАБОТКА GET-ЗАПРОСОВ (OAuth авторизация)
  if (req.method === 'GET') {
    const { code, domain } = req.query;

    if (code && domain) {
      console.log(`✅ [OAuth] Получен код авторизации для домена ${domain}`);
      // Здесь будет обмен code на токены (пока просто отвечаем)
      return res.status(200).send(`
        <!DOCTYPE html>
        <html><head><title>Успех</title><meta charset="utf-8"></head>
        <body style="font-family: sans-serif; padding: 20px;">
          <h2>✅ Авторизация прошла успешно!</h2>
          <p>Приложение получило доступ. Закройте эту вкладку.</p>
        </body></html>
      `);
    } else {
      // GET-запрос без параметров OAuth (простая проверка доступности)
      console.log('🔍 [GET] Проверка доступности обработчика');
      return res.status(200).json({ 
        status: 'handler_is_ready', 
        message: 'OAuth-обработчик работает и готов принимать запросы.',
        supported_methods: ['GET', 'POST', 'OPTIONS'] 
      });
    }
  }

  // 5. ОБРАБОТКА POST-ЗАПРОСОВ (Данные от Битрикс24 при запуске)
  if (req.method === 'POST') {
    try {
      const data = req.body;
      console.log('📝 [POST] Данные от Битрикс24:', data);

      // Типичные поля, которые Битрикс24 может отправлять при запуске приложения
      // В реальном приложении здесь будет логика инициализации
      return res.status(200).json({
        result: 'success',
        message: 'Приложение успешно инициализировано с данными от Битрикс24',
        received_data: data,
        next_step: 'Вернитесь в интерфейс приложения'
      });

    } catch (error) {
      console.error('❌ [POST] Ошибка обработки:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // 6. Если метод не GET, POST или OPTIONS
  console.warn(`⚠️ [Rejected] Метод ${req.method} не поддерживается`);
  return res.status(405).json({ 
    error: 'Method Not Allowed', 
    allowed: ['GET', 'POST', 'OPTIONS'] 
  });
}
