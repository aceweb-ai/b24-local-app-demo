// Файл: /api/chat-bot.js
export default async function handler(req, res) {
  // 1. Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. Логируем факт обращения
  console.log(`📨 Входящий запрос: ${req.method} ${req.url}`);

  // 3. Для GET-запросов (простая проверка работоспособности)
  if (req.method === 'GET') {
    return res.status(200).json({
      result: 'success',
      message: 'Chat-bot handler is ready. Use POST for Bitrix24 events.',
      required_env_vars_set: {
        BOT_CLIENT_ID: !!process.env.BOT_CLIENT_ID,
        BOT_CLIENT_SECRET: !!process.env.BOT_CLIENT_SECRET
      }
    });
  }

  // 4. Парсим входящие данные от Битрикс24 (application/x-www-form-urlencoded)
  let rawBody = '';
  try {
    rawBody = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
  } catch (e) {
    console.error('❌ Ошибка чтения тела запроса:', e);
    return res.status(400).json({ error: 'Bad Request' });
  }

  const params = new URLSearchParams(rawBody);
  const body = Object.fromEntries(params);

  const { event, auth, data, DOMAIN, AUTH_ID, REFRESH_ID } = body;
  console.log(`🔍 Событие: ${event}`);

  // 5. Парсим JSON-строки auth и data, если они есть
  let authData = {};
  let eventData = {};
  try {
    if (auth) authData = JSON.parse(auth);
    if (data) eventData = JSON.parse(data);
  } catch (e) {
    console.warn('⚠️ Не удалось распарсить auth или data как JSON:', e.message);
  }

  // 6. ОБРАБОТКА ONAPPINSTALL - УСТАНОВКА ПРИЛОЖЕНИЯ И РЕГИСТРАЦИЯ БОТА
  if (event === 'ONAPPINSTALL') {
    console.log('🔄 Начинаем обработку установки приложения...');

    // 6.1. Формируем auth объект для первого вызова API
    // Битрикс24 может передать auth как JSON-строку или отдельными полями AUTH_ID, REFRESH_ID
    const initialAuth = authData.access_token ? authData : {
      access_token: AUTH_ID,
      refresh_token: REFRESH_ID,
      client_endpoint: `https://${DOMAIN}/rest/`,
      application_token: auth // строка "application_token"
    };

    if (!initialAuth.access_token || !initialAuth.client_endpoint) {
      const errorMsg = '❌ Не получены обязательные данные для авторизации (access_token или client_endpoint). Проверьте права приложения в Битрикс24.';
      console.error(errorMsg, { initialAuth });
      return res.status(400).json({ error: errorMsg });
    }

    console.log('✅ Получены начальные авторизационные данные.');

    // 6.2. Регистрируем бота
    try {
      const handlerBackUrl = `https://${req.headers.host}${req.url}`;
      console.log(`🌐 Регистрируем бота. Конечная точка: ${handlerBackUrl}`);

      // ВАЖНО: Используем нашу функцию callBitrixApi, которая умеет обновлять токены
      const registerResult = await callBitrixApi('imbot.register', {
        CODE: 'my_ai_helper_bot',
        TYPE: 'O', // Бот для открытых линий
        EVENT_MESSAGE_ADD: handlerBackUrl,
        EVENT_WELCOME_MESSAGE: handlerBackUrl,
        EVENT_BOT_DELETE: handlerBackUrl,
        OPENLINE: 'Y',
        PROPERTIES: {
          NAME: 'AI Помощник для Открытой Линии',
          WORK_POSITION: 'Отвечает на вопросы посетителей сайта с помощью AI',
          COLOR: 'GREEN'
        }
      }, initialAuth);

      const botId = registerResult.result;
      console.log(`🎉 Бот успешно зарегистрирован! ID: ${botId}`);

      // 6.3. Отвечаем Битрикс24 об успехе
      return res.status(200).json({
        result: 'success',
        botId: botId,
        message: 'Chat-bot registered successfully'
      });

    } catch (apiError) {
      console.error('❌ Ошибка регистрации бота:', apiError);
      return res.status(500).json({
        error: 'Bot registration failed',
        details: apiError.message
      });
    }
  }

  // 7. ОБРАБОТКА СООБЩЕНИЙ ОТ ПОЛЬЗОВАТЕЛЯ
  if (event === 'ONIMBOTMESSAGEADD') {
    console.log('💬 Получено новое сообщение от пользователя.');

    // Простейший эхо-бот для теста
    const userMessage = eventData?.PARAMS?.MESSAGE || '...';
    const dialogId = eventData?.PARAMS?.DIALOG_ID;

    if (dialogId && authData.access_token) {
      try {
        await callBitrixApi('imbot.message.add', {
          DIALOG_ID: dialogId,
          MESSAGE: `Вы написали: "${userMessage}". Это тестовый ответ.`
        }, authData);
        console.log(`✅ Ответ отправлен в диалог ${dialogId}`);
      } catch (e) {
        console.error('❌ Не удалось отправить ответ:', e);
      }
    }

    return res.status(200).end();
  }

  // 8. Для других событий просто отвечаем 200 OK
  console.log(`ℹ️ Получено необрабатываемое событие: ${event}`);
  return res.status(200).end();
}

