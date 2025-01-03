require("./keepAlive");

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const CHANNEL_ID = process.env.CHAT_ID;

const questions = [
  "Ваш псевдоним (русский и английский вариант)",
  "Ваш возраст (цифрой)",
  "Желаемый прототип",
  "Ваш опыт",
  "Ваше устройство",
  "Ваш часовой пояс",
  "Как Вы реагируете на хейт?",
  "Готовы ли проявлять активность в канале?",
];

const users = {};

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


function checkAge(ageString) {
  const numbers = ageString.match(/\d+/g);
  if (numbers) {
    return numbers.some(num => parseInt(num) < 10);
  }
  return false;
}

// start of bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = {
    step: 0,
    answers: [],
    mediaFileId: null,
  };

  bot.sendMessage(chatId, "Привет! Давайте начнем с Вашей анкеты.");
  bot.sendMessage(chatId, questions[0]);
});

function isValidAgeFormat(ageString) {
  return /^\d+$/.test(ageString.trim());
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  if (!users[chatId] || msg.text?.startsWith('/')) return;

  const user = users[chatId];

  if (user.step >= 0 && user.step < questions.length) {
    if (user.step === 1) {
      if (!isValidAgeFormat(msg.text)) {
        await bot.sendMessage(chatId, "Пожалуйста, укажите возраст только цифрами (например: 18)");
        return;
      }
      
      if (checkAge(msg.text)) {
        await clearChat(chatId, messageId);
        await bot.sendMessage(chatId, "К сожалению, мы принимаем только участников старше 10 лет. Для начала анкеты сначала нажмите /start");
        delete users[chatId];
        return;
      }
    }

    user.answers.push(msg.text);
    user.step += 1;

    if (user.step < questions.length) {
      bot.sendMessage(chatId, questions[user.step]);
    } else {
      const trainingKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Да, смогу", callback_data: "training_yes" }],
            [{ text: "Нет", callback_data: "training_no" }],
          ],
        },
      };
      bot.sendMessage(chatId, "Сможете ходить на тренировки?", trainingKeyboard);
    }
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const user = users[chatId];
  const senderUsername = callbackQuery.from.username || "Нет юзернейма";

  if (!user) return;

  if (callbackQuery.data === "training_yes") {
    user.answers.push("Да, смогу");

    try {
      const userMessage = `
Новая заявка от @${senderUsername}:
1. Псевдоним: ${user.answers[0]}
2. Возраст: ${user.answers[1]}
3. Прототип: ${user.answers[2]}
4. Опыт: ${user.answers[3]}
5. Устройство: ${user.answers[4]}
6. Чп: ${user.answers[5]}
7. Готовность к хейту: ${user.answers[6]}
8. Активность в канале: ${user.answers[7]}
9. Тренировки: ${user.answers[8]}
`;
      await bot.sendMessage(CHANNEL_ID, userMessage);

      console.log("Заявка отправлена на рассмотрение");
      await bot.sendMessage(chatId, "Спасибо! Ваша заявка принята. Скоро её рассмотрят ^_^");
    } catch (error) {
      console.log("Ошибка отправки заявки:", error);
      await bot.sendMessage(chatId, "Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.");
    }
  } else if (callbackQuery.data === "training_no") {
    await clearChat(chatId, messageId);
    await bot.sendMessage(chatId, "К сожалению, мы принимаем только тех, кто может посещать тренировки. Для начала анкеты сначала нажмите /start");
  }

  delete users[chatId];
  await bot.answerCallbackQuery(callbackQuery.id);
});