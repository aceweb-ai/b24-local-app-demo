// Файл: /api/chat-bot.js
// Упрощенный обработчик событий чат-бота для открытых линий Битрикс24

export default async function handler(req, res) {
  // 1. Настраиваем CORS и заголовки для ответа Битрикс24
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Обработка предварительного OPTIONS-запроса
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Для простоты проверки работы эндпоинта
  if (req.method === 'GET') {
    return res.status(200).json({ result: 'success', message: 'Chat-bot handler is ready' });
  }

 // 4. Парсим входящие данные от Битрикс24
// Битрикс24 отправляет данные как application/x-www-form-urlencoded
let body = {};
let authObject = {};
let dataObject = {};

try {
    const rawBody = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
    });
    const params = new URLSearchParams(rawBody);
    body = Object.fromEntries(params);
    
    // КРИТИЧНО: Для события ONAPPINSTALL auth и data передаются в query-параметрах, а не в теле!
    // Также они могут быть закодированы в теле запроса, но раздельно.
    if (body.auth) {
        try { authObject = JSON.parse(body.auth); } catch (e) { console.warn('Не удалось распарсить auth:', e); }
    }
    if (body.data) {
        try { dataObject = JSON.parse(body.data); } catch (e) { console.warn('Не удалось распарсить data:', e); }
    }
    
    // Логируем для отладки (будьте осторожны, не логируйте токены в продакшене!)
    console.log(`📨 Событие: ${body.event || 'unknown'}`, {
        hasAuth: !!body.auth,
        hasData: !!body.data,
        authKeys: Object.keys(authObject),
        dataKeys: Object.keys(dataObject)
    });
    
} catch (error) {
    console.error('❌ Ошибка парсинга тела запроса:', error);
    return res.status(400).json({ error: 'Bad Request' });
}

const { event } = body; // Основное событие берем из body

  // 5. ОБРАБОТКА СОБЫТИЙ
  // 5.1. Установка приложения и регистрация бота
  if (event === 'ONAPPINSTALL') {
    const handlerBackUrl = `https://${req.headers.host}${req.url}`;
    
    try {
      // 5.1.1. Регистрируем нового бота
      const registerResult = await callBitrixApi('imbot.register', {
        CODE: 'my_simple_bot',
        TYPE: 'O', // Бот для открытых линий
        EVENT_MESSAGE_ADD: handlerBackUrl,
        EVENT_WELCOME_MESSAGE: handlerBackUrl,
        EVENT_BOT_DELETE: handlerBackUrl,
        OPENLINE: 'Y',
        PROPERTIES: {
          NAME: 'Мой AI-Помощник (Тест)',
          WORK_POSITION: 'Отвечает на вопросы посетителей сайта',
          COLOR: 'AZURE'
        }
      }, authObject);

      const botId = registerResult.result;

      // 5.1.2. Сохраняем ID бота (в реальном проекте нужно в БД)
      // Для теста просто логируем
      console.log(`✅ Бот зарегистрирован. ID: ${botId}`);

      // 5.1.3. Отвечаем Битрикс24, что обработка завершена
      return res.status(200).json({ result: 'Bot registered', botId });

    } catch (apiError) {
      console.error('❌ Ошибка регистрации бота:', apiError);
      return res.status(500).json({ error: 'Bot registration failed' });
    }
  }

  // 5.2. Получение нового сообщения от пользователя
  if (event === 'ONIMBOTMESSAGEADD') {
    const params = dataObject.PARAMS || {};
    
    // Работаем только с открытыми линиями
    if (params.CHAT_ENTITY_TYPE !== 'LINES') {
      return res.status(200).end(); // Игнорируем
    }

    const dialogId = params.DIALOG_ID;
    const userMessage = params.MESSAGE || '';

    console.log(`💬 Новое сообщение в диалоге ${dialogId}: "${userMessage}"`);

    // 5.2.1. ПРОСТЕЙШАЯ ЛОГИКА ОТВЕТА (замените на вызов Chutes AI)
    const botReply = `Вы написали: "${userMessage}". Это тестовый ответ бота.`;

    try {
      // 5.2.2. Отправляем ответное сообщение через API Битрикс24
      await callBitrixApi('imbot.message.add', {
        DIALOG_ID: dialogId,
        MESSAGE: botReply
      }, authObject);

      console.log(`✅ Ответ отправлен в диалог ${dialogId}`);
      return res.status(200).end();

    } catch (replyError) {
      console.error('❌ Ошибка отправки сообщения:', replyError);
      return res.status(500).json({ error: 'Failed to send reply' });
    }
  }

  // 5.3. Пользователь присоединился к чату
  if (event === 'ONIMBOTJOINCHAT') {
    const params = dataObject.PARAMS || {};
    if (params.CHAT_ENTITY_TYPE !== 'LINES') {
      return res.status(200).end();
    }
    // Можно отправить приветственное сообщение
    console.log(`👋 Пользователь присоединился к чату: ${params.DIALOG_ID}`);
    return res.status(200).end();
  }

  // 6. Если событие не обрабатывается, отвечаем успехом
  return res.status(200).end();
}

// Вспомогательная функция для вызова REST API Битрикс24
async function callBitrixApi(method, params = {}, auth = {}) {
  const queryUrl = `${auth.client_endpoint}${method}`;
  const queryData = new URLSearchParams({
    ...params,
    auth: auth.access_token
  });

  console.log(`🌐 Вызов API: ${method}`);

  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: queryData.toString()
  });

  const result = await response.json();

  if (result.error) {
    console.error(`❌ Ошибка API ${method}:`, result.error);
    throw new Error(result.error_description || result.error);
  }

  return result;
}
