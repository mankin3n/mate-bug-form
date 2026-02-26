FROM node:18-alpine
WORKDIR /app
COPY server.js index.html ./
EXPOSE 8080
CMD ["node", "server.js"]
