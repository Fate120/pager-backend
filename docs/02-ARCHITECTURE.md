# Spesifikasi Arsitektur Sistem — Pager (POS Ringan & Digital Pager)

| Metadata | Keterangan |
|---|---|
| **Sistem** | Pager: All-in-One POS & Digital Queue Pager |
| **Versi** | 1.0.0 |
| **Penyusun** | Tim Arsitektur Software Aksiva |
| **Dokumen Terkait** | `01-PRD.md` |

---

## 1. Arsitektur Komponen & Topologi

Sistem terbagi menjadi 3 komponen utama yang beroperasi secara terpadu:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TOPOLOGI SISTEM                                      │
│                                                                                        │
│  [ TABLET KASIR ]                                            [ SMARTPHONE PELANGGAN ]  │
│  Aplikasi Flutter Native                                     Web Browser Mobile        │
│  - POS & Katalog Menu                                        (Tanpa install / login)   │
│  - Tombol Papan Antrean                                      - Tiket Digital           │
│  - Driver Printer Thermal                                    - Web Audio API Chime     │
│         │                                                    - Realtime Event Stream   │
│         │ 1. Transaksi Selesai                                       ▲                 │
│         ▼                                                            │                 │
│  ┌───────────────────────┐                                           │                 │
│  │ Printer Thermal       │                                           │                 │
│  │ (Bluetooth / USB)     │                                           │                 │
│  │ - Struk + QR Pager    │                                           │                 │
│  └──────────┬────────────┘                                           │                 │
│             │                                                        │                 │
│             │ 2. Scan QR                                             │                 │
│             └────────────────────────────────────────────────────────┘                 │
│                                                                                        │
│         │ REST API (HTTPS)                                           │ SSE / Stream    │
│         ▼                                                            │                 │
│  ┌───────────────────────────────────────────────────────────────────┴───────────────┐ │
│  │                           BACKEND CLOUD SERVICES                                  │ │
│  │  - Auth & Multi-Tenancy (Outlet Isolation)                                        │ │
│  │  - Transaksi & Generator Nomor Antrean Atomik                                     │ │
│  │  - Realtime Event Broker (Server-Sent Events)                                     │ │
│  └──────────────────────────────────────┬────────────────────────────────────────────┘ │
│                                         │                                              │
│                                         ▼                                              │
│                            ┌────────────────────────┐                                  │
│                            │ Database Transaksional │                                  │
│                            │ (PostgreSQL / MySQL)   │                                  │
│                            └────────────────────────┘                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack & Pemilihan Teknologi

| Layer | Komponen | Rekomendasi Stack | Alasan Teknis |
|---|---|---|---|
| **Kasir / Tablet** | App Client | **Flutter (Dart)** | - Performa UI 60fps untuk tablet Android / iPadOS.<br>- Ekosistem paket printer hardware matang (`esc_pos_utils_plus`, `print_bluetooth_thermal`).<br>- Satu codebase untuk multiplatform jika kasir memakai Windows/Android. |
| **Pelanggan** | Web Ticket | **Lightweight Web (Preact / Vanilla ES6 + Tailwind)** | - Ukuran bundle super kecil (< 30 KB) agar langsung terbuka < 1 detik di koneksi seluler 3G/4G.<br>- Kompatibel dengan Web Audio API & Vibration API.<br>- Bebas dependensi instalasi app. |
| **Backend API** | API Gateway & Service | **Node.js (Fastify / Express) atau Laravel 11** | - RESTful JSON API cepat dan terstruktur.<br>- Mendukung streaming Server-Sent Events (SSE) native dengan latensi sub-detik tanpa membebani server. |
| **Database** | Persistence Layer | **PostgreSQL / MySQL 8 (InnoDB)** | - Transaksional ACID ketat.<br>- Mekanisme Row-Level Locking (`FOR UPDATE`) untuk counter nomor harian agar anti-race condition. |
| **Realtime Channel** | Notifikasi Panggilan | **Server-Sent Events (SSE)** | - Komunikasi satu arah server -> HP pelanggan yang sangat ringan.<br>- Berjalan di port HTTPS standar (443) tanpa repot konfigurasi WebSocket gateway.<br>- Auto-reconnect bawaan browser via `EventSource`. |

