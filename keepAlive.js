const express = require("express");
const app = express();

// Простой маршрут для проверки статуса сервера
app.get("/", (req, res) => {
  res.send("Бот работает!");
});

// Динамический порт: используем переменную окружения PORT или 3000 по умолчанию
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});