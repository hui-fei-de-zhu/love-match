FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./
COPY index.html ./
COPY admin.html ./

RUN mkdir -p /app/data

EXPOSE 3457

ENV API_KEY=love-match-2024

CMD ["node", "server.js"]
