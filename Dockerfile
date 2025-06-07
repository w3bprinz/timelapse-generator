FROM node:18-alpine

WORKDIR /app

# Installiere FFmpeg und tzdata für die Zeitzonen-Konfiguration
RUN apk add --no-cache ffmpeg tzdata

# Setze die Zeitzone auf Berlin
ENV TZ=Europe/Berlin

# Kopiere package.json und package-lock.json
COPY package*.json ./

# Installiere Systemabhängigkeiten für canvas / node-gyp
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev

# Installiere Abhängigkeiten
RUN npm install

# Kopiere den Rest des Codes
COPY . .

# Erstelle die benötigten Ordner
RUN mkdir -p screenshots timelapses

# Setze Umgebungsvariablen
ENV NODE_ENV=production

# Starte den Bot
CMD ["node", "src/index.js"] 