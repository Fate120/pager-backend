# PRD — Pager: Sistem POS Ringan & Digital Pager Terpadu untuk F&B

| Metadata | Keterangan |
|---|---|
| **Nama Produk** | Pager (POS Ringan + Pager Digital F&B) |
| **Versi** | 1.0.0 |
| **Status** | Konsep Terkunci / Siap Spesifikasi Teknis |
| **Target Pengguna** | Bisnis F&B (Kafe, Warung Makan, Kedai Kopi, Food Court, Fast Casual) |

---

## 1. Latar Belakang & Masalah

### 1.1 Masalah Operasional F&B
1. **Penumpukan Antrean di Depan Konter**: Pelanggan takut tertinggal pesanannya sehingga bergerombol di area pengambilan.
2. **Keterbatasan Pager Fisik (Buzzer Hardware)**:
   - Biaya perangkat mahal (jutaan rupiah per set).
   - Risiko hilang, terjatuh/rusak, baterai aus.
   - Jangkauan sinyal radio terbatas.
   - Beban disinfeksi/kebersihan perangkat antar-pelanggan.
3. **Friksi Dua Sistem Terpisah**:
   - Jika POS kasir dan sistem antrean terpisah, kasir harus input 2 kali (sekali di POS, sekali di sistem antrean).
   - Printer thermal sering bentrok jika diakses oleh dua aplikasi terpisah di satu tablet.
   - Risiko human error: nomor bon POS tidak sinkron dengan nomor antrean/panggilan.

### 1.2 Solusi: Sistem Terpadu (All-in-One)
Mengintegrasikan **POS Kasir Ringan** dan **Digital Pager** dalam satu aplikasi tablet:
- Kasir mencatat pesanan & pembayaran.
- Printer thermal otomatis mengeluarkan **1 struk terpadu** (Rincian pembayaran + Nomor antrean besar + Kode QR tiket pelanggan).
- Pelanggan memindai QR menggunakan kamera HP mereka: **langsung melihat nomor dan status pesanan tanpa install aplikasi, tanpa registrasi/login, dan tanpa isi formulir**.
- Dapur/kasir menekan tombol panggil saat pesanan siap -> HP pelanggan otomatis berdering/bergetar dan berubah visual secara realtime.

---

## 2. Tujuan & Batasan (Goals & Non-Goals)

### 2.1 Goals (Tujuan Utama)
1. **Zero-Friction Customer Experience**: Dari scan QR hingga melihat tiket dan status pesanan butuh waktu $\le 3$ detik tanpa hambatan autentikasi.
2. **Single-Receipt Printing**: Struk transaksi dan QR antrean tercetak dalam 1 kertas thermal tanpa perlu sobek manual terpisah atau ganti aplikasi.
3. **Realtime Notification Latency**: Pembaruan status dari kasir ("Panggil") diterima web pelanggan dalam waktu $\le 1$ detik pada koneksi internet standar.
4. **Multi-Tenant Ready**: Arsitektur dirancang mendukung banyak outlet/tenant secara terisolasi.
5. **Anti-Human Error di Kasir**: Tombol panggil memiliki konfirmasi cepat (dialog verifikasi nomor & ringkasan menu) agar kasir tidak salah memanggil nomor tetangga (*fat-finger protection*).

### 2.2 Non-Goals (Batasan Versi 1.0)
- Bukan sistem inventaris gudang kompleks atau manajemen resep bahan baku (*ERP/Cost of Goods Sold*).
- Tidak menyediakan fitur pesan antar mandiri (*delivery e-commerce*) atau kurir eksternal.
- Tidak menjamin suara berbunyi saat layar HP pelanggan terkunci atau browser ditutup (karena batasan sandbox browser mobile / OS policy). Pengalaman utama difokuskan pada web interaktif saat layar aktif.
- Pembayaran otomatis gateway bank/QRIS dinamis otomatis belum masuk di v1.0 (menggunakan Cash & QRIS Statis/Manual yang dikonfirmasi kasir).

---

## 3. Persona Pengguna

1. **Pelanggan (Customer)**
   - Menginginkan kepastian status makanan tanpa perlu berdiri menunggu di depan kasir.
   - Tidak mau ribet mengunduh aplikasi atau mengisi data pribadi hanya untuk menunggu pesanan.
2. **Kasir / Staf Konter**
   - Mengoperasikan tablet kasir berkecepatan tinggi saat jam sibuk (*rush hour*).
   - Butuh alur transaksi cepat: pilih menu -> input catatan -> bayar -> struk keluar -> panggil saat siap.
3. **Pemilik Bisnis (Owner / Tenant)**
   - Memantau rekap transaksi harian dan rata-rata waktu penyajian.
   - Mengelola daftar menu, harga, dan ketersediaan stok menu.

---

## 4. Alur Pengguna (User Journey)