// ===================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====================

/**
 * Аналог PHP-функции restCommand.
 * Выполняет вызов API Битрикс24 с автоматическим обновлением токена при истечении.
 * @param {string} method - Метод REST API, например 'imbot.register'
 * @param {Object} params - Параметры запроса
 * @param {Object} auth - Объект авторизации { access_token, refresh_token, client_endpoint, application_token }
 * @returns {Promise<Object>} - Результат вызова API
 */
async function callBitrixApi(method, params = {}, auth = {}) {
  const queryUrl = `${auth.client_endpoint}${method}`;
  const queryData = new URLSearchParams({
    ...params,
    auth: auth.access_token
  });

  console.log(`🌐 Вызов API ${method} на ${auth.client_endpoint}`);

  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: queryData.toString()
  });

  const result = await response.json();

  // Если токен истёк, пытаемся обновить его и повторить запрос
  if (result.error && (result.error === 'expired_token' || result.error === 'invalid_token')) {
    console.log('🔄 Токен истёк, пытаемся обновить...');
    const newAuth = await refreshAuth(auth);
    if (newAuth) {
      // Обновляем токен в переданном объекте auth и повторяем запрос
      auth.access_token = newAuth.access_token;
      auth.refresh_token = newAuth.refresh_token;
      return callBitrixApi(method, params, auth);
    } else {
      throw new Error('Failed to refresh auth token');
    }
  }

  if (result.error) {
    throw new Error(result.error_description || result.error);
  }

  return result;
}

/**
 * Аналог PHP-функции restAuth.
 * Обновляет истёкший токен с помощью CLIENT_ID и CLIENT_SECRET.
 * @param {Object} auth - Объект авторизации с refresh_token
 * @returns {Promise<Object|false>} - Новые auth-данные или false при ошибке
 */
async function refreshAuth(auth) {
  const CLIENT_ID = process.env.BOT_CLIENT_ID;
  const CLIENT_SECRET = process.env.BOT_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET || !auth.refresh_token) {
    console.error('❌ Не хватает данных для обновления токена (CLIENT_ID, CLIENT_SECRET или refresh_token)');
    return false;
  }

  const queryUrl = 'https://oauth.bitrix.info/oauth/token/';
  const queryParams = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: auth.refresh_token,
  });

  console.log('🔄 Запрашиваем обновление токена...');

  try {
    const response = await fetch(`${queryUrl}?${queryParams.toString()}`);
    const result = await response.json();

    if (result.error) {
      console.error('❌ Ошибка обновления токена:', result);
      return false;
    }

    console.log('✅ Токен успешно обновлён.');
    // Сохраняем application_token из старого auth объекта
    result.application_token = auth.application_token;
    return result;
  } catch (error) {
    console.error('❌ Сетевая ошибка при обновлении токена:', error);
    return false;
  }
}
