import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

export class OrderStore {
  constructor(filePath) {
    this.filePath = filePath;
    mkdirSync(dirname(filePath), { recursive: true });
    this.state = this._load();
    if (!this.state.config) {
      this.state.config = {
        outletName: 'Kedai Kopi Aksiva',
        address: 'Jl. Rinjani No. 12, Semarang',
        phoneNumber: '08562872671',
        receiptCustomText: 'Terima kasih atas kunjungan Anda!'
      };
    }
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
      config: {
        outletName: 'Kedai Kopi Aksiva',
        address: 'Jl. Rinjani No. 12, Semarang',
        phoneNumber: '08562872671',
        receiptCustomText: 'Terima kasih atas kunjungan Anda!'
      },
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

  getConfig() {
    return { ...this.state.config };
  }

  updateConfig(data) {
    this.state.config = {
      ...this.state.config,
      ...data
    };
    this._save();
    return { ...this.state.config };
  }

  getOrders(limit = 50) {
    return [...this.state.orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  getDailySummary(dateStr = new Date().toISOString().slice(0, 10)) {
    const dayOrders = this.state.orders.filter(o => o.createdAt.slice(0, 10) === dateStr);
    const totalRevenue = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = dayOrders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    return { date: dateStr, totalRevenue, totalOrders, averageOrderValue };
  }

  getRevenueTrends(days = 7) {
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOrders = this.state.orders.filter(o => o.createdAt.slice(0, 10) === dateStr);
      const revenue = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      result.push({ date: dateStr, revenue, ordersCount: dayOrders.length });
    }
    return result;
  }

  getTopProducts(limit = 5) {
    const map = {};
    for (const o of this.state.orders) {
      if (Array.isArray(o.items)) {
        for (const it of o.items) {
          const key = it.productName || it.name || 'Menu';
          if (!map[key]) {
            map[key] = { productId: it.productId || 0, productName: key, totalQuantity: 0, totalRevenue: 0 };
          }
          map[key].totalQuantity += (it.quantity || 1);
          map[key].totalRevenue += (it.subtotal || (it.unitPrice * (it.quantity || 1)) || 0);
        }
      }
    }
    return Object.values(map).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, limit);
  }
}
