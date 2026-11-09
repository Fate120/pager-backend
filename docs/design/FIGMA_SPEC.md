# Spesifikasi Desain Figma — PAGER (POS & Digital Pager)

| Sumber | Detail |
|---|---|
| **File Figma** | `1xmLJi8ix8N6Tbs6mx9mE5` (Aksiva-Design) |
| **Halaman (Canvas)** | `Pager Project` (`182:38`) |
| **Frame Utama** | 1. `Kasir & Katalog (POS)` (`182:881`)<br>2. `Papan Antrean (Queue Board)` (`182:39`)<br>3. `Papan Antrean (Direct Call)` (`182:483`) |
| **Aset Screenshot Hasil Ekspor** | `design/frame_182_881.png`<br>`design/frame_182_39.png`<br>`design/frame_182_483.png` |

---

## 1. Gaya Visual & Desain Sistem (Neo-Brutalist / Modern Industrial)

Desain mengadopsi estetika **Neo-Brutalist Industrial Modern** yang sangat fungsional untuk kasir & dapur F&B:
- **Outline & Stroke**: Garis tepi hitam tegas (`border: 2px solid #000000` / `#1E293B`).
- **Hard Drop Shadows**: Bayangan offset kaku tanpa blur berlebih (`box-shadow: 3px 3px 0px #000000`).
- **High-Contrast Data**: Angka nomor antrean, total harga, dan tombol aksi menggunakan kontras maksimal agar terbaca jelas dari jarak 1-2 meter di lingkungan kasir yang sibuk.

### Palet Warna Resmi (Color Palette)
- **Primary Action (Blue)**: `#1E60EC` (Tombol Bayar & Panggil Sekarang, Tab Aktif, Pill Kategori Aktif).
- **Attention / Queue Token (Yellow)**: `#FFCC00` (Kotak nomor antrean `NEXT QUEUE: A024`, Total Akhir, Badge Best Seller).
- **Success / Ready (Mint Green)**: `#D2F8D2` / `#10B981` (Kartu pesanan Siap Diambil, Tombol Serahkan, Indikator Kitchen Sync).
- **Urgent / Delayed (Coral Red)**: `#DC2626` / `#EF4444` (Badge keterlambatan waktu `> 8 mnt`, Tombol Recall darurat).
- **Canvas Background**: Warm Light Off-White / Gray (`#EFEFEA` / `#F4F4F0`).
- **Card Surface**: Pure White (`#FFFFFF`).
- **Borders & Typography**: Pitch Black (`#000000`) & Deep Slate (`#0F172A`).

### Tipografi
- **Interface & Heading**: Sans-serif geometris modern (*Plus Jakarta Sans* / *Inter* / *Space Grotesk*).
- **Data & Numeric Display**: Monospace (*JetBrains Mono* / *Chivo Mono*) untuk nomor antrean (`A023`), harga (`Rp 20.000`), jam (`14:32`), dan latensi (`14ms`).

---

## 2. Rincian Antarmuka Frame

### 2.1 Frame 1: Kasir & Katalog (POS) — `182:881`
1. **Top Bar**:
   - Logo: `PAGER POS & PAGER DIGITAL`
   - Store selector: `[☕ KEDAI KOPI AKSIVA]`
   - Tab navigasi: `[Kasir & Katalog (POS)]` (aktif) vs `[Papan Antrean]`
   - Hardware telemetry: `● Printer Thermal: Ready [58mm]` | `Kasir: Budi` | `14:32` | Avatar.
2. **Left Panel (Katalog & Menu)**:
   - Search bar: `"Cari menu kopi, snack..."` + Tombol `FILTER`.
   - Operational chips: `● JAM SIBUK: 12 TRX/JAM` | `✓ Kitchen Synced`.
   - Category pills: `Semua (24)`, `Minuman Kopi`, `Non-Kopi`, `Makanan & Toast`, `Snack`, `Ekstra`.
   - Grid Menu (8 kartu produk dengan foto, tag kategori, deskripsi, harga, dan tombol `+`).
3. **Right Panel (Order Controller & Cart)**:
   - Header: `ORDER CONTROLLER / Pesanan Baru` + `NEXT QUEUE: A024` (kotak kuning neo-brutalist).
   - Tipe pesanan: Toggle segmented `Dine In (Meja)` vs `Takeaway (Bungkus)`.
   - Item Cart: Nama menu, harga satuan, modifier (`Less Sugar, Less Ice`), stepper `[-] 2 [+]`, subtotal, tombol hapus.
   - Ringkasan Tagihan: Subtotal, Pajak PB1 (Included), TOTAL AKHIR (`Rp 62.000`).
   - Pembayaran: `Tunai / Cash` vs `QRIS Statis`.
   - Nominal Cepat: `Pas (62k)`, `Rp 70.000`, `Rp 100.000` + Kalkulator `Kembalian: Rp 8.000`.
   - Primary CTA: **`[BAYAR & CETAK STRUK + PAGER]`** (Cetak struk + nomor antrean + QR tiket).
   - Sub-status: `● Printer ESC/POS: OK (58mm) | Test Feed`.

### 2.2 Frame 2 & 3: Papan Antrean (Queue Board & Direct Call) — `182:39` & `182:483`
1. **Top Metrics (KPI Dapur & Bar)**:
   - `Antrean Dapur: 04 Tiket`
   - `Siap Diserahkan: 02 Tiket`
   - `Kecepatan Bar: 6.4 Mnt (Sesuai SLA < 8.0 mnt)`
   - `Selesai Hari Ini: 41 Pesanan (Total IDR 1.280.000)`
2. **Filter & Quick Actions**:
   - Filter: `Semua Antrean [6]`, `Sedang Disiapkan [4]`, `Siap Diambil [2]`.
   - Quick actions: `[Tampilkan QR di Tablet]` | `[Cetak Ulang Tiket]`.
3. **Grid Kartu Antrean**:
   - **Kartu Disiapkan**: Latar putih, border hitam, nomor besar (`A023`), nama pemesan, tipe dine-in/takeaway, rincian menu & catatan, timer durasi (`⏱️ 8 mnt lalu`), tombol aksi utama: **`[📢 PANGGIL SEKARANG]`**.
   - **Modal Konfirmasi Panggilan**:
     - Pop-up modal kaku saat tombol panggil ditekan.
     - Nomor besar `A023`, nama pemesan, daftar cek fisik produk yang siap diserahkan.
     - Tombol: `[✕ Batal / Belum Siap]` dan `[📢 YA, PANGGIL SEKARANG!]`.
   - **Kartu Siap Diambil (Ready)**: Latar hijau mint (`#D2F8D2`), badge `Dipanggil 1x (2 mnt)`, tombol `[↺ PANGGIL ULANG]` dan `[✔ SERAHKAN]`.
   - **Kartu Overdue**: Badge merah `🔔 Dipanggil 2x (5 mnt)`, tombol `[↺ RECALL (3x)]` dan `[✔ SERAHKAN]`.
4. **Bottom Audio & Pager Relay Bar**:
   - `Sistem Web Audio Chime & Pager Relay Aktif`
   - `🟢 WebSocket Live: 14ms`
   - Tombol `[Uji Suara Bell]`.
