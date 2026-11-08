import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

export class OrderStore {
  constructor(filePath) {
    this.filePath = filePath;
    mkdirSync(dirname(filePath), { recursive: true });
    this.state = this._load();
  }

  _load() {
    if (existsSync(this.filePath)) {
      try {
        return JSON.parse(readFileSync(this.filePath, 'utf8'));
      } catch (err) {
        console.error('Failed to load store, initializing empty:', err.message);
      }
    }
    return {
      dailySequence: 0,
      currentDate: new Date().toISOString().slice(0, 10),
      orders: [],
      tickets: {} // token -> ticket
    };
  }

  _save() {
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf8');
    renameSync(tmp, this.filePath);
  }

  _nextQueueNumber() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.state.currentDate !== today) {
      this.state.currentDate = today;
      this.state.dailySequence = 0;
    }
    this.state.dailySequence += 1;
    const num = String(this.state.dailySequence).padStart(3, '0');
    return `A${num}`;
  }

  peekNextQueueNumber() {
    const today = new Date().toISOString().slice(0, 10);
    let seq = this.state.dailySequence;
    if (this.state.currentDate !== today) {
      seq = 0;
    }
    const num = String(seq + 1).padStart(3, '0');
    return `A${num}`;
  }

  createOrder({ paymentMethod = 'cash', items = [], cashPaid = 0, outletName = 'Kedai Kopi Aksiva', customerName = 'Pelanggan', orderType = 'dine_in', tableNo = '' }) {
    const now = new Date().toISOString();
    const queueNumber = this._nextQueueNumber();
    const orderNo = `TRX-${now.slice(0, 10).replace(/-/g, '')}-${String(this.state.orders.length + 1).padStart(4, '0')}`;
    const token = randomBytes(24).toString('hex');
    const ticketId = randomBytes(16).toString('hex');

    const subtotal = items.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
    const totalAmount = subtotal; // no tax for simple mvp

    const order = {
      orderId: ticketId,
      orderNo,
      outletName,
      customerName,
      orderType,
      tableNo,
      paymentMethod,
      items,
      subtotal,
      totalAmount,
      cashPaid,
      createdAt: now
    };

    const ticket = {
      ticketId,
      orderNo,
      outletName,
      queueNumber,
      customerName,
      orderType,
      tableNo,
      token,
      status: 'preparing', // preparing | ready | completed | cancelled
      callCount: 0,
      itemsSummary: items.map(it => `${it.quantity}x ${it.productName}${it.notes ? ` (${it.notes})` : ''}`).join(', ') || 'Pesanan Reguler',
      items,
      totalAmount,
      createdAt: now,
      calledAt: null,
      completedAt: null
    };

    this.state.orders.push(order);
    this.state.tickets[token] = ticket;
    this._save();

    return { order, ticket };
  }

  getTicketByToken(token) {
    return this.state.tickets[token] ? { ...this.state.tickets[token] } : null;
  }

  getTicketById(ticketId) {
    return Object.values(this.state.tickets).find(t => t.ticketId === ticketId) || null;
  }

  getActiveTickets() {
    return Object.values(this.state.tickets)
      .filter(t => t.status === 'preparing' || t.status === 'ready')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getAllTickets(limit = 30) {
    return Object.values(this.state.tickets)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  callTicket(ticketId) {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return null;
    ticket.status = 'ready';
    ticket.callCount += 1;
    ticket.calledAt = new Date().toISOString();
    this.state.tickets[ticket.token] = ticket;
    this._save();
    return { ...ticket };
  }

  recallTicket(ticketId) {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return null;
    if (ticket.status !== 'ready') {
      ticket.status = 'ready';
    }
    ticket.callCount += 1;
    ticket.calledAt = new Date().toISOString();
    this.state.tickets[ticket.token] = ticket;
    this._save();
    return { ...ticket };
  }

  completeTicket(ticketId) {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return null;
    ticket.status = 'completed';
    ticket.completedAt = new Date().toISOString();
    this.state.tickets[ticket.token] = ticket;
    this._save();
    return { ...ticket };
  }
}