```
[ PELANGGAN ]                                             [ KASIR / TABLET ]
      │                                                           │
      │ 1. Datang ke kasir & sebutkan pesanan                    │
      │──────────────────────────────────────────────────────────►│
      │                                                           │ 2. Input menu & catatan
      │                                                           │ 3. Pilih Cash / QRIS
      │ 4. Lakukan pembayaran                                     │ 4. Konfirmasi bayar
      │──────────────────────────────────────────────────────────►│
      │                                                           │ 5. Terbit nomor (misal: A023)
      │                                                           │ 6. Printer cetak 1 struk:
      │                                                           │    - Detail pesanan
      │ 7. Terima struk kertas dari kasir                         │    - Nomor A023 BESAR
      │◄──────────────────────────────────────────────────────────│    - QR Code Tiket
      │                                                           │
      │ 8. Scan QR menggunakan kamera HP                          │
      │    (Membuka web: /t/[token])                              │
      │    Layar HP: "Nomor A023 - Sedang Disiapkan"             │
      │    [Opsional: Tap 'Aktifkan Suara']                       │
      │                                                           │
      │ 9. Duduk santai di meja                                   │ 10. Dapur selesai masak
      │                                                           │ 11. Kasir tap tombol [A023]
      │                                                           │ 12. Modal konfirmasi:
      │                                                           │     "Panggil A023?" -> [Ya]
      │ 13. HP Berdering (Chime) + Layar Hijau menyala:           │
      │     "PESANAN SELESAI! Silakan Ambil di Kasir"             │
      │◄───────────────── (Realtime Event) ───────────────────────│
      │                                                           │
      │ 14. Menuju kasir menunjukkan nomor A023                   │
      │──────────────────────────────────────────────────────────►│
      │ 15. Ambil makanan                                         │ 16. Kasir tap [Selesai]
      │                                                           │     (Tiket diarsipkan)
```

---

## 5. Kebutuhan Fungsional (Functional Requirements)

### Modul 1: Aplikasi Kasir & Tablet (Flutter)
- **FR-K01 (Katalog & Keranjang Cepat)**:
  - Tampilan grid produk kategori F&B (Makanan, Minuman, Tambahan).
  - Variasi & catatan per item (misal: "Level 3", "Tanpa Bawang", "Kurang Manis").
- **FR-K02 (Pembayaran Cepat)**:
  - Tunai (dengan kalkulator kembalian cepat) dan Non-Tunai / QRIS Statis.
- **FR-K03 (Generator Nomor Pesanan Harian)**:
  - Nomor urut harian otomatis format alfabet + 3 angka (contoh: `A001`, `A002`, ..., reset tiap hari).
- **FR-K04 (Pencetakan Struk Thermal Otomatis)**:
  - Terhubung via Bluetooth / USB / Network ke printer thermal 58mm atau 80mm.
  - Mencetak layout struk terpadu: Header Toko -> Rincian Item -> Total Pembayaran -> Garis Pembatas -> Nomor Antrean Ekstra Besar -> QR Code Resolusi Jelas -> Pesan panduan scan.
- **FR-K05 (Papan Antrean Aktif / Active Board)**:
  - Daftar kartu/tombol nomor antrean aktif yang sedang disiapkan.
  - Menampilkan nomor antrean, ringkasan menu, dan timer durasi tunggu (misal: "8 mnt lalu").
  - Filter status: *Sedang Disiapkan (Preparing)*, *Siap Diambil (Ready)*, dan *Selesai (Completed)*.
- **FR-K06 (Aksi Panggil dengan Pelindung Salah Tekan)**:
  - Saat tombol antrean ditekan, muncul popup konfirmasi cepat berisi: Nomor Pesanan, Item Menu, dan tombol `[Batal]` serta `[Panggil Sekarang]`.
- **FR-K07 (Panggil Ulang / Recall)**:
  - Jika pelanggan belum datang mengambil, tombol antrean berstatus *Ready* menyediakan opsi `[Panggil Ulang]`.
- **FR-K08 (Penyelesaian Pesanan)**:
  - Kasir menekan `[Selesai]` saat makanan diserahkan. Tiket berpindah ke riwayat arsip.

### Modul 2: Layar Tiket Pelanggan (Web Mobile)
- **FR-C01 (Akses Instan Tanpa Hambatan)**:
  - Dibuka via URL unik bertoken acak kriptografis (contoh: `/t/a1b2c3d4e5f6...`).
  - Tidak meminta izin kamera, lokasi, atau pendaftaran akun.
- **FR-C02 (Visualisasi Status Kontras Tinggi)**:
  - Status 1 — **Sedang Disiapkan**: Indikator warna netral/oranye, teks jelas *"Pesanan Anda sedang disiapkan di dapur"*.
  - Status 2 — **Siap Diambil**: Seluruh latar beranimasi pulsa hijau kontras, teks besar *"PESANAN SELESAI! Silakan Ambil di Kasir"*.
  - Status 3 — **Selesai**: Pesan terima kasih dan ringkasan transaksi.
- **FR-C03 (Audio Chime & Getaran)**:
  - Menyediakan tombol opsional *"Aktifkan Suara"* untuk membuka izin Web Audio API di browser.
  - Membunyikan nada bel chime sintetis dan getaran (`navigator.vibrate`) seketika sinyal status berubah ke *Ready* atau saat *Recall*.
- **FR-C04 (Ketahanan Jaringan & Auto-Reconnect)**:
  - Menampilkan indikator jika koneksi terputus ("Menghubungkan kembali...").
  - Begitu koneksi pulih atau layar dibuka kembali dari sleep, halaman otomatis melakukan sinkronisasi status terbaru.

### Modul 3: Backend & Manajemen Multi-Tenant
- **FR-B01 (Multi-Tenancy & Isolasi Data)**:
  - Setiap outlet memiliki ID terpisah. Nomor antrean terisolasi per tenant.
- **FR-B02 (Kanal Komunikasi Realtime)**:
  - Endpoint Server-Sent Events (SSE) atau WebSocket ringan dengan latensi sub-detik untuk mendistribusikan event perubahan status tiket ke web pelanggan.
- **FR-B03 (Laporan Ringkas Harian)**:
  - Rekap jumlah transaksi, omzet harian per metode bayar, dan rata-rata waktu tunggu pesanan.