---

## 3. Desain Struk Thermal Terpadu (Unified ESC/POS Layout)

Struk dicetak dalam **1 lembar utuh** langsung setelah transaksi selesai:

```text
+------------------------------------------+
|             KEDAI KOPI AKSIVA            |
|       Jl. Affandi No. 12, Yogyakarta     |
| 2026-11-03 14:20          Kasir: Budi    |
| No: TRX-20261103-0042                    |
|------------------------------------------|
| 2x Kopi Susu Aren Gula Aren       40.000 |
|    (Catatan: Less Sugar)                 |
| 1x Toast Coklat Keju              22.000 |
|------------------------------------------|
| TOTAL                            62.000  |
| PEMBAYARAN (QRIS)                62.000  |
| KEMBALI                               0  |
|==========================================|
|              NOMOR PESANAN               |
|                                          |
|                 A023                     |   <-- Cetak font ekstra besar
|                                          |       (Double Width + Double Height)
|                 [   ]                    |
|                 [QR ]                    |   <-- QR Code Resolusi Tinggi
|                 [   ]                    |       Ukuran: 6-8 dots/module
|                                          |
|      Scan QR ini dengan kamera HP        |
|    untuk memantau status pesanan Anda    |
|   HP akan berdering saat pesanan siap    |
+------------------------------------------+
  (Auto Cut / Garis Sobek Manual)
```

---

## 4. State Machine & Siklus Hidup Pesanan

```text
┌──────────────┐     Kasir Konfirmasi Bayar     ┌────────────────┐
│  DRAFT /     ├───────────────────────────────►│   PREPARING    │
│  KERANJANG   │                                │  (Disiapkan)   │
└──────────────┘                                └───────┬────────┘
                                                        │
                                                        │ Kasir Tap [Panggil]
                                                        │ + Dialog Konfirmasi
                                                        ▼
                                                ┌────────────────┐
                      ┌─────────────────────────┤     READY      │◄───┐
                      │                         │ (Siap Diambil) │    │ Panggil Ulang
                      │                         └───────┬────────┘    │ (Recall)
                      │                                 │             │
                      │ Makanan Diserahkan              └─────────────┘
                      │ Kasir Tap [Selesai]
                      ▼
               ┌────────────────┐
               │   COMPLETED    │
               │   (Selesai)    │
               └────────────────┘
```

### Event Realtime Matrix:
- **Event `ticket:preparing`**: Layar web menampilkan nomor pesanan dengan kartu status kuning/oranye *"Pesanan sedang disiapkan di dapur"*.
- **Event `ticket:ready`**: 
  1. Layar web berubah menjadi hijau mencolok dengan animasi denyut (*pulse animation*).
  2. Web Audio API membunyikan nada lonceng (*chime*) 2-nada (800Hz -> 1060Hz).
  3. `navigator.vibrate([500, 250, 500])` memicu getaran di HP yang mendukung.
  4. Judul dokumen browser diubah menjadi: *"🔔 PESANAN SIAP! - A023"*.
- **Event `ticket:recall`**: Mengulang pemutaran suara chime dan getaran jika pelanggan belum mendekati kasir.
- **Event `ticket:completed`**: Layar web menampilkan ucapan terima kasih *"Pesanan telah diambil. Selamat menikmati!"*.

---

## 5. Skema Basis Data Relasional

