# Patungan

Aplikasi Android split bill. Spesifikasi lengkap ada di `docs/PRD.md`; baca sebelum mengerjakan fitur apa pun. Acuan visual ada di `docs/design/`.

## Tumpukan

- Expo (SDK stabil terbaru) + React Native + TypeScript strict
- Expo Router, Zustand, react-native-reanimated, react-native-svg
- Supabase (mulai fase 3), ML Kit text recognition (fase 5)
- Jest (jest-expo) + React Native Testing Library

## Aturan kerja

- Kerjakan hanya fase yang diminta. Jangan menambah fitur di luar PRD.
- Sebelum menulis kode untuk tugas besar, tulis rencana singkat dan tunggu persetujuan.
- Semua perhitungan uang ada di `src/lib/calc.ts` sebagai fungsi murni; jangan menghitung di komponen.
- Uang selalu bilangan bulat Rupiah. Ikuti bagian "Aturan perhitungan" di PRD persis, termasuk contoh acuan Kedai Mie Kenari.
- Tulis atau perbarui test untuk setiap perubahan di `src/lib`. Jalankan `npm test` dan `npm run lint` sebelum menyatakan selesai.
- Warna, font, dan spacing hanya dari `src/theme`. Dilarang menulis kode warna hex langsung di komponen.
- Dukung mode terang dan gelap lewat `useColorScheme` dan pilihan tema pengguna (Ikuti sistem, Terang, Gelap).
- Teks UI dalam bahasa Indonesia; nama variabel, kode, dan komentar dalam bahasa Inggris.
- Target sentuh minimal 44 dp; setiap tombol ikon wajib punya `accessibilityLabel`.
- Hormati pengaturan reduce motion untuk semua animasi.
- Jangan pernah commit file `.env` atau kunci service role Supabase.
- Commit kecil dengan pesan format: `feat|fix|test|chore(scope): ringkasan`.
- Jangan menambahkan baris Co-Authored-By, "Generated with Claude Code", atau atribusi AI apa pun di pesan commit maupun deskripsi pull request.


## Struktur penting

- `src/app/` layar dan layout Expo Router (hanya file rute; jangan taruh test di sini)
- `src/lib/` logika murni: `calc.ts`, `format.ts`, `receipt-parser.ts`, `join-code.ts`
- `src/theme/` token warna terang dan gelap, tipografi, spacing
- `src/components/` komponen bersama: ReceiptCard, ZigzagEdge, Avatar, PersonToggle, PillButton, AnimatedTabBar
- `src/stores/` Zustand stores
- `src/services/supabase/` klien, query, realtime
- `supabase/migrations/` skema SQL dan RLS

## Perintah

- `npm start` menjalankan Expo
- `npm test` menjalankan Jest
- `npm run lint` menjalankan ESLint
- `npm run typecheck` menjalankan `tsc --noEmit`
