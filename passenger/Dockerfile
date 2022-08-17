FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm i
COPY . /app
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist /app/package.json /app/package-lock.json /app/
RUN npm install --only=production
ENTRYPOINT ["node", "index.js"]
