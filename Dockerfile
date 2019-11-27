FROM node:lts-alpine

RUN apk update && apk add vim

WORKDIR /usr/src/app

COPY . .

RUN yarn && yarn build

ENTRYPOINT ["node", "/usr/src/app/dist/cli.js"]
