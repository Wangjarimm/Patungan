# Patungan — Langkah Pengerjaan

Urutannya: siapkan alat, siapkan repo dan dokumen, lalu kerjakan fase demi fase bersama Claude Code dengan rilis APK di setiap akhir fase. Rincian fitur tiap fase ada di `docs/PRD.md`, aturan kerja Claude Code ada di `CLAUDE.md`.

## A. Siapkan alat (sekali saja)

1. Pasang Node.js versi LTS dan Git, lalu buat akun GitHub bila belum punya.
2. Pasang VS Code (atau editor lain) dan aplikasi Expo Go di HP Android.
3. Pasang Claude Code lewat installer resmi:
    - macOS, Linux, atau WSL: `curl -fsSL https://claude.ai/install.sh | bash`
    - Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`
    - Cek dengan `claude --version`. Perintah terbaru selalu ada di dokumentasi resmi: https://docs.anthropic.com/en/docs/claude-code/quickstart
4. Jalankan `claude` sekali dan masuk dengan akun Claude atau API key.
5. Buat akun Expo (untuk EAS Build) dan akun Supabase; keduanya baru dipakai di fase berikutnya.

## B. Siapkan repo dan dokumen

1. Buat repo kosong `patungan` di GitHub, clone ke laptop, lalu masuk ke foldernya.
2. Simpan file-file ini ke dalam repo:
    - `CLAUDE.md` di akar repo
    - `PRD.md` sebagai `docs/PRD.md`
    - file ini sebagai `docs/LANGKAH-PENGERJAAN.md`
3. Ekspor layar-layar dari kanvas desain sebagai gambar ke `docs/design/`, agar Claude Code bisa melihat acuan visual.
4. Commit dan push: `git add . && git commit -m "chore: add PRD and design references" && git push`.

## C. Siklus kerja setiap fase

Ulangi siklus ini untuk fase 0 sampai 6:

1. Buka terminal di folder repo dan jalankan `claude`.
2. Tempel prompt fase yang sesuai dari bagian D.
3. Baca rencana yang diajukan Claude Code; minta perubahan bila ada yang tidak sesuai PRD, lalu setujui.
4. Setujui atau tolak setiap perubahan file dan perintah yang diminta; baca kodenya agar kamu paham dan bisa menjelaskannya saat wawancara.
5. Jalankan `npm test`, `npm run lint`, dan `npm start`, lalu coba di HP lewat Expo Go dengan memindai QR code.
6. Bila ada bug, ceritakan gejalanya ke Claude Code beserta pesan galatnya, bukan sekadar "tidak jalan".
7. Commit per fitur kecil, lalu push.
8. Di akhir fase, cek kriteria "Selesai bila" di tabel Ruang lingkup dan fase pada PRD, lalu rilis APK (bagian F).

## D. Prompt Claude Code per fase

### Fase 0: persiapan

```
Baca CLAUDE.md dan docs/PRD.md. Kerjakan Fase 0 saja.
Buat proyek Expo TypeScript dengan Expo Router di folder ini, pasang ESLint, Prettier,
Jest (jest-expo), dan script npm start, test, lint, typecheck.
Buat src/theme berisi token warna terang dan gelap persis dari tabel "Token warna" di PRD,
muat font Bricolage Grotesque dan IBM Plex Mono, dan buat tab Beranda, Riwayat, Profil kosong.
Tambahkan workflow GitHub Actions yang menjalankan lint, typecheck, dan test.
Tampilkan rencana dulu, lalu kerjakan setelah aku setuju.
```

### Fase 1: hitung offline (v0.1)

```
Kerjakan Fase 1 sesuai PRD (F-01 sampai F-08).
Mulai dari src/lib/calc.ts dan calc.test.ts: tulis test dulu memakai contoh acuan
Kedai Mie Kenari dan semua kasus tepi di PRD, lalu implementasi sampai lulus.
Setelah itu buat komponen ReceiptCard, ZigzagEdge, Avatar, PersonToggle, PillButton,
lalu layar Beranda, Isi pesanan, Pengaturan tagihan, dan Bagian tiap orang sesuai
bagian Desain dan UX serta gambar di docs/design. Simpan data dengan Zustand persist + AsyncStorage.
Tambahkan berbagi rincian ke WhatsApp lewat Share API.
Berhenti setelah tiap kelompok (logika, komponen, layar) dan laporkan hasil test.
```

### Fase 2: grup, riwayat, tema (v0.2)

```
Kerjakan Fase 2 (F-09 sampai F-11). Buat grup tersimpan, layar Riwayat dengan filter
dan badge jumlah belum lunas, status bayar manual, pilihan tema (Ikuti sistem, Terang, Gelap)
di Profil, dan komponen AnimatedTabBar: kapsul mengambang, latar aksen meluncur ke tab aktif
dengan spring sekitar 460 ms, ikon memantul, label melebar, dan animasi mati bila
reduce motion aktif. Pakai react-native-reanimated.
```

### Fase 3: online real-time (v0.3)

```
Kerjakan Fase 3 (F-12 sampai F-15). Buat migrasi SQL di supabase/migrations untuk semua tabel
di bagian Model data PRD, lengkap dengan RLS dan fungsi join_bill dan claim_participant.
Jelaskan dulu setiap kebijakan RLS sebelum menulisnya. Lalu buat klien Supabase dengan
sesi tersimpan di AsyncStorage, login anonim, kode gabung 6 karakter, layar Gabung,
langganan real-time per bill_id, dan migrasi data lokal ke server.
Tulis langkah uji manual dengan dua HP di akhir.
```

### Fase 4: pembayaran (v0.4)

```
Kerjakan Fase 4 (F-16 sampai F-18): rekening dan e-wallet di Profil, layar Bayar ke teman
dengan tombol salin (expo-clipboard), tandai sudah transfer, notifikasi push lewat
expo-notifications dan Supabase Edge Function, serta pengingat dengan batas 12 jam.
Pastikan RLS payment_methods sesuai PRD dan uji dengan dua akun.
```

### Fase 5: scan struk (v0.5)

```
Kerjakan Fase 5 (F-19). Siapkan development build, pasang
@react-native-ml-kit/text-recognition dan expo-image-picker. Buat src/lib/receipt-parser.ts
sebagai fungsi murni yang mengubah baris teks OCR menjadi daftar menu (jumlah, nama, harga)
serta mendeteksi service dan pajak; tandai baris yang ragu. Tulis test parser dengan
beberapa contoh teks struk Indonesia. Lalu buat layar Scan struk dan layar koreksi.
```

### Fase 6: poles portofolio (v1.0)

```
Kerjakan Fase 6: login Google opsional untuk menghubungkan akun anonim, audit aksesibilitas
(kontras, label, ukuran huruf), README berbahasa Inggris dengan screenshot, GIF demo,
diagram arsitektur, cara build, dan badge CI. Tambahkan workflow yang membangun APK dan
melampirkannya ke GitHub Release saat tag v* dibuat.
```

## E. Langkah khusus beberapa fase

- **Fase 3:** buat proyek Supabase, salin Project URL dan anon key ke `.env` (jangan di-commit), aktifkan Anonymous sign-in di pengaturan Auth, lalu jalankan migrasi dari `supabase/migrations` lewat SQL Editor atau Supabase CLI. Uji dengan dua HP.
- **Fase 4:** siapkan kredensial Firebase Cloud Messaging untuk notifikasi Android sesuai panduan expo-notifications, lalu deploy Edge Function.
- **Fase 5:** mulai fase ini Expo Go tidak cukup; buat development build dengan EAS atau `npx expo run:android`, lalu uji scan dengan beberapa struk asli.

## F. Rilis APK ke GitHub di akhir setiap fase

1. Naikkan versi di `app.json` (misalnya 0.1.0).
2. Buat APK dengan `eas build -p android --profile preview` (profil preview diatur menghasilkan APK), atau build lokal dengan Gradle bila kuota EAS habis.
3. Buat tag Git (`git tag v0.1.0 && git push --tags`), lalu buat Release di GitHub dan lampirkan file APK beserta catatan perubahan.
4. Bagikan tautan Release ke teman; mereka perlu mengizinkan install dari sumber tidak dikenal.
5. Mulai fase 6, langkah 2 dan 3 dijalankan otomatis oleh GitHub Actions setiap kali tag `v*` dibuat.

## G. Siapkan untuk portofolio (fase 6)

Lengkapi README dengan GIF demo, screenshot terang dan gelap, diagram arsitektur, alasan pemilihan teknologi, dan cara menjalankan proyek. Sematkan repo di profil GitHub dan cantumkan tautan Release di CV.
