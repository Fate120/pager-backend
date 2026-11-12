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
    if (!Array.isArray(this.state.categories) || this.state.categories.length === 0) {
      this.state.categories = [
        { id: 1, name: 'Kopi', emoji: '☕', sortOrder: 1 },
        { id: 2, name: 'Non-Kopi', emoji: '🍵', sortOrder: 2 },
        { id: 3, name: 'Makanan', emoji: '🥪', sortOrder: 3 },
        { id: 4, name: 'Camilan', emoji: '🍟', sortOrder: 4 }
      ];
    }
    if (!Array.isArray(this.state.products) || this.state.products.length === 0) {
      this.state.products = [
        { id: 1, categoryId: 1, name: 'Kopi Susu Aksiva', price: 18000, isAvailable: true, emoji: '☕' },
        { id: 2, categoryId: 1, name: 'Americano Double', price: 15000, isAvailable: true, emoji: '☕' },
        { id: 3, categoryId: 1, name: 'Caramel Macchiato', price: 22000, isAvailable: true, emoji: '☕' },
        { id: 4, categoryId: 2, name: 'Matcha Latte Ice', price: 20000, isAvailable: true, emoji: '🍵' },
        { id: 5, categoryId: 2, name: 'Lemon Tea Segar', price: 12000, isAvailable: true, emoji: '🍋' },
        { id: 6, categoryId: 3, name: 'Croissant Cokelat', price: 18000, isAvailable: true, emoji: '🥐' },
        { id: 7, categoryId: 3, name: 'Roti Bakar Srikaya', price: 16000, isAvailable: true, emoji: '🍞' },
        { id: 8, categoryId: 4, name: 'Kentang Goreng Truffle', price: 15000, isAvailable: true, emoji: '🍟' },
      ];
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

    const normalizedItems = (items || []).map((it, idx) => {
      const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
      const quantity = Number(it.quantity ?? 1);
      const name = it.productName || it.itemName || it.name || 'Menu';
      return {
        id: it.id ?? idx + 1,
        productId: it.productId ?? it.id,
        itemName: name,
        productName: name,
        name,
        unitPrice,
        price: unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
        notes: it.notes || ''
      };
    });

    const subtotal = normalizedItems.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
    const totalAmount = subtotal;

    const order = {
      orderId: ticketId,
      id: ticketId,
      orderNo,
      outletName,
      customerName,
      orderType,
      tableNo,
      paymentMethod,
      items: normalizedItems,
      subtotal,
      totalAmount,
      cashPaid: Number(cashPaid) || totalAmount,
      createdAt: now
    };

    const ticket = {
      ticketId,
      id: ticketId,
      orderNo,
      outletName,
      queueNumber,
      customerName,
      orderType,
      tableNo,
      token,
      status: 'preparing', // preparing | ready | completed | cancelled
      callCount: 0,
      itemsSummary: normalizedItems.map(it => `${it.quantity}x ${it.productName}${it.notes ? ` (${it.notes})` : ''}`).join(', ') || 'Pesanan Reguler',
      items: normalizedItems,
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

  getCategories() {
    return [...(this.state.categories || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  getProducts() {
    return [...(this.state.products || [])];
  }

  addProduct(product) {
    const id = this.state.products.length > 0 ? Math.max(...this.state.products.map(p => p.id)) + 1 : 1;
    const newProduct = {
      id,
      categoryId: product.categoryId ? Number(product.categoryId) : null,
      name: product.name || 'Menu Baru',
      price: Number(product.price || 0),
      isAvailable: product.isAvailable !== false,
      emoji: product.emoji || '🍽️'
    };
    this.state.products.push(newProduct);
    this._save();
    return newProduct;
  }

  updateProduct(id, updates) {
    const idx = this.state.products.findIndex(p => p.id === Number(id));
    if (idx === -1) return null;
    this.state.products[idx] = {
      ...this.state.products[idx],
      ...updates,
      id: Number(id)
    };
    this._save();
    return this.state.products[idx];
  }

  deleteProduct(id) {
    const idx = this.state.products.findIndex(p => p.id === Number(id));
    if (idx === -1) return false;
    this.state.products.splice(idx, 1);
    this._save();
    return true;
  }
}
