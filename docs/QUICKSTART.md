# 🎯 QUICK START - Deploy Pager ke Render

## Step 1: Push ke GitHub (5 menit)

```bash
# Buka terminal di folder backend
cd "D:/Documents/Aksiva Studio/pager/backend"

# Initialize git
git init
git add .
git commit -m "Initial commit: POS & Digital Pager with Neo-Brutalist UI"

# Buat repo baru di GitHub:
# https://github.com/new
# Nama: pager-backend
# Public/Private: terserah
# JANGAN centang "Initialize with README"

# Setelah repo dibuat, jalankan:
git remote add origin https://github.com/USERNAME/pager-backend.git
git branch -M main
git push -u origin main
```

**Ganti `USERNAME` dengan username GitHub kamu!**

---

## Step 2: Deploy di Render (3 menit)

1. **Login Render**: https://dashboard.render.com (sign up pakai GitHub)

2. **Buat Web Service**:
   - Klik **"+ New"** → **"Web Service"**
   - Connect repository `pager-backend`
   
3. **Settings**:
   ```
   Name: pager-backend
   Region: Singapore
   Branch: main
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```

4. **Klik "Create Web Service"** → tunggu 2-3 menit

5. **Done!** URL live: `https://pager-backend-XXXX.onrender.com`

---

## Step 3: Share ke Orang Lain

### Link untuk Kasir:
```
https://pager-backend-XXXX.onrender.com/pos
```

### Link untuk Dapur/Bar:
```
https://pager-backend-XXXX.onrender.com/queue
```

### Link Pelanggan:
Otomatis dapat QR Code setelah bayar di kasir

---

## ⚠️ Catatan Penting

### Cold Start (15 menit idle = sleep)
Jika tidak ada yang akses selama 15 menit, server sleep. Request pertama setelah itu butuh ~30 detik untuk bangun.

**Solusi untuk demo:**
- Buka `https://pager-backend-XXXX.onrender.com/pos` **5 menit sebelum demo**
- Server akan tetap aktif selama ada traffic

### Data Reset
File database (`data/db.json`) akan reset setiap restart/redeploy. Untuk data persistent, nanti bisa upgrade pakai Render Disk atau PostgreSQL.

---

## Update Kode

```bash
# Edit file...
git add .
git commit -m "Update: fitur XYZ"
git push

# Render auto-deploy dalam 1-2 menit
```

---

## Troubleshooting

**Deploy gagal?**
- Cek Logs di Render dashboard
- Pastikan semua file sudah ke-push ke GitHub

**URL tidak bisa diakses?**
- Tunggu deploy selesai (status "Live" hijau di dashboard)
- Cek Logs untuk error

**Need help?** Chat aja! 🚀
