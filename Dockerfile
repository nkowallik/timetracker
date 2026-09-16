FROM node:22-alpine AS build
WORKDIR /app
# toolchain for better-sqlite3's native build (no matching prebuild on musl)
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
USER node
CMD ["node", "build"]
