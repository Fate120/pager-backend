import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OrderStore } from '../lib/store.mjs';

function createTempStore(t) {
  const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'pager-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const dbFile = join(dir, 'test-db.json');
  return { dbFile, store: new OrderStore(dbFile) };
}

test('OrderStore creates order with sequential queueNumber and token', (t) => {
  const { dbFile, store } = createTempStore(t);

  const res1 = store.createOrder({
    paymentMethod: 'cash',
    items: [{ productName: 'Kopi Susu', quantity: 1, unitPrice: 18000, notes: 'Less sugar' }],
    cashPaid: 20000
  });

  assert.equal(res1.ticket.queueNumber, 'A001');
  assert.equal(res1.ticket.status, 'preparing');
  assert.equal(res1.ticket.callCount, 0);
  assert.match(res1.ticket.token, /^[0-9a-f]{48}$/);

  const res2 = store.createOrder({
    paymentMethod: 'qris',
    items: [{ productName: 'Roti Bakar', quantity: 2, unitPrice: 15000 }]
  });
  assert.equal(res2.ticket.queueNumber, 'A002');

  // Verify persistence
  const reloaded = new OrderStore(dbFile);
  const fetched = reloaded.getTicketByToken(res1.ticket.token);
  assert.equal(fetched.queueNumber, 'A001');
  assert.equal(fetched.itemsSummary, '1x Kopi Susu (Less sugar)');
});

test('OrderStore status lifecycle: preparing -> ready (call) -> recall -> completed', (t) => {
  const { store } = createTempStore(t);

  const { ticket } = store.createOrder({
    items: [{ productName: 'Teh Tarik', quantity: 1, unitPrice: 12000 }]
  });

  // Call
  const called = store.callTicket(ticket.ticketId);
  assert.equal(called.status, 'ready');
  assert.equal(called.callCount, 1);
  assert.ok(called.calledAt);

  // Recall
  const recalled = store.recallTicket(ticket.ticketId);
  assert.equal(recalled.status, 'ready');
  assert.equal(recalled.callCount, 2);

  // Complete
  const completed = store.completeTicket(ticket.ticketId);
  assert.equal(completed.status, 'completed');
  assert.ok(completed.completedAt);
});
