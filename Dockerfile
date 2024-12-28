# Используем Node.js в качестве базового образа
FROM node:22

# Устанавливаем рабочую директорию
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем все файлы проекта в контейнер
COPY . .

# Открываем порт для Keep-Alive сервера (если используется)
EXPOSE 3000

# Запуск бота
CMD ["node", "index.js"]
