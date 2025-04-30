# Timelapse Generator Bot

Ein Discord Bot, der automatisch Screenshots erstellt und daraus Timelapse-Videos generiert.

## Features

- Automatische Screenshot-Erstellung alle 6 Minuten
- Tägliche Screenshot-Posts um 8 und 20 Uhr
- Automatische Timelapse-Erstellung um Mitternacht
- Discord-Integration für Screenshot-Posts
- Dynamischer Bot-Status mit Mitgliederanzahl
- Optionaler Streaming-Status für Twitch-Integration

## Installation

1. Klone das Repository
2. Installiere die Abhängigkeiten mit `npm install`
3. Erstelle eine `.env` Datei mit folgenden Variablen:

```env
DISCORD_TOKEN=your_discord_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
SCREENSHOT_CHANNEL_ID=your_channel_id_here
RTSP_URL=rtsp://benutzername:passwort@ihre_kamera_ip
STREAM_URL=https://www.twitch.tv/your_channel (optional)
```

## Docker Installation

1. Klone das Repository
2. Erstelle eine `.env` Datei wie oben beschrieben
3. Starte den Container mit `docker-compose up -d`

### Volumes

- Screenshots:
  - Container Path: `/app/screenshots`
  - Host Path: `/mnt/user/appdata/timelapse-generator/screenshots`
- Timelapses:
  - Container Path: `/app/timelapses`
  - Host Path: `/mnt/user/appdata/timelapse-generator/timelapses`
- Konfiguration:
  - Container Path: `/app/.env`
  - Host Path: `/mnt/user/appdata/timelapse-generator/.env`

### Umgebungsvariablen

- DISCORD_TOKEN
- CLIENT_ID
- GUILD_ID
- SCREENSHOT_CHANNEL_ID
- RTSP_URL
- STREAM_URL (optional)

## Verwendung

### Commands

- `/status` - Zeige den aktuellen Status des Bots
- `/lastimage` - Zeige das letzte erstellte Bild
- `/purge [anzahl]` - Lösche Nachrichten (nur für Bot-Owner)

### Bot-Status

Der Bot zeigt verschiedene Status-Nachrichten an:

- Aktuelle Mitgliederanzahl des Servers
- Pflanzenwachstum-Überwachung
- Screenshot-Aufnahme
- Timelapse-Erstellung
- Daily Weed Pictures
- Wachstumsstatistiken
- Optional: Streaming-Status (wenn STREAM_URL konfiguriert ist)

### Dateistruktur

- Screenshots werden unter `/app/screenshots/` gespeichert
- Format: `screenshot_YYYY-MM-DD_HH-MM-SS.png`
- Beispiel: `screenshot_2024-04-26_14-20-01.png`

### Timelapse

- Timelapses werden unter `/app/timelapses/` gespeichert
- Format: `timelapse_YYYY-MM-DD.mp4`
- Screenshots werden nach erfolgreicher Timelapse-Erstellung automatisch gelöscht

## Entwicklung

### Lokale Entwicklung

1. Installiere Node.js und npm
2. Klone das Repository
3. Installiere die Abhängigkeiten mit `npm install`
4. Starte den Bot mit `npm start`

### Docker Entwicklung

1. Baue das Image mit `docker build -t timelapse-generator .`
2. Starte den Container mit `docker run -d --name timelapse-generator timelapse-generator`

## Lizenz

MIT

## Konfiguration

Erstellen Sie eine `.env` Datei mit folgenden Einstellungen:

```env
DISCORD_TOKEN=ihr_discord_token
CLIENT_ID=ihre_client_id
GUILD_ID=ihre_guild_id
SCREENSHOT_CHANNEL_ID=ihre_channel_id
RTSP_URL=rtsp://benutzername:passwort@ihre_kamera_ip
STREAM_URL=https://www.twitch.tv/your_channel (optional)
```
