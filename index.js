require("./keepAlive"); // Keep-Alive сервер

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const CHANNEL_ID = process.env.CHAT_ID;

const questions = [
  "Ваш псевдоним",
  "Ваш возраст",
  "Желаемый прототип",
  "Расскажите немного о себе, почему мы должны Вас принять?",
  "Готовы ли Вы встретиться с хейтом и сложностями?",
  "Запишете партии в установленный срок?",
  "Пришлите ваши навыки (вокал от 30 сек, рэп от 10 сек) в формате видео или аудио",
  "Ваш юз:",
];

const users = {};

// Функция для очистки чата
async function clearChat(chatId, messageId) {
  try {
    for (let i = messageId; i > 0; i--) {
      try {
        await bot.deleteMessage(chatId, i);
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    console.log("Ошибка при очистке чата:", error);
  }
}

// Начало работы бота
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = {
    step: 0,
    answers: [],
    mediaFileId: null, // Добавляем поле для хранения file_id медиафайла
  };

  bot.sendMessage(chatId, "Привет! Давайте начнем с Вашей анкеты.");
  bot.sendMessage(chatId, questions[0]);
});

// Обработка всех типов сообщений
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!users[chatId] || msg.text?.startsWith('/')) return;

  const user = users[chatId];

  // Проверяем, ожидаем ли мы медиафайл
  if (user.step === 6) {
    // Проверяем наличие аудио или видео в сообщении
    if (msg.audio || msg.voice || msg.video || msg.video_note) {
      const mediaFile = msg.audio || msg.voice || msg.video || msg.video_note;
      user.mediaFileId = {
        type: msg.audio ? 'audio' : (msg.voice ? 'voice' : (msg.video ? 'video' : 'video_note')),
        file_id: mediaFile.file_id
      };
      user.answers.push("[Медиафайл]");
      user.step += 1;
      bot.sendMessage(chatId, questions[user.step]);
      return;
    } else {
      bot.sendMessage(chatId, "Пожалуйста, отправьте аудио или видео файл с вашими навыками.");
      return;
    }
  }

  // Обработка юзернейма
  if (user.step === 7) {
    let username = msg.text;
    if (username.startsWith("https://t.me/")) {
      username = username.replace("https://t.me/", "@");
    } else if (username.startsWith("http://t.me/")) {
      username = username.replace("http://t.me/", "@");
    } else if (!username.startsWith("@")) {
      username = "@" + username;
    }
    user.answers.push(username);

    const bandlabKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Да, умею", callback_data: "bandlab_yes" }],
          [{ text: "Нет", callback_data: "bandlab_no" }],
        ],
      },
    };
    bot.sendMessage(chatId, "Умеете пользоваться BandLab?", bandlabKeyboard);
    return;
  }

  // Обработка текстовых ответов
  if (user.step >= 0 && user.step < questions.length) {
    user.answers.push(msg.text);
    user.step += 1;

    if (user.step < questions.length) {
      bot.sendMessage(chatId, questions[user.step]);
    }
  }
});

// Обработка нажатий на inline-кнопки
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const user = users[chatId];

  if (!user) return;

  if (callbackQuery.data === "bandlab_yes") {
    user.answers.push("Да, умею");

    try {
      // Сначала отправляем текст анкеты
      const userMessage = `
Новая заявка:
1. Псевдоним: ${user.answers[0]}
2. Возраст: ${user.answers[1]}
3. Прототип: ${user.answers[2]}
4. О себе: ${user.answers[3]}
5. Готов к хейту: ${user.answers[4]}
6. Сроки: ${user.answers[5]}
7. Навыки: ${user.answers[6]}
8. Юз: ${user.answers[7]}
9. BandLab: ${user.answers[8]}
`;
      await bot.sendMessage(CHANNEL_ID, userMessage);

      // Затем пересылаем медиафайл
      if (user.mediaFileId) {
        switch(user.mediaFileId.type) {
          case 'audio':
            await bot.sendAudio(CHANNEL_ID, user.mediaFileId.file_id);
            break;
          case 'voice':
            await bot.sendVoice(CHANNEL_ID, user.mediaFileId.file_id);
            break;
          case 'video':
            await bot.sendVideo(CHANNEL_ID, user.mediaFileId.file_id);
            break;
          case 'video_note':
            await bot.sendVideoNote(CHANNEL_ID, user.mediaFileId.file_id);
            break;
        }
      }

      console.log("Заявка отправлена на рассмотрение диверс");
      await bot.sendMessage(chatId, "Спасибо! Ваша заявка принята. d1verse скоро её рассмотрит ^_^");
    } catch (error) {
      console.log("Ошибка отправки заявки:", error);
      await bot.sendMessage(chatId, "Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.");
    }
  } else if (callbackQuery.data === "bandlab_no") {
    await clearChat(chatId, messageId);
    await bot.sendMessage(chatId, "К сожалению, мы принимаем только тех, кто умеет пользоваться BandLab. Для начала анкеты сначала нажмите /start");
  }

  delete users[chatId];
  await bot.answerCallbackQuery(callbackQuery.id);
});