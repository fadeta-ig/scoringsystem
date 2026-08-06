# Sistem Scoring Lomba

Aplikasi operator dan layar proyeksi real-time untuk lomba PT Wijaya Inovasi
Gemilang dalam tema HUT RI ke-81. Sistem mengelola hasil Babak Penyisihan,
scoring Babak Final, Grand Final, serta materi yang sedang tayang di proyektor.

Pertanyaan dan jawaban tetap dikelola di luar aplikasi.

## Alur Lomba

1. Babak Penyisihan
2. Babak Final — Sesi 1
3. Babak Final — Sesi 2
4. Babak Final — Sesi 3
5. Babak Grand Final

## Babak Penyisihan

- Terdapat 4 sesi, masing-masing diikuti 6 tim.
- Setiap sesi berlangsung 15 menit dan terdiri dari 3 pertanyaan tertulis.
- Operator menginput nama tim, foto tim, nilai, serta waktu pengerjaan.
- Pemenang adalah tim dengan nilai tertinggi.
- Jika nilai seri, tim dengan waktu pengerjaan tercepat menang.
- Jika nilai dan waktu masih seri, pemenang ditetapkan melalui keputusan juri.
- Satu pemenang dari masing-masing sesi lolos ke Babak Final.
- Nilai penyisihan tidak dibawa ke Babak Final.

Foto tim mendukung JPG, PNG, dan WebP dengan ukuran maksimal 2 MB. Berkas
tersimpan di `public/uploads/teams` dan tidak dimasukkan ke Git.

## Babak Final

Babak Final diikuti tepat 4 tim dan seluruh skor dimulai dari 0.

### Sesi 1 — Pertanyaan Bergiliran

- Setiap tim mendapat 3 pertanyaan.
- Total 12 pertanyaan dengan urutan tim 1 → 2 → 3 → 4 sebanyak 3 putaran.
- Benar: +10 poin.
- Salah: 0 poin.

### Sesi 2 — Pertanyaan Rebutan

- Terdapat 10 pertanyaan.
- Nilai pertanyaan 1–10 adalah 10, 20, 30, hingga 100 poin.
- Benar: nilai pertanyaan ditambahkan.
- Salah: nilai pertanyaan dikurangi.
- Jika tidak ada tim yang membunyikan lonceng, juri menunjuk tim penjawab.

### Sesi 3 — Lelang Poin

- Terdapat 10 pertanyaan.
- Nilai lelang diinput operator, harus positif, maksimal 60, dan habis dibagi 3.
- Pemenang lelang dapat menjawab sendiri atau melempar ke tim lain.

| Pilihan | Hasil | Perubahan |
| --- | --- | --- |
| Jawab sendiri | Benar | Pemenang lelang +nilai lelang |
| Jawab sendiri | Salah | Pemenang lelang −nilai lelang; tiga tim lain masing-masing +(nilai ÷ 3) |
| Lempar | Tim tujuan benar | Tim tujuan +nilai; pelempar −nilai |
| Lempar | Tim tujuan salah | Tim tujuan −nilai; pelempar +nilai |

Tim dengan akumulasi tertinggi dari tiga sesi masuk Grand Final. Jika skor
tertinggi seri, peserta Grand Final ditetapkan melalui keputusan juri.

## Grand Final

- Diikuti satu tim terbaik dari Babak Final.
- Terdapat 4 pertanyaan, masing-masing bernilai Rp500.000.
- Salah pada pertanyaan pertama berarti gugur tanpa hadiah.
- Setelah pertanyaan pertama benar, peserta memilih Lanjut atau Tidak Lanjut.
- Jika melanjutkan lalu salah, hadiah dari pertanyaan sebelumnya tetap aman.
- Hadiah maksimum Rp2.000.000.

## Antarmuka

- `/admin` — console scoring operator.
- `/admin/tim` — pengelolaan nama dan foto seluruh tim.
- `/admin/proyeksi` — ruang kontrol materi proyeksi.
- `/proyeksi` — layar publik/read-only.

Ruang kontrol menyediakan tayangan live, leaderboard final, replay hasil setiap
sesi, hasil penyisihan, daftar tim lolos, break dengan pesan singkat, dan reveal
pemenang. Transisi akhir sesi dipilih otomatis, tetapi operator tetap dapat
mengganti atau mengulang tayangan kapan saja.

Perubahan nama, foto, hasil, skor, dan mode proyeksi tersinkron secara real-time.
Input pertandingan terakhir juga dapat dibatalkan untuk memperbaiki kesalahan
operator.

## Local Development

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

URL:

- Admin: `http://localhost:3000/admin`
- Profil tim: `http://localhost:3000/admin/tim`
- Ruang proyeksi: `http://localhost:3000/admin/proyeksi`
- Layar proyeksi: `http://localhost:3000/proyeksi`

Akun seed development:

- Username: `admin`
- Password: `admin12345`

Pemeriksaan:

```bash
npm run test:rules
npm run typecheck
npm run lint
npm run build
```
