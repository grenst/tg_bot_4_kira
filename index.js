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
  "Ваши навыки (вокал от 30 сек, рэп от 10 сек)",
  "Ваш юз:",
];

const users = {};

// Начало работы бота
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = {
    step: 0,
    answers: [],
  };

  bot.sendMessage(chatId, "Привет! Давайте начнем с Вашей анкеты.");
  bot.sendMessage(chatId, questions[0]);
});

// Обработка ответов на вопросы
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (!users[chatId]) return;

  const user = users[chatId];

  // Сохранение ответа
  if (user.step >= 0 && user.step < questions.length) {
    const currentQuestionIndex = user.step;

    // Проверка вопроса про BandLab
    if (currentQuestionIndex === 6) {
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
    } else if (currentQuestionIndex === 8) {
      let username = msg.text;
      if (username.startsWith("https://t.me/")) {
        username = username.replace("https://t.me/", "@");
      } else if (username.startsWith("http://t.me/")) {
        username = username.replace("http://t.me/", "@");
      } else if (!username.startsWith("@")) {
        username = "@" + username;
      }
      user.answers.push(username);
    } else {
      user.answers.push(msg.text);
    }

    user.step += 1;

    if (user.step < questions.length) {
      bot.sendMessage(chatId, questions[user.step]);
    } else {
      // Анкета завершена
      bot.sendMessage(
        chatId,
        "Спасибо! Ваша заявка принята. d1verse скоро её рассмотрит ^_^",
      );

      // Формирование сообщения с заявкой
      const userMessage = `
Новая заявка:
1. Псевдоним: ${user.answers[0]}
2. Возраст: ${user.answers[1]}
3. Прототип: ${user.answers[2]}
4. О себе: ${user.answers[3]}
5. Готов к хейту: ${user.answers[4]}
6. Сроки: ${user.answers[5]}
7. BandLab: ${user.answers[6]}
8. Навыки: ${user.answers[7]}
9. Юз: ${user.answers[8]}
`;

      bot
        .sendMessage(CHANNEL_ID, userMessage)
        .then(() => console.log("Заявка отправлена на рассмотрение диверс"))
        .catch((error) => console.log("Ошибка отправки заявки:", error));

      delete users[chatId]; // Очистка данных после отправки заявки
    }
  }
});

// Обработка нажатий на inline-кнопки
bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const user = users[chatId];

  if (!user) return;

  if (user.step === 6) {
    if (callbackQuery.data === "bandlab_yes") {
      user.answers.push("Да, умею");
      user.step += 1;
      bot.sendMessage(chatId, questions[user.step]);
    } else if (callbackQuery.data === "bandlab_no") {
      bot.sendMessage(chatId, "К сожалению, мы принимаем только тех, кто умеет пользоваться BandLab.");
      delete users[chatId];
    }
  }

  bot.answerCallbackQuery(callbackQuery.id);
});
