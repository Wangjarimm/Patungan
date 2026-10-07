# Backlog

Temuan kecil yang ditunda ke fase berikutnya. Kerjakan bersama fase yang disebut.

## Fase 2

- [x] **Logo splash terlalu kecil.** Ditemukan saat uji APK v0.1.0 di HP. Splash memakai
      `imageWidth: 76` dari template lama, padahal logo di `assets/images/splash-icon.png` hanya
      mengisi sekitar 60% gambar. Naikkan `imageWidth` di plugin `expo-splash-screen` (`app.json`),
      misalnya ke 200, lalu cek di mode terang dan gelap. Perubahan ini butuh build ulang, jadi
      ikutkan di build rilis v0.2.
      Selesai: `imageWidth` jadi 200 (Fase 2, Tahap 3).

## Fase 6

- [ ] **Batasi percobaan `join_bill`.** Kode gabung berlaku tanpa kedaluwarsa (keputusan v0.3),
      jadi batasi jumlah percobaan kode per akun (misalnya 10 per menit) untuk mencegah tebakan kode.
      Bisa lewat tabel log percobaan di dalam fungsi `join_bill` atau Edge Function di depannya.
