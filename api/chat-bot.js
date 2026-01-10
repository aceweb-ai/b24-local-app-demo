// Файл: /api/chat-bot.js
// ПОЛНЫЙ рабочий код чат-бота для открытой линии Битрикс24

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

  // Извлекаем event и базовые данные
  const event = body.event;
  
  // ИЗВЛЕКАЕМ AUTH ДАННЫЕ (правильно парсим PHP-стиль)
  const authData = {};
  Object.keys(body).forEach(key => {
    if (key.startsWith('auth[')) {
      const match = key.match(/auth\[([^\]]+)\]/);
      if (match) authData[match[1]] = body[key];
    }
  });

  console.log(`🔍 Событие: ${event}`);
  console.log('🔐 Auth данные:', Object.keys(authData));

  // === 1. ОБРАБОТКА УСТАНОВКИ ПРИЛОЖЕНИЯ (ONAPPINSTALL) ===
  if (event === 'ONAPPINSTALL') {
    console.log('🔄 Начинаем регистрацию бота...');

    // Проверяем обязательные поля
    if (!authData.access_token || !authData.client_endpoint) {
      console.error('❌ Нет токена или endpoint:', authData);
      return res.status(400).json({ error: 'Missing auth data' });
    }

    try {
      // Формируем URL для обработчика
      const handlerBackUrl = `https://${req.headers.host}${req.url}`;
      console.log(`🌐 URL обработчика: ${handlerBackUrl}`);

      // Регистрируем бота через API Битрикс24
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

  // === 2. ОБРАБОТКА ПРИСОЕДИНЕНИЯ ПОЛЬЗОВАТЕЛЯ К ЧАТУ ===
  if (event === 'ONIMBOTJOINCHAT') {
    console.log('👋 Пользователь присоединился к чату');
    
    // ИЗВЛЕКАЕМ ДАННЫЕ ДЛЯ ЭТОГО СОБЫТИЯ
    const joinData = {};
    Object.keys(body).forEach(key => {
      if (key.startsWith('data[')) {
        const match = key.match(/data\[([^\]]+)\]/);
        if (match) joinData[match[1]] = body[key];
      }
    });
    
    console.log('📊 Данные присоединения:', joinData);
    
    // Можно отправить приветственное сообщение
    // const dialogId = joinData['PARAMS[DIALOG_ID]'];
    // if (dialogId && authData.access_token) {
    //   await callBitrixApi('imbot.message.add', {
    //     DIALOG_ID: dialogId,
    //     MESSAGE: 'Добро пожаловать! Чем могу помочь?'
    //   }, authData);
    // }
    
    return res.status(200).end();
  }

  // === 3. ОБРАБОТКА НОВЫХ СООБЩЕНИЙ ОТ ПОЛЬЗОВАТЕЛЕЙ ===
  if (event === 'ONIMBOTMESSAGEADD') {
    console.log('💬 Получено новое сообщение от пользователя');
    
    // ИЗВЛЕКАЕМ ВЛОЖЕННЫЕ ПАРАМЕТРЫ data[PARAMS][...]
    const messageParams = {};
    Object.keys(body).forEach(key => {
      // Ищем ключи вида data[PARAMS][DIALOG_ID], data[PARAMS][MESSAGE] и т.д.
      const match = key.match(/data\[PARAMS\]\[([^\]]+)\]/);
      if (match) {
        messageParams[match[1]] = body[key];
      }
    });
    
    console.log('📩 Параметры сообщения:', messageParams);
    
    const dialogId = messageParams.DIALOG_ID;
    const message = messageParams.MESSAGE;
    const chatEntityType = messageParams.CHAT_ENTITY_TYPE;
    
    // Работаем только с открытыми линиями
    if (chatEntityType !== 'LINES') {
      console.log('⚠️ Игнорируем сообщение не из открытой линии');
      return res.status(200).end();
    }
    
    if (!dialogId || !message) {
      console.error('❌ Не удалось извлечь DIALOG_ID или MESSAGE');
      return res.status(200).end(); // Всегда отвечаем 200 OK Битрикс24
    }
    
    console.log(`📩 Диалог: ${dialogId}, Сообщение: "${message}"`);
    
    try {
      // ОТПРАВЛЯЕМ ОТВЕТ ПОЛЬЗОВАТЕЛЮ
      const botReply = `Вы написали: "${message}". Это тестовый ответ бота.`;
      
      await callBitrixApi('imbot.message.add', {
        DIALOG_ID: dialogId,
        MESSAGE: botReply
      }, authData);
      
      console.log(`✅ Ответ отправлен в диалог ${dialogId}`);
      
    } catch (error) {
      console.error('❌ Ошибка отправки ответа:', error);
    }
    
    return res.status(200).end();
  }

  // === 4. ДЛЯ ВСЕХ ОСТАЛЬНЫХ СОБЫТИЙ ===
  console.log(`ℹ️ Необрабатываемое событие: ${event}`);
  return res.status(200).json({ result: 'ok', event: event });
}

// ===================== ФУНКЦИЯ ДЛЯ ВЫЗОВА API БИТРИКС24 =====================
async function callBitrixApi(method, params, auth) {
  const queryUrl = `${auth.client_endpoint}${method}`;
  
  // Создаём FormData-подобную структуру
  const formData = new URLSearchParams();
  formData.append('auth', auth.access_token);
  
  // Рекурсивно добавляем параметры с поддержкой вложенных объектов
  function appendParam(key, value, prefix = '') {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    
    if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        appendParam(subKey, subValue, fullKey);
      });
    } else {
      formData.append(fullKey, String(value));
    }
  }
  
  Object.entries(params).forEach(([key, value]) => {
    appendParam(key, value);
  });
  
  console.log(`🌐 Вызов API: ${method} на ${auth.client_endpoint}`);

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
