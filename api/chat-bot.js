// Файл: /api/chat-bot.js
// РАБОЧИЙ код для чат-бота с AI-интеграцией

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
  console.log('🔐 Auth данные (ключи):', Object.keys(authData));

  // ОБРАБОТКА ONAPPINSTALL
  if (event === 'ONAPPINSTALL') {
    console.log('🔄 Начинаем регистрацию чат-бота...');

    if (!authData.access_token || !authData.client_endpoint) {
      console.error('❌ Нет токена или endpoint:', authData);
      return res.status(400).json({ error: 'Missing auth data' });
    }

    try {
      const handlerBackUrl = `https://${req.headers.host}${req.url}`;
      console.log(`🌐 URL обработчика: ${handlerBackUrl}`);

      // Регистрируем бота
      const registerResult = await callBitrixApi('imbot.register', {
        CODE: 'ai_site_helper',
        TYPE: 'O',
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
      console.log(`✅ Чат-бот зарегистрирован! ID: ${botId}`);

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

  // ОБРАБОТКА СООБЩЕНИЙ ОТ ПОЛЬЗОВАТЕЛЯ
  if (event === 'ONIMBOTMESSAGEADD') {
    console.log('💬 Получено новое сообщение от пользователя');
    console.log('📊 Data данные:', dataObj);

    // Извлекаем данные из вложенной структуры data[PARAMS][...]
    const dialogId = dataObj['PARAMS[DIALOG_ID]'] || dataObj.PARAMS?.DIALOG_ID;
    const messageText = dataObj['PARAMS[MESSAGE]'] || dataObj.PARAMS?.MESSAGE;
    const chatEntityType = dataObj['PARAMS[CHAT_ENTITY_TYPE]'] || dataObj.PARAMS?.CHAT_ENTITY_TYPE;

    // Работаем только с открытыми линиями
    if (chatEntityType !== 'LINES') {
      console.log('⚠️ Сообщение не из открытой линии, игнорируем');
      return res.status(200).end();
    }

    if (!dialogId || !messageText) {
      console.error('❌ Нет DIALOG_ID или MESSAGE в данных:', { dialogId, messageText });
      return res.status(200).end(); // Всегда 200 OK для Битрикс24
    }

    console.log(`👤 Диалог: ${dialogId}, Сообщение: "${messageText}"`);

    try {
      // 1. ЗАПРОС К AI (Chutes)
      console.log('🤖 Отправляю запрос к AI...');
      let aiReply;
      
      try {
        // Если есть настроенный AI endpoint
        if (process.env.CHUTES_API_URL) {
          const aiResponse = await fetch(process.env.CHUTES_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              question: messageText,
              context: 'Вопрос от посетителя сайта через чат виджет' 
            }),
          });
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiReply = aiData.answer || aiData.response || aiData.text || 'AI обработал запрос';
          } else {
            throw new Error(`AI сервис вернул ошибку: ${aiResponse.status}`);
          }
        } else {
          // Если AI не настроен - тестовый ответ
          aiReply = `Вы написали: "${messageText}". Это тестовый ответ от бота. AI будет подключен позже.`;
        }
      } catch (aiError) {
        console.error('❌ Ошибка AI:', aiError);
        aiReply = `Извините, в данный момент AI-сервис недоступен. Ваш вопрос: "${messageText}"`;
      }

      // 2. ОТПРАВКА ОТВЕТА В БИТРИКС24
      console.log(`📤 Отправляю ответ в диалог ${dialogId}:`, aiReply.substring(0, 100) + '...');
      
      await callBitrixApi('imbot.message.add', {
        DIALOG_ID: dialogId,
        MESSAGE: aiReply
      }, authData);

      console.log(`✅ Ответ успешно отправлен в диалог ${dialogId}`);

    } catch (error) {
      console.error('❌ Ошибка обработки сообщения:', error);
      // Пытаемся отправить сообщение об ошибке
      try {
        await callBitrixApi('imbot.message.add', {
          DIALOG_ID: dialogId,
          MESSAGE: 'Извините, произошла техническая ошибка. Попробуйте позже.'
        }, authData);
      } catch (e) {
        console.error('❌ Не удалось отправить сообщение об ошибке:', e);
      }
    }

    return res.status(200).end();
  }

  // Для других событий просто отвечаем OK
  return res.status(200).json({ result: 'ok', event: event });
}

// Функция для вызова API Битрикс24
async function callBitrixApi(method, params, auth) {
  const queryUrl = `${auth.client_endpoint}${method}`;
  
  const formData = new URLSearchParams();
  formData.append('auth', auth.access_token);
  
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });

  const result = await response.json();
  
  if (result.error) {
    console.error(`❌ Ошибка API ${method}:`, result);
    throw new Error(result.error_description || result.error);
  }

  return result;
}
