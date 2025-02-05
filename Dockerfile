FROM node:22-slim

WORKDIR /usr/bot

COPY package.json .
COPY pnpm-lock.yaml .
COPY src src

RUN npm -g install corepack@0.31

RUN corepack enable

RUN pnpm install

CMD [ "node", "." ]