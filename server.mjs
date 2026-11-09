import express from 'express';
import QRCode from 'qrcode';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { OrderStore } from './lib/store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3100;
const app = express();
const store = new OrderStore(join(__dirname, 'data', 'db.json'));

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// In-memory SSE connections
// ticketToken -> Set of response objects
const ticketSubscribers = new Map();
// Set of staff response objects
const staffSubscribers = new Set();

function broadcastToTicket(token, eventName, data) {
  const subscribers = ticketSubscribers.get(token);
  if (!subscribers || subscribers.size === 0) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch (err) {
      // client disconnected
    }
  }
}

function broadcastToStaff(eventName, data) {
  if (staffSubscribers.size === 0) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of staffSubscribers) {
    try {
      res.write(payload);
    } catch (err) {
      // client disconnected
    }
  }
}

// Global SSE heartbeat every 10 seconds
setInterval(() => {
  const ping = ':ping\n\n';
  for (const set of ticketSubscribers.values()) {
    for (const res of set) {
      try { res.write(ping); } catch (e) {}
    }
  }
  for (const res of staffSubscribers) {
    try { res.write(ping); } catch (e) {}
  }
}, 10000);

// --- API ROUTES ---

// 1. Config
app.get('/api/v1/config', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  res.json({
    outletName: 'Kedai Kopi Aksiva',
    baseUrl: `${protocol}://${host}`
  });
});

// 1b. Next Queue Number (peek without creating)
app.get('/api/v1/queue/next', (req, res) => {
  res.json({
    nextQueue: store.peekNextQueueNumber()
  });
});

// 2. Create POS Order
app.post('/api/v1/pos/orders', async (req, res) => {
  const { paymentMethod = 'cash', items = [], cashPaid = 0, outletName = 'Kedai Kopi Aksiva', customerName = 'Pelanggan', orderType = 'dine_in', tableNo = '' } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Item pesanan tidak boleh kosong' });
  }

  const { order, ticket } = store.createOrder({ paymentMethod, items, cashPaid, outletName, customerName, orderType, tableNo });

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const ticketUrl = `${protocol}://${host}/t/${ticket.token}`;

  // Generate QR Code SVG
  const qrSvg = await QRCode.toString(ticketUrl, {
    type: 'svg',
    margin: 1,
    width: 220,
    color: { dark: '#000000', light: '#ffffff' }
  });

  // Notify staff stream
  broadcastToStaff('order_created', { ticket, order });

  res.status(201).json({
    orderId: ticket.ticketId,
    orderNo: ticket.orderNo,
    queueNumber: ticket.queueNumber,
    ticketToken: ticket.token,
    ticketUrl,
    qrSvg,
    ticket,
    createdAt: ticket.createdAt
  });
});

// 3. Active Tickets for Staff
app.get('/api/v1/queue/active', (req, res) => {
  res.json({
    activeTickets: store.getActiveTickets(),
    allTickets: store.getAllTickets(20)
  });
});

// 4. Call Ticket
app.post('/api/v1/queue/:ticketId/call', (req, res) => {
  const { ticketId } = req.params;
  const ticket = store.callTicket(ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Tiket antrean tidak ditemukan' });
  }

  // Broadcast to customer ticket
  broadcastToTicket(ticket.token, 'ticket_update', ticket);
  // Broadcast to staff
  broadcastToStaff('ticket_updated', { ticket, action: 'call' });

  res.json({ success: true, ticket });
});

// 5. Recall Ticket
app.post('/api/v1/queue/:ticketId/recall', (req, res) => {
  const { ticketId } = req.params;
  const ticket = store.recallTicket(ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Tiket antrean tidak ditemukan' });
  }

  broadcastToTicket(ticket.token, 'ticket_update', ticket);
  broadcastToStaff('ticket_updated', { ticket, action: 'recall' });

  res.json({ success: true, ticket });
});

// 6. Complete Ticket
app.post('/api/v1/queue/:ticketId/complete', (req, res) => {
  const { ticketId } = req.params;
  const ticket = store.completeTicket(ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Tiket antrean tidak ditemukan' });
  }

  broadcastToTicket(ticket.token, 'ticket_update', ticket);
  broadcastToStaff('ticket_updated', { ticket, action: 'complete' });

  res.json({ success: true, ticket });
});

// 7. Get Customer Ticket by Token
app.get('/api/v1/tickets/:token', (req, res) => {
  const { token } = req.params;
  const ticket = store.getTicketByToken(token);
  if (!ticket) {
    return res.status(404).json({ error: 'Tiket antrean tidak ditemukan atau sudah kedaluwarsa' });
  }
  res.json({ ticket });
});

// 8. Customer Realtime SSE Stream
app.get('/api/v1/tickets/:token/stream', (req, res) => {
  const { token } = req.params;
  const ticket = store.getTicketByToken(token);
  if (!ticket) {
    return res.status(404).send('Tiket tidak ditemukan');
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  if (!ticketSubscribers.has(token)) {
    ticketSubscribers.set(token, new Set());
  }
  ticketSubscribers.get(token).add(res);

  // Send initial snapshot
  res.write(`event: ticket_sync\ndata: ${JSON.stringify(ticket)}\n\n`);

  req.on('close', () => {
    const subs = ticketSubscribers.get(token);
    if (subs) {
      subs.delete(res);
      if (subs.size === 0) {
        ticketSubscribers.delete(token);
      }
    }
  });
});

// 9. Staff Realtime SSE Stream
app.get('/api/v1/staff/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  staffSubscribers.add(res);

  // Send initial snapshot
  const activeTickets = store.getActiveTickets();
  res.write(`event: staff_sync\ndata: ${JSON.stringify({ activeTickets })}\n\n`);

  req.on('close', () => {
    staffSubscribers.delete(res);
  });
});

// --- PAGE ROUTING ---

// POS Page
app.get('/pos', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'pos.html'));
});

app.get('/', (req, res) => {
  res.redirect('/pos');
});

// Queue Board Page
app.get('/queue', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'queue.html'));
});

// Customer ticket page (/t/:token, /pelanggan, /ticket, /customer)
app.get(['/t/:token', '/pelanggan', '/ticket', '/customer', '/t'], (req, res) => {
  res.sendFile(join(__dirname, 'public', 'ticket.html'));
});

// Cashier / Staff Simulator (legacy)
app.get('/sim', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'sim.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pager server running at http://localhost:${PORT}`);
  console.log(`Staff POS Simulator: http://localhost:${PORT}/sim`);
});
