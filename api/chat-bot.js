// Файл: /api/chat-bot.js
export default async function handler(req, res) {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ===================== ДЕТАЛЬНАЯ ДИАГНОСТИКА =====================
  console.log('=== 🔍 ДЕТАЛЬНЫЙ ЛОГ ЗАПРОСА ===');
  console.log('Метод:', req.method);
  console.log('URL:', req.url);
  console.log('Query params:', req.query);
  console.log('Заголовки:', JSON.stringify(req.headers));

  let rawBody = '';
  try {
    rawBody = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
    console.log('Сырое тело (rawBody):', rawBody);
  } catch (e) {
    console.error('Ошибка чтения тела:', e);
  }

  // Парсим тело как application/x-www-form-urlencoded
  const bodyParams = new URLSearchParams(rawBody);
  const body = Object.fromEntries(bodyParams);
  console.log('Распарсенное тело (body):', body);

  // Объединяем источники данных: query-параметры ИЛИ тело
  // Приоритет: query-параметры (обычно для GET), затем тело (для POST)
  const combinedParams = { ...req.query, ...body };
  console.log('Объединённые параметры (combinedParams):', combinedParams);
  console.log('=== 🔍 КОНЕЦ ЛОГА ===\n');

  const event = combinedParams.event;
  console.log(`📨 Определено событие: ${event}`);

  // ===================== ОБРАБОТКА GET (проверка работы) =====================
  if (req.method === 'GET') {
    return res.status(200).json({ 
      result: 'success', 
      message: 'Chat-bot handler is ready',
      debug: { event, hasAuth: !!combinedParams.auth, hasData: !!combinedParams.data }
    });
  }

  // ===================== ОБРАБОТКА СОБЫТИЙ =====================
  // 1. Установка приложения - ONAPPINSTALL
  if (event === 'ONAPPINSTALL') {
    console.log('🔄 Начинаем обработку ONAPPINSTALL');

    // Пытаемся извлечь авторизационные данные из различных возможных мест
    let auth = {};
    let installData = {};

    // Вариант 1: Параметр 'auth' как JSON-строка
    if (combinedParams.auth) {
      try {
        auth = JSON.parse(combinedParams.auth);
        console.log('✅ Авторизационные данные получены из combinedParams.auth');
      } catch (e) {
        console.warn('❌ Не удалось распарсить combinedParams.auth как JSON:', combinedParams.auth);
      }
    }

    // Вариант 2: Отдельные поля (возможный альтернативный формат)
    if (!auth.access_token && combinedParams.AUTH_ID) {
      auth = {
        access_token: combinedParams.AUTH_ID,
        refresh_token: combinedParams.REFRESH_ID,
        client_endpoint: combinedParams.AUTH['client_endpoint'] || `https://${combinedParams.DOMAIN}/rest/`,
        application_token: combinedParams.auth && typeof combinedParams.auth === 'string' ? combinedParams.auth : combinedParams.application_token
      };
      console.log('✅ Авторизационные данные собраны из отдельных полей');
    }

    // Вариант 3: Данные установки
    if (combinedParams.data) {
      try {
        installData = JSON.parse(combinedParams.data);
      } catch (e) {
        console.warn('Не удалось распарсить combinedParams.data');
      }
    }

    // Если auth данные отсутствуют - критическая ошибка
    if (!auth.access_token || !auth.client_endpoint) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: отсутствуют необходимые auth данные');
      console.error('   Доступные ключи в auth:', Object.keys(auth));
      console.error('   Все полученные параметры:', Object.keys(combinedParams));
      
      return res.status(400).json({ 
        error: 'Missing auth data', 
        details: 'Не получены авторизационные данные. Проверьте настройки приложения в Битрикс24.',
        debug: { 
          receivedAuthKeys: Object.keys(auth),
          allParamKeys: Object.keys(combinedParams) 
        }
      });
    }

    console.log('🔐 Auth данные для API:', {
      endpoint: auth.client_endpoint,
      hasToken: !!auth.access_token,
      tokenPreview: auth.access_token ? auth.access_token.substring(0, 20) + '...' : 'нет'
    });

    // Регистрация бота
    try {
      const handlerBackUrl = `https://${req.headers.host}${req.url}`;
      console.log(`🌐 Регистрируем бота, handler URL: ${handlerBackUrl}`);

      // Здесь будет вызов imbot.register, но пока просто логируем
      console.log('✅ Готовы вызвать imbot.register с данными:', {
        CODE: 'my_simple_bot',
        handlerBackUrl
      });

      // ВРЕМЕННО: возвращаем успех без реального вызова API
      return res.status(200).json({ 
        result: 'success', 
        message: 'Bot registration simulated successfully',
        note: 'Реальная регистрация отключена для диагностики. Следующий шаг - включить вызов API.',
        debug: {
          authDataReceived: !!auth.access_token,
          dataReceived: !!installData,
          handlerUrl: handlerBackUrl
        }
      });

    } catch (apiError) {
      console.error('❌ Ошибка регистрации бота:', apiError);
      return res.status(500).json({ 
        error: 'Bot registration failed', 
        details: apiError.message 
      });
    }
  }

  // 2. Другие события - временный заглушки
  if (event === 'ONIMBOTMESSAGEADD') {
    console.log('💬 Получено сообщение (заглушка)');
    return res.status(200).json({ result: 'message received' });
  }

  // Если событие не распознано
  console.log(`⚠️ Необработанное событие: ${event}`);
  return res.status(200).json({ 
    result: 'unknown event', 
    event: event 
  });
}
