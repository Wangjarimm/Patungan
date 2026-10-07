# Fase 3 — Langkah Uji Manual Dua HP

Uji ini membuktikan kriteria "Selesai bila" Fase 3 di `docs/PRD.md`: dua HP melihat
perubahan satu sama lain dalam 2 detik (F-15). Butuh dua HP Android (HP A dan HP B).

## Persiapan (sekali)

1. Buat proyek Supabase gratis, lalu di **Authentication > Providers** aktifkan
   **Anonymous sign-in**. Tanpa ini login anonim (F-12) gagal.
2. Salin **Project URL** dan **publishable/anon key** ke `.env` (JANGAN di-commit):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_<xxx>
   ```
   Cek dengan `npm run check:env`.
3. Jalankan migrasi dari `supabase/migrations` lewat SQL Editor, atau:
   ```
   npx supabase db push
   ```
4. (Disarankan) uji kebijakan RLS di server:
   ```
   npx supabase db query --linked -f supabase/tests/rls_checks.sql
   ```
   Semua baris harus `passed = true`, lalu transaksinya ROLLBACK sendiri.
5. Pasang **Expo Go** di HP A dan HP B, satu jaringan Wi-Fi, lalu jalankan
   `npx expo start` dan pindai QR code di kedua HP.

## A. Akun anonim dan nama (F-12)

1. HP A: buka aplikasi pertama kali, isi nama (mis. **Raka**), tekan **Mulai**.
2. Di Supabase **Authentication > Users**, muncul satu user anonim baru. Tidak ada
   layar password di aplikasi.
3. Buka **Profil** di HP A: nama tampil dan status koneksi **online**. Ganti nama,
   cek baris `profiles` ikut berubah.

## B. Buat tagihan dan kode gabung (F-13)

1. HP A: buat tagihan baru (mis. **Kedai Mie Kenari**), tambah peserta Raka dan Dinda.
2. Buka layar tagihan. Kode gabung 6 karakter muncul (mis. **MIE482**). Pastikan
   tidak memakai huruf `O`, `I`, atau angka `0`, `1`.
3. Catat kodenya untuk langkah C.

## C. Gabung dan klaim nama (F-14)

1. HP B: buka pertama kali, isi nama (mis. **Dinda**), lalu buka layar **Gabung**.
2. Ketik kode dari langkah B. Salah ketik dulu (mis. `ZZZZZ9`) → pesan jelas
   "Kode tidak ditemukan...".
3. Isi kode yang benar → pratinjau tagihan tampil (judul, pembayar, jumlah peserta,
   daftar nama yang belum diklaim).
4. Pilih nama **Dinda** → HP B masuk ke tagihan sebagai peserta, dalam mode baca
   untuk menu dan pengaturan.
5. HP A menekan **Tunggu sebentar** — nama Dinda di HP A berubah jadi terkait akun
   (bukan nama bebas). Coba dari HP lain klaim nama yang sama → ditolak
   "Nama ini sudah dipilih orang lain."

## D. Sinkron real-time dua arah (F-15) — inti Fase 3

Siapkan stopwatch; target < **2 detik** pada tiap langkah.

1. Buka tagihan yang sama di HP A dan HP B sekaligus.
2. HP A ubah menu (tambah item atau ubah harga) → **HP B ikut berubah < 2 detik**
   tanpa refresh.
3. HP B (peserta) ketuk inisial dirinya di sebuah menu → **HP A melihat perubahan < 2 detik**.
4. HP A tandai Dinda **sudah transfer** → status di HP B berubah < 2 detik.
5. HP B tandai dirinya **Lunas** → HP A melihat statusnya < 2 detik.
6. Balik kecepatan: lakukan bolak-balik cepat (tutup–buka tagihan, ubah menu
   berulang). Aplikasi tidak boleh crash dan tidak boleh muncul galat channel.

## E. Migrasi data lokal ke server (naik versi)

Hanya perlu bila sudah punya tagihan dari v0.1/v0.2 (dibuat tanpa akun).

1. Pasang APK v0.2, buat satu tagihan **tanpa internet** (ownerId belum ada).
2. Pasang APK v0.3 menimpanya (paket sama), lalu buka dengan internet.
3. Buka tagihan lama itu di HP A: dalam beberapa detik kode gabung muncul, artinya
   tagihan sudah ter-upload. Isi nama akun lewat onboarding bila belum.
4. HP B gabung pakai kode itu → melihat tagihan yang tadinya lokal.
5. Jika tagihan dibuat langsung di v0.3 setelah onboarding, tidak ada migrasi yang
   perlu jalan.

## F. Offline dan pulih

1. HP A matikan Wi-Fi/data. Ubah menu → UI tetap responsif.
2. Nyalakan internet → perubahan terkirim dan tampil di HP B tanpa input ulang.
3. Tutup paksa aplikasi saat offline lalu buka lagi → data utuh (F-08).

## Selesai bila

- Semua langkah A–F lulus.
- Perubahan dua arah pada langkah D tampil < 2 detik.
- Tidak ada crash di log `npx expo start` (`[realtime]` hanya boleh memuat peringatan
  singkat saat offline, bukan error fatal).
