FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . ./
EXPOSE 3457
CMD ["node", "server.js"]
