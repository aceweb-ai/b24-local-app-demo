// Файл: /api/chat-bot.js
// РАБОЧИЙ код для регистрации чат-бота

export default async function handler(req, res) {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Читаем тело запроса
  let rawBody = '';
  try {
    rawBody = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
  } catch (e) {
    console.error('Ошибка чтения тела:', e);
    return res.status(400).json({ error: 'Bad Request' });
  }

  console.log('📨 Получен запрос. Длина тела:', rawBody.length);

  // Парсим application/x-www-form-urlencoded
  const params = new URLSearchParams(rawBody);
  const body = Object.fromEntries(params);

  // Преобразуем PHP-стиль массивов в объекты
  const event = body.event;
  
  // Извлекаем auth данные
  const authData = {};
  const dataObj = {};
  
  Object.keys(body).forEach(key => {
    if (key.startsWith('auth[')) {
      const match = key.match(/auth\[([^\]]+)\]/);
      if (match) authData[match[1]] = body[key];
    } else if (key.startsWith('data[')) {
      const match = key.match(/data\[([^\]]+)\]/);
      if (match) dataObj[match[1]] = body[key];
    }
  });

  console.log(`🔍 Событие: ${event}`);
  console.log('🔐 Auth данные:', Object.keys(authData));
  console.log('📊 Data данные:', dataObj);

  // ОБРАБОТКА ONAPPINSTALL
  if (event === 'ONAPPINSTALL') {
    console.log('🔄 Начинаем регистрацию бота...');

    // Проверяем обязательные поля
    if (!authData.access_token || !authData.client_endpoint) {
      console.error('❌ Нет токена или endpoint:', authData);
      return res.status(400).json({ error: 'Missing auth data' });
    }

    try {
      // 1. Формируем URL для обработчика
      const handlerBackUrl = `https://${req.headers.host}${req.url}`;
      console.log(`🌐 URL обработчика: ${handlerBackUrl}`);

// 2. Регистрируем бота через API Битрикс24 с ПРАВИЛЬНОЙ структурой
const registerResult = await callBitrixApi('imbot.register', {
  CODE: 'ai_site_helper',
  TYPE: 'O', // Бот для открытых линий
  EVENT_MESSAGE_ADD: handlerBackUrl,
  EVENT_WELCOME_MESSAGE: handlerBackUrl,
  EVENT_BOT_DELETE: handlerBackUrl,
  OPENLINE: 'Y',
  PROPERTIES: {
    NAME: 'AI Помощник для сайта',
    COLOR: 'GREEN',
    WORK_POSITION: 'Отвечает на вопросы посетителей сайта'
  }
}, authData);

      const botId = registerResult.result;
      console.log(`✅ Бот зарегистрирован! ID: ${botId}`);

      // 3. Сохраняем ID бота (в реальном проекте - в БД)
      // Пока просто возвращаем успех

      return res.status(200).json({
        result: 'success',
        botId: botId,
        message: 'Chat-bot registered successfully'
      });

    } catch (error) {
      console.error('❌ Ошибка регистрации бота:', error);
      return res.status(500).json({
        error: 'Bot registration failed',
        details: error.message
      });
    }
  }

  // Для других событий пока просто отвечаем OK
  return res.status(200).json({ result: 'ok', event: event });
}

// Улучшенная функция для вызова API Битрикс24
async function callBitrixApi(method, params, auth) {
  const queryUrl = `${auth.client_endpoint}${method}`;
  
  // Создаём FormData-подобную структуру для PHP-стиля массивов
  const formData = new URLSearchParams();
  formData.append('auth', auth.access_token);
  
  // Рекурсивно добавляем параметры с поддержкой вложенных объектов
  function appendParam(key, value, prefix = '') {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    
    if (typeof value === 'object' && value !== null) {
      // Рекурсивно обрабатываем вложенные объекты
      Object.entries(value).forEach(([subKey, subValue]) => {
        appendParam(subKey, subValue, fullKey);
      });
    } else {
      formData.append(fullKey, String(value));
    }
  }
  
  // Добавляем все параметры
  Object.entries(params).forEach(([key, value]) => {
    appendParam(key, value);
  });
  
  console.log(`🌐 Вызов API: ${method} на ${auth.client_endpoint}`);
  console.log(`📤 Параметры (первые 500 символов): ${formData.toString().substring(0, 500)}...`);

  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  const result = await response.json();
  
  if (result.error) {
    console.error(`❌ Ошибка API ${method}:`, result);
    throw new Error(result.error_description || result.error);
  }

  return result;
}
