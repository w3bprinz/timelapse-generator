# Timelapse Generator

Ein Discord Bot, der automatisch Screenshots erstellt und daraus Timelapse-Videos generiert.

## Funktionen

- Automatische Screenshot-Erstellung alle 5 Minuten
- Tägliche Screenshot-Posts um 8 und 20 Uhr
- Automatische Timelapse-Erstellung um Mitternacht
- Slash-Commands für die Konfiguration
- Automatische Command-Registrierung

## Installation

### Lokale Installation

1. Klone dieses Repository
2. Installiere die Abhängigkeiten:
   ```bash
   npm install
   ```
3. Erstelle eine `.env` Datei mit folgenden Werten:
   ```
   DISCORD_TOKEN=your_discord_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here
   RTSP_URL=your_rtsp_stream_url_here
   SCREENSHOT_CHANNEL_ID=your_channel_id_here
   OWNER_ID=your_discord_user_id_here
   ```
4. Registriere die Slash-Commands:
   ```bash
   npm run deploy
   ```
5. Starte den Bot:
   ```bash
   npm start
   ```

### Docker Installation (Unraid)

1. Füge ein neues Docker-Container hinzu
2. Wähle "Add Container"
3. Konfiguriere den Container:
   - Repository: `ghcr.io/your-username/timelapse-generator:latest`
   - Network Type: Bridge
   - Volumes:
     - Container Path: `/app/screenshots`
     - Host Path: `/mnt/user/appdata/timelapse-generator/screenshots`
     - Container Path: `/app/timelapse`
     - Host Path: `/mnt/user/appdata/timelapse-generator/timelapse`
   - Environment Variables:
     - DISCORD_TOKEN
     - CLIENT_ID
     - GUILD_ID
     - RTSP_URL
     - SCREENSHOT_CHANNEL_ID
     - OWNER_ID

## Verwendung

### Slash-Commands

- `/config` - Konfiguriere den RTSP-Stream und den Screenshot-Channel
- `/purge [anzahl]` - Löscht Nachrichten (nur für Bot-Owner)
- `/lastimage` - Zeigt das letzte aufgenommene Bild an

## Dateistruktur

- Screenshots werden unter `/app/screenshots/` gespeichert
  - Format: `screenshot_YYYY-MM-DD_HH-MM-SS.jpg`
  - Beispiel: `screenshot_2024-04-26_14-20-01.jpg`
- Timelapse-Videos werden unter `/app/timelapse/` gespeichert
  - Format: `timelapse_YYYY-MM-DD.mp4`
  - Beispiel: `timelapse_2024-04-26.mp4`
- Screenshots werden nach erfolgreicher Timelapse-Erstellung automatisch gelöscht

## Voraussetzungen

- Node.js 16.9.0 oder höher (für lokale Installation)
- FFmpeg für die RTSP-Stream-Verarbeitung
- Ein Discord-Bot-Token
- Ein RTSP-Stream

## Docker Build

Das Docker-Image wird automatisch bei jedem Push zum Master-Branch erstellt und auf GitHub Container Registry (ghcr.io) veröffentlicht.

## Lizenz

MIT

## Konfiguration

Erstellen Sie eine `.env` Datei mit folgenden Einstellungen:

```env
DISCORD_TOKEN=ihr_discord_token
CHANNEL_ID=ihre_channel_id
SCREENSHOT_INTERVAL=300000
POST_TIMES=12:00,18:00
RTSP_URL=rtsp://ihre_kamera_ip
RTSP_USERNAME=ihr_benutzername
RTSP_PASSWORD=ihr_passwort
```
