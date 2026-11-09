# Pager Backend - Digital Queue Management

Backend API untuk sistem POS & Pager Digital dengan realtime Server-Sent Events (SSE).

## Tech Stack
- Node.js 18+
- Express.js
- Server-Sent Events (SSE) untuk realtime updates
- QRCode generation
- File-based persistence (JSON)

## Local Development

```bash
npm install
npm start
```

Server berjalan di `http://localhost:3100`

## Environment Variables

```bash
PORT=3100  # Default port
```

## API Endpoints

### Config
- `GET /api/v1/config` - Outlet configuration

### Queue Management
- `GET /api/v1/queue/next` - Preview next queue number
- `GET /api/v1/queue/active` - Get active tickets
- `POST /api/v1/queue/:ticketId/call` - Call customer (preparing → ready)
- `POST /api/v1/queue/:ticketId/recall` - Recall customer (increment call count)
- `POST /api/v1/queue/:ticketId/complete` - Complete order (ready → completed)

### POS
- `POST /api/v1/pos/orders` - Create new order + ticket

### Realtime (SSE)
- `GET /api/v1/tickets/:token/stream` - Customer ticket updates
- `GET /api/v1/staff/stream` - Staff queue board updates

### Pages
- `GET /` or `/pos` - POS Cashier interface (Neo-Brutalist)
- `GET /queue` - Queue board for kitchen/bar staff
- `GET /pelanggan` or `/ticket` - Pratinjau tiket pelanggan (Figma Neo-Brutalist)
- `GET /t/:token` - Live customer ticket with SSE stream
- `GET /sim` - Legacy simulator

## Deployment (Railway)

1. Push code ke GitHub (`Fate120/pager-backend`)
2. Railway otomatis mendeteksi dan melakukan build / deploy
3. Generate domain di Settings → Networking → Public Networking
4. Akses `https://[domain].up.railway.app/pelanggan` atau `/pos`

## Dokumentasi & Spesifikasi Desain
Dokumentasi lengkap PRD, Arsitektur, dan referensi Figma tersimpan di direktori `docs/`:
- `docs/01-PRD.md` - Product Requirements Document
- `docs/02-ARCHITECTURE.md` - Technical Architecture
- `docs/design/FIGMA_SPEC.md` - Neo-Brutalist Design Tokens & Specifications
- `docs/QUICKSTART.md` - Panduan cepat instalasi & pengujian lokal
- `docs/DEPLOY.md` - Panduan deployment cloud
