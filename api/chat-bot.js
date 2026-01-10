// Файл: /api/chat-bot.js
// ПРОСТОЙ ДИАГНОСТИЧЕСКИЙ КОД - ТОЛЬКО ЛОГИРУЕТ ВСЁ

export default async function handler(req, res) {
  // 1. ЛОГИРУЕМ ВСЁ
  console.log('=== 🚨 НАЧАЛО ПОЛНОГО ЛОГА ===');
  console.log('📨 МЕТОД:', req.method);
  console.log('🔗 URL:', req.url);
  console.log('🔍 QUERY ПАРАМЕТРЫ:', req.query);
  
  // 2. Читаем тело запроса КАК ЕСТЬ
  let rawBody = '';
  try {
    rawBody = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
    console.log('📦 СЫРОЕ ТЕЛО (первые 1000 символов):');
    console.log(rawBody.substring(0, 1000));
  } catch (e) {
    console.error('❌ Ошибка чтения тела:', e);
  }

  // 3. Отвечаем УСПЕХОМ в любом случае
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    result: 'debug',
    message: 'Диагностика завершена. Проверь логи в Vercel.',
    timestamp: new Date().toISOString()
  });
}
