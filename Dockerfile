FROM node:10.16-stretch

WORKDIR /usr/src/app

COPY . .

RUN yarn && yarn build

ENTRYPOINT ["node", "/usr/src/app/dist/cli.js"]
