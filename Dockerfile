FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install --no-audit --no-fund

COPY frontend/ ./

ARG VITE_API_URL=""
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_GOOGLE_API_KEY=""
ARG VITE_GOOGLE_APP_ID=""

ENV VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY \
    VITE_GOOGLE_APP_ID=$VITE_GOOGLE_APP_ID

RUN npm run build

FROM node:22-slim AS production
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm --prefix /app/backend ci --omit=dev --no-audit --no-fund

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
WORKDIR /app/backend
EXPOSE 8080

CMD ["node", "src/index.js"]
