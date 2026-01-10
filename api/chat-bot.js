// Файл: /api/chat-bot.js
// Чат-бот для Открытых линий Битрикс24

export default async function handler(req, res) {
  // 1. Настраиваем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Обработка предварительного запроса OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Парсим входящие данные
  let requestData = {};
  try {
    // Битрикс24 отправляет данные как x-www-form-urlencoded
    if (req.method === 'POST') {
      const text = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
      
      const params = new URLSearchParams(text);
      requestData = Object.fromEntries(params);
      
      // Парсим JSON поля если они есть
      if (requestData.auth) requestData.auth = JSON.parse(requestData.auth);
      if (requestData.data) requestData.data = JSON.parse(requestData.data);
    }
  } catch (error) {
    console.error('❌ Ошибка парсинга:', error);
    return res.status(400).json({ error: 'Invalid request format' });
  }

  console.log('📨 Событие:', requestData.event);

  // 4. Обрабатываем события
  switch (requestData.event) {
    case 'ONAPPINSTALL':
      return await handleAppInstall(requestData, res);
    case 'ONIMBOTMESSAGEADD':
      return await handleMessageAdd(requestData, res);
    case 'ONIMBOTJOINCHAT':
      return await handleJoinChat(requestData, res);
    case 'ONIMBOTDELETE':
      return await handleBotDelete(requestData, res);
    default:
      return res.status(200).json({ 
        result: 'success', 
        message: 'Handler is ready' 
      });
  }
}

// ============= ОБРАБОТЧИКИ СОБЫТИЙ =============

/**
 * Установка приложения и регистрация бота
 */
async function handleAppInstall(requestData, res) {
  const { auth } = requestData;
  
  try {
    // URL нашего обработчика
    const handlerUrl = `https://${req.headers.host}${req.url}`;
    
    // Регистрируем бота для Открытых линий
    const result = await restCommand('imbot.register', {
      CODE: 'OpenlineTestBot',
      TYPE: 'O', // 'O' для Открытых линий, 'B' для обычного бота
      EVENT_MESSAGE_ADD: handlerUrl,
      EVENT_WELCOME_MESSAGE: handlerUrl,
      EVENT_BOT_DELETE: handlerUrl,
      PROPERTIES: {
        NAME: 'Тестовый AI Бот',
        COLOR: 'AQUA',
        EMAIL: 'bot@example.com',
        PERSONAL_BIRTHDAY: '2024-01-01',
        WORK_POSITION: 'Тестовый бот с AI для открытых линий',
        PERSONAL_GENDER: 'M',
        PERSONAL_PHOTO: '' // Можно добавить base64 аватар
      }
    }, auth);

    console.log('✅ Бот зарегистрирован:', result);

    // Сохраняем ID бота (в реальном приложении - в БД)
    if (result.result) {
      // Здесь можно сохранить bot_id для будущего использования
      console.log('Bot ID сохранен:', result.result);
    }

    return res.status(200).json({
      result: 'success',
      message: 'Bot registered successfully',
      bot_id: result.result
    });

  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * Обработка входящих сообщений
 */
async function handleMessageAdd(requestData, res) {
  const { auth, data } = requestData;
  
  try {
    const { DIALOG_ID, MESSAGE, CHAT_ENTITY_TYPE } = data;
    
    // Проверяем, из открытой линии ли сообщение
    const isOpenline = CHAT_ENTITY_TYPE === 'LINES';
    console.log(`💬 Сообщение от ${isOpenline ? 'открытой линии' : 'чата'}: "${MESSAGE}"`);

    // ТЕСТОВЫЙ ОТВЕТ (позже заменим на AI)
    let responseMessage = '';
    
    if (MESSAGE.toLowerCase() === 'привет') {
      responseMessage = 'Привет! Я тестовый бот для открытых линий. Напишите "меню" для выбора команд.';
    } else if (MESSAGE.toLowerCase() === 'меню') {
      responseMessage = 'Доступные команды:\n1. Привет - поздороваться\n2. Время - текущее время\n3. Помощь - помощь\n0. Оператор - связаться с оператором';
    } else if (MESSAGE.toLowerCase() === 'время') {
      responseMessage = `Текущее время: ${new Date().toLocaleString('ru-RU')}`;
    } else if (MESSAGE === '0') {
      // Стандартная команда для переключения на оператора
      responseMessage = 'Соединяю с оператором...';
    } else {
      // Эхо-ответ для теста
      responseMessage = `Вы написали: "${MESSAGE}". Это тестовый ответ бота.`;
    }

    // Отправляем ответ
    const result = await restCommand('imbot.message.add', {
      DIALOG_ID: DIALOG_ID,
      MESSAGE: responseMessage,
      ATTACH: isOpenline ? [
        { MESSAGE: '[send=меню]Меню[/send] | [send=0]Оператор[/send]' }
      ] : []
    }, auth);

    console.log('✅ Ответ отправлен:', result);

    return res.status(200).json({
      result: 'success',
      message: 'Message processed'
    });

  } catch (error) {
    console.error('❌ Ошибка обработки сообщения:', error);
    return res.status(500).json({ error: 'Message processing failed' });
  }
}

/**
 * Приглашение бота в чат
 */
async function handleJoinChat(requestData, res) {
  const { auth, data } = requestData;
  
  try {
    const { DIALOG_ID, CHAT_ENTITY_TYPE } = data;
    const isOpenline = CHAT_ENTITY_TYPE === 'LINES';

    let welcomeMessage = isOpenline 
      ? 'Здравствуйте! Я тестовый бот для открытых линий. Чем могу помочь?'
      : 'Привет! Я тестовый бот. Напишите "меню" для списка команд.';

    const result = await restCommand('imbot.message.add', {
      DIALOG_ID: DIALOG_ID,
      MESSAGE: welcomeMessage,
      ATTACH: [
        { MESSAGE: '[send=меню]Меню[/send] | [send=привет]Привет[/send]' }
      ]
    }, auth);

    console.log('✅ Приветствие отправлено');

    return res.status(200).json({
      result: 'success',
      message: 'Welcome message sent'
    });

  } catch (error) {
    console.error('❌ Ошибка приветствия:', error);
    return res.status(500).json({ error: 'Welcome failed' });
  }
}

/**
 * Удаление бота
 */
async function handleBotDelete(requestData, res) {
  console.log('🗑️ Бот удален');
  // Здесь можно выполнить очистку данных
  return res.status(200).json({
    result: 'success',
    message: 'Bot deleted'
  });
}

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

/**
 * Отправка REST-запроса к Битрикс24
 */
async function restCommand(method, params, auth) {
  const queryUrl = `https://${auth.domain}/rest/${method}`;
  const queryData = new URLSearchParams({
    ...params,
    auth: auth.access_token
  }).toString();

  console.log(`🔄 REST: ${method}`);

  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Openline-Bot-Handler'
    },
    body: queryData
  });

  const result = await response.json();
  
  if (result.error) {
    console.error(`❌ REST ошибка (${method}):`, result.error);
    throw new Error(result.error_description || 'REST command failed');
  }

  return result;
}
