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
- `GET /` or `/pos` - POS Cashier interface
- `GET /queue` - Queue board for kitchen/bar staff
- `GET /t/:token` - Customer ticket page
- `GET /sim` - Legacy simulator

## Deploy to Render

1. Push code to GitHub
2. Connect Render to repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Environment: `Node`
6. Instance type: `Web Service`
