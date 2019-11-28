FROM node:lts-slim

WORKDIR /usr/src/app

COPY . .

RUN yarn && yarn build

ENTRYPOINT ["node", "/usr/src/app/dist/cli.js"]