```sql
-- 1. Tabel Tenant / Toko (Multi-Tenant Isolation)
CREATE TABLE tenants (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Counter Nomor Harian (Pencegah Duplikasi Nomor)
CREATE TABLE daily_counters (
    tenant_id VARCHAR(36) NOT NULL,
    business_date DATE NOT NULL,
    prefix VARCHAR(5) DEFAULT 'A',
    last_sequence INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, business_date),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 3. Tabel Transaksi / Pesanan
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    tenant_id VARCHAR(36) NOT NULL,
    order_no VARCHAR(32) NOT NULL, -- TRX-20261103-0042
    payment_method ENUM('cash', 'qris', 'card') NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    tax DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    cash_paid DECIMAL(12,2) DEFAULT 0,
    cash_change DECIMAL(12,2) DEFAULT 0,
    cashier_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 4. Tabel Detail Item Pesanan
CREATE TABLE order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    notes VARCHAR(200),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 5. Tabel Tiket Antrean (Digital Pager)
CREATE TABLE queue_tickets (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    tenant_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL UNIQUE,
    queue_number VARCHAR(10) NOT NULL, -- Contoh: 'A023'
    token VARCHAR(64) NOT NULL UNIQUE, -- Opaque token acak untuk URL publik
    status ENUM('preparing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'preparing',
    call_count INT NOT NULL DEFAULT 0,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_token (token),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

---

## 6. Spesifikasi Antarmuka API (API Contract)

### 6.1 Endpoint Kasir / Tablet (Private / Auth Bearer)
- `POST /api/v1/pos/orders`
  - Request:
    ```json
    {
      "paymentMethod": "cash",
      "items": [
        { "productName": "Kopi Susu Aren", "quantity": 2, "unitPrice": 20000, "notes": "Less ice" },
        { "productName": "Toast Coklat", "quantity": 1, "unitPrice": 22000, "notes": "" }
      ],
      "cashPaid": 70000
    }
    ```
  - Response:
    ```json
    {
      "orderId": "uuid-...",
      "orderNo": "TRX-20261103-0042",
      "queueNumber": "A023",
      "ticketToken": "e7b9a5c8...",
      "qrUrl": "https://pager.aksiva.id/t/e7b9a5c8...",
      "createdAt": "2026-11-03T14:20:15Z"
    }
    ```
- `GET /api/v1/queue/active`
  - Mengambil daftar antrean aktif (*preparing* & *ready*) untuk papan antrean tablet.
- `POST /api/v1/queue/:ticketId/call`
  - Kasir memanggil pesanan -> mengubah status ke *ready* dan memicu broadcast realtime.
- `POST /api/v1/queue/:ticketId/recall`
  - Kasir memanggil ulang -> menambah counter `call_count` dan memicu ulang broadcast audio.
- `POST /api/v1/queue/:ticketId/complete`
  - Menandai pesanan telah diserahkan ke pelanggan.

### 6.2 Endpoint Pelanggan (Publik / No Auth / Token-based)
- `GET /api/v1/tickets/:token`
  - Mengambil data tiket publik:
    ```json
    {
      "outletName": "Kedai Kopi Aksiva",
      "queueNumber": "A023",
      "status": "preparing",
      "callCount": 0,
      "itemsSummary": "2x Kopi Susu Aren, 1x Toast Coklat",
      "createdAt": "2026-11-03T14:20:15Z"
    }
    ```
- `GET /api/v1/tickets/:token/stream` (Content-Type: `text/event-stream`)
  - Kanal SSE untuk menerima event perubahan status secara realtime.
  - Heartbeat dikirim tiap 15 detik (`:ping`).

---

## 7. Penanganan Kegagalan & Ketahanan Sistem (Fault Tolerance)

1. **Kegagalan Printer Thermal (Kertas Habis / Bluetooth Terputus)**:
   - Data transaksi dan tiket antrean telah tersimpan aman di database sebelum perintah cetak dikirim.
   - Layar tablet kasir menyediakan tombol darurat: `[Tampilkan QR di Layar Tablet]` dan `[Cetak Ulang Tiket]`.
2. **Koneksi Internet Pelanggan Terputus Sementara**:
   - Jika sinyal SSE terputus, script web pelanggan menampilkan bar status kuning: *"Koneksi terputus. Mencoba menghubungkan kembali..."*.
   - Saat koneksi pulih atau saat tab browser kembali difokuskan (`visibilitychange` event), web otomatis menembak `GET /api/v1/tickets/:token` untuk menyelaraskan status terkini.
3. **Pelanggan Tidak Mengaktifkan Tombol Suara**:
   - Sistem tidak memblokir antrean. Pengingat visual (layar hijau terang berdenyut + getaran haptic) tetap berfungsi penuh.
4. **Pencegahan Nomor Ganda (Concurrency Safety)**:
   - Penambahan urutan nomor pesanan harian dijalankan di dalam blok transaksi SQL dengan `SELECT ... FOR UPDATE` pada tabel `daily_counters` agar mustahil terjadi nomor kembar saat ada beberapa tablet kasir yang mencatat order bersamaan.
