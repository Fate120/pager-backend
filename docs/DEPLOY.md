# 🚀 Panduan Deploy ke Render (Gratis)

## Persiapan

### 1. Buat Akun Render
- Buka https://render.com
- Sign up dengan GitHub (recommended) atau email
- Verifikasi email

### 2. Push Code ke GitHub

```bash
cd "D:/Documents/Aksiva Studio/pager/backend"

# Initialize git (jika belum)
git init

# Add remote (ganti dengan repo kamu)
git remote add origin https://github.com/USERNAME/pager-backend.git

# Commit semua file
git add .
git commit -m "Initial commit - Pager POS & Digital Queue"

# Push ke GitHub
git push -u origin main
```

**Atau buat repo baru di GitHub:**
1. Buka https://github.com/new
2. Nama repo: `pager-backend`
3. Public atau Private (terserah)
4. Jangan centang "Initialize with README"
5. Create repository
6. Ikuti instruksi "push an existing repository" yang muncul

---

## Deploy ke Render

### 1. Buat Web Service Baru
1. Login ke https://dashboard.render.com
2. Klik **"+ New"** → **"Web Service"**
3. Pilih **"Connect a repository"**
4. Authorize Render akses ke GitHub
5. Pilih repository `pager-backend`

### 2. Konfigurasi Service

**Build & Deploy:**
- **Name:** `pager-backend` (atau nama lain, ini jadi subdomain)
- **Region:** `Singapore` (paling dekat) atau `Oregon`
- **Branch:** `main`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Instance Type:**
- Pilih **"Free"** ($0/bulan, 750 jam gratis)
- CPU: 0.1 CPU
- RAM: 512 MB
- Auto-sleep setelah 15 menit idle

**Advanced Settings (Optional):**
- **Environment Variables:** (kosongkan dulu, PORT otomatis diatur Render)
- **Health Check Path:** `/api/v1/config`

### 3. Deploy
1. Klik **"Create Web Service"**
2. Render akan otomatis:
   - Clone repo
   - Run `npm install`
   - Run `npm start`
   - Assign public URL

**Proses deploy ~2-3 menit pertama kali**

### 4. Akses Aplikasi

Setelah deploy berhasil (status "Live" hijau), URL akan muncul:

```
https://pager-backend-XXXX.onrender.com
```

**Test endpoints:**
- `https://pager-backend-XXXX.onrender.com/` → POS Cashier
- `https://pager-backend-XXXX.onrender.com/queue` → Queue Board
- `https://pager-backend-XXXX.onrender.com/api/v1/config` → API health check

---

## ⚠️ Penting: Free Tier Render

### Cold Start
- Service otomatis **sleep** setelah 15 menit tidak ada traffic
- Saat ada request pertama setelah sleep, **butuh ~30 detik** untuk bangun (cold start)
- Request berikutnya instant selama masih aktif

### Solusi Cold Start untuk Demo
1. **Buka tab browser** ke `https://pager-backend-XXXX.onrender.com` **5 menit sebelum demo** → server bangun
2. Atau upgrade ke **Starter plan** ($7/bulan) untuk always-on instance

### Data Persistence
- File `data/db.json` **akan hilang** setiap kali service restart/redeploy
- Untuk data persistent, upgrade nanti dengan:
  - Render Disk (persistent volume)
  - Atau pakai PostgreSQL/Redis (gratis included di Render)

---

## Share ke Orang Lain

Setelah deploy live, share link ini:

### Untuk Kasir:
```
https://pager-backend-XXXX.onrender.com/pos
```

### Untuk Dapur/Bar (Queue Board):
```
https://pager-backend-XXXX.onrender.com/queue
```

### Untuk Pelanggan:
- Scan QR Code yang muncul di struk kasir
- Atau buka link dari kasir setelah checkout

---

## Troubleshooting

### Deploy Gagal
- Cek **Logs** di Render dashboard
- Pastikan `package.json` ada `"type": "module"`
- Pastikan `node_modules/` tidak ter-commit (cek `.gitignore`)

### Server Error 500
- Buka **Logs** → cari error merah
- Biasanya karena PORT atau path file (`__dirname` issue)

### SSE Disconnect Terus
- Render free tier timeout SSE setelah ~60 detik idle
- Normal behavior, reconnect otomatis di frontend

---

## Update Aplikasi Setelah Deploy

```bash
# Edit code...
git add .
git commit -m "Update: [deskripsi perubahan]"
git push

# Render otomatis detect push dan redeploy (~1-2 menit)
```

---

## Monitoring

Dashboard Render menampilkan:
- CPU & Memory usage
- Request count
- Response time
- Logs real-time

---

**Butuh bantuan?** Tanya di chat saat stuck! 🚀
