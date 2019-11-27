FROM node:lts-slim

RUN apt-get update && apt-get install -y vim

WORKDIR /usr/src/app

COPY . .

RUN yarn && yarn build

ENTRYPOINT ["node", "/usr/src/app/dist/cli.js"]
