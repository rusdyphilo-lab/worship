# Worship App — Panduan Setup

Aplikasi web untuk worship team: library lagu dengan chord transposer, lirik, dan setlist ibadah.

---

## Langkah 1 — Buat Supabase Project

1. Buka [supabase.com](https://supabase.com) → Sign up / Login
2. Klik **New Project**
3. Isi nama project: `worship-app`
4. Pilih region terdekat (Singapore)
5. Buat password database (simpan baik-baik)
6. Tunggu project selesai dibuat (~2 menit)

---

## Langkah 2 — Setup Database

1. Di dashboard Supabase, klik **SQL Editor** (ikon database di sidebar kiri)
2. Klik **New Query**
3. Buka file `supabase/schema.sql` dari folder ini
4. Copy semua isinya, paste ke SQL Editor
5. Klik **Run** (atau Ctrl+Enter)
6. Pastikan muncul pesan sukses

---

## Langkah 3 — Ambil API Keys

1. Di Supabase, klik **Settings** → **API**
2. Copy dua nilai ini:
   - **Project URL** → contoh: `https://abcdefgh.supabase.co`
   - **anon public key** → string panjang

3. Buka file `supabase.js` di folder ini
4. Ganti baris ini:
   ```js
   const SUPABASE_URL = 'GANTI_DENGAN_SUPABASE_URL'
   const SUPABASE_ANON_KEY = 'GANTI_DENGAN_SUPABASE_ANON_KEY'
   ```
   Dengan nilai yang tadi dicopy.

---

## Langkah 4 — Buat GitHub Repository

1. Buka [github.com](https://github.com) → **New repository**
2. Nama repo: `worship-app`
3. Set ke **Private** (agar tidak semua orang bisa lihat kode)
4. Klik **Create repository**
5. Upload semua file dari folder ini ke repo (drag & drop di GitHub)

---

## Langkah 5 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → Login dengan GitHub
2. Klik **Add New Project**
3. Pilih repo `worship-app`
4. Klik **Deploy** (tidak perlu setting apapun)
5. Selesai! Vercel akan beri URL seperti `worship-app.vercel.app`

---

## Cara Pakai

### Untuk worship team (pemain & penyanyi)
- Buka URL app di HP/browser
- Halaman **Lagu**: cari lagu, ketuk untuk lihat chord atau lirik
- Halaman **Setlist**: lihat jadwal ibadah minggu ini

### Untuk admin / music leader
- Buka halaman **Admin**
- **Kelola Lagu**: tambah/edit lagu, input progresi dengan keyboard chord, tempel lirik dari Easy Worship
- **Buat Setlist**: pilih tanggal, jenis ibadah, tambahkan lagu beserta key yang dipakai

---

## Import Lirik dari Easy Worship

1. Di Easy Worship, klik kanan lagu → **Export**
2. Pilih format **Plain Text (.txt)**
3. Copy isi file teks
4. Di Admin → edit lagu → tempel di kolom Lirik
5. Simpan

---

## Struktur File

```
worship-app/
├── index.html      ← Library lagu (halaman utama)
├── song.html       ← Detail lagu: chord + lirik
├── setlist.html    ← Setlist ibadah
├── admin.html      ← Input lagu & buat setlist
├── style.css       ← Semua styling
├── supabase.js     ← Koneksi database & utilities
└── supabase/
    └── schema.sql  ← Setup database (jalankan sekali)
```

---

## Pengembangan Selanjutnya (nanti)

- [ ] Login untuk admin (sekarang semua bisa akses admin)
- [ ] Import massal lagu dari file CSV/txt Easy Worship
- [ ] Notifikasi setlist ke WhatsApp group
- [ ] Mode offline (PWA)
