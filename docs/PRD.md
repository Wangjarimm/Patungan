# Patungan — Product Requirements Document

Versi dokumen: 7 Oktober 2026

## 1. Ringkasan produk

Patungan adalah aplikasi Android untuk membagi tagihan makan bareng secara adil: siapa makan apa, berapa bagian pajak dan service tiap orang, dan siapa yang belum transfer. Versi 1.0 dirilis sebagai APK di GitHub Releases, tanpa Play Store.

**Masalah.** Saat makan bersama, satu orang biasanya membayar ke kasir lalu menghitung manual bagian teman-temannya. Pajak dan service sering dibagi rata padahal pesanan tiap orang berbeda, dan menagih teman yang belum transfer terasa canggung.

**Solusi.** Pembayar memasukkan atau memindai struk, menandai siapa makan menu apa, lalu membagikan kode gabung. Teman bergabung dari HP masing-masing, melihat bagiannya, menyalin nomor rekening, dan menandai sudah transfer. Semua perubahan tersinkron real-time.

**Tujuan proyek.**

- Portofolio kerja: menunjukkan kemampuan React Native, TypeScript, database relasional, real-time sync, dan pemrosesan gambar di perangkat.
- Dipakai sungguhan oleh pembuat dan teman-temannya.
- Kode sumber terbuka di GitHub dengan README, test, dan CI yang rapi.

**Prinsip produk.**

- Adil secara proporsional: pajak, service, dan diskon dibagi sesuai porsi pesanan, bukan rata.
- Cepat dipakai di meja makan: membuat tagihan dan bergabung masing-masing di bawah satu menit.
- Tanpa paksaan install: teman yang tidak punya aplikasi tetap dapat rincian lewat WhatsApp.
- Gratis: tidak ada biaya server di luar paket gratis layanan yang dipakai.

## 2. Pengguna dan skenario

Ada dua peran dalam setiap tagihan: pembayar yang membuat tagihan, dan peserta yang bergabung lalu membayar bagiannya. Satu orang bisa menjadi keduanya di tagihan berbeda.

| Persona | Siapa | Kebutuhan utama | Keluhan saat ini |
| --- | --- | --- | --- |
| Raka, pembayar | Karyawan 25 tahun, sering menalangi makan siang tim | Cepat memasukkan pesanan, tahu siapa belum bayar, menagih tanpa canggung | Menghitung di kalkulator, lupa siapa sudah transfer |
| Fajar, peserta | Rekan kerja Raka, malas install aplikasi baru | Tahu nominal pasti, nomor rekening, cara konfirmasi cepat | Nominal sering dibulatkan seenaknya, harus tanya nomor rekening |
| Wulan, anak kos | Mahasiswi, patungan belanja bulanan kos | Grup tetap tanpa input ulang, riwayat bulanan | Catatan di grup chat tenggelam |

**Skenario utama (contoh angka dipakai di seluruh dokumen).** Lima teman makan di Kedai Mie Kenari dengan subtotal Rp211.000, service 5%, dan pajak 10%.

1. Raka membayar Rp243.705 ke kasir, membuka Patungan, lalu menekan **Buat tagihan baru**.
2. Raka memindai struk; enam menu terbaca dan satu harga ditandai kurang jelas, lalu dikoreksi.
3. Raka menambahkan Dinda, Bima, Sekar, dan Fajar, lalu mengetuk inisial siapa makan menu apa.
4. Aplikasi menampilkan bagian tiap orang, dibulatkan ke Rp100, dan membuat kode gabung **MIE482**.
5. Raka mengirim rincian ke grup WhatsApp beserta kode gabung.
6. Fajar membuka aplikasi, memasukkan kode, memilih namanya, dan melihat bagiannya Rp47.400.
7. Fajar menyalin nomor rekening Raka, transfer lewat aplikasi bank, lalu menekan **Tandai sudah transfer**.
8. Raka langsung melihat status Fajar berubah menjadi Lunas; sisa tagihan berkurang.

**Skenario tambahan.**

- Teman tanpa aplikasi: cukup membaca rincian di WhatsApp; Raka menandai lunas secara manual.
- Patungan non-restoran (kado, tiket, belanja kos): tanpa scan, tanpa pajak, dibagi rata atau per item.
- Raka ganti HP: menghubungkan akun Google agar riwayat tidak hilang.

## 3. Ruang lingkup dan fase

Produk dibangun dalam tujuh fase; setiap fase menghasilkan APK yang bisa dipakai dan dirilis di GitHub. Tidak ada tenggat waktu; fase berikutnya dimulai setelah kriteria selesai fase sebelumnya terpenuhi.

| Fase | Versi | Isi | Selesai bila |
| --- | --- | --- | --- |
| 0. Persiapan | - | Repo GitHub, proyek Expo + TypeScript, ESLint, Prettier, Jest, Expo Router, token desain | Aplikasi kosong berjalan di HP lewat Expo Go, CI menjalankan lint dan test |
| 1. Hitung offline | v0.1 | Tagihan, orang, menu, pembagian, pajak, service, diskon, ongkir, pembulatan, hasil per orang, kirim ke WhatsApp, simpan lokal | Skenario Kedai Mie Kenari menghasilkan angka persis seperti bagian Aturan perhitungan; semua test kalkulasi lulus |
| 2. Grup dan riwayat | v0.2 | Grup tersimpan, riwayat dengan filter, status bayar manual, navigasi bawah beranimasi, mode gelap | Grup bisa dipakai ulang; riwayat bertahan setelah aplikasi ditutup |
| 3. Online real-time | v0.3 | Supabase, login anonim, kode gabung, klaim nama, sinkron real-time, migrasi data lokal | Dua HP melihat perubahan satu sama lain dalam 2 detik |
| 4. Pembayaran | v0.4 | Profil rekening dan e-wallet, tombol salin, tandai sudah transfer, pengingat | Peserta bisa menyalin nomor dan menandai lunas; pembayar melihatnya tanpa refresh |
| 5. Scan struk | v0.5 | Development build, ML Kit text recognition, parser struk, layar koreksi | Struk contoh terbaca minimal 80% baris menu dengan benar; sisanya bisa dikoreksi |
| 6. Poles portofolio | v1.0 | Login Google opsional, pilihan tema, aksesibilitas, README, screenshot, GIF demo, GitHub Actions build APK | README lengkap, APK terunduh dan terpasang di HP teman |

**Di luar lingkup v1.0.**

- Versi iOS dan rilis Play Store atau App Store.
- Pembayaran langsung di dalam aplikasi (QRIS, payment gateway) dan pengecekan mutasi bank otomatis.
- Mata uang selain Rupiah dan multi-bahasa.
- Chat di dalam aplikasi; komunikasi tetap lewat WhatsApp.
- Monetisasi, iklan, dan analitik pihak ketiga.

## 4. Kebutuhan fungsional

Setiap kebutuhan punya kode (F-xx) agar mudah dirujuk di commit, issue, dan prompt Claude Code. Kolom Fase menunjukkan kapan fitur pertama kali dibuat.

| Kode | Fitur | Perilaku | Kriteria penerimaan | Fase |
| --- | --- | --- | --- | --- |
| F-01 | Buat tagihan | Nama tempat (wajib), tanggal (default hari ini), pembayar | Tagihan baru tampil di Beranda dan Riwayat; nama kosong ditolak dengan pesan jelas | 1 |
| F-02 | Kelola peserta | Tambah, ubah nama, hapus; warna avatar otomatis dari 10 warna tetap | Nama ganda ditolak; menghapus peserta melepasnya dari semua menu | 1 |
| F-03 | Kelola menu | Nama, harga satuan, jumlah; tambah, ubah, hapus | Harga menerima angka bulat Rupiah 0 sampai 100.000.000; jumlah minimal 1 | 1 |
| F-04 | Tandai pemakan | Ketuk inisial untuk memilih siapa makan; tombol Semua orang | Menu dengan harga tapi tanpa pemakan diberi peringatan dan tidak dihitung | 1 |
| F-05 | Pajak, service, diskon | Persen service dan pajak, urutan pajak setelah service, diskon Rp atau %, ongkir dibagi rata, pembulatan | Angka mengikuti bagian Aturan perhitungan; total berubah langsung saat pengaturan diubah | 1 |
| F-06 | Hasil per orang | Rincian menu, porsi diskon, service, pajak, ongkir, total; status bayar | Jumlah semua bagian sebelum pembulatan sama dengan total tagihan, selisih maksimal Rp1 | 1 |
| F-07 | Kirim ke WhatsApp | Teks rincian lewat share sheet atau tautan WhatsApp; tombol salin | Teks memuat total, nama pembayar, bagian tiap orang, dan kode gabung bila online | 1 |
| F-08 | Penyimpanan lokal | Semua data tersimpan di perangkat | Data utuh setelah aplikasi ditutup paksa dan dibuka ulang | 1 |
| F-09 | Grup tersimpan | Simpan peserta sebagai grup; pakai grup saat membuat tagihan; kelola grup: ganti nama, tambah atau hapus anggota, hapus grup dengan konfirmasi | Memilih grup mengisi semua peserta sekaligus; mengubah atau menghapus grup tidak mengubah tagihan yang sudah dibuat | 2 |
| F-10 | Riwayat | Daftar tagihan dikelompokkan per bulan; filter Semua, Belum lunas, Lunas | Filter Belum lunas menampilkan jumlah yang benar di badge | 2 |
| F-11 | Tema | Ikuti sistem, Terang, Gelap | Default mengikuti sistem; pilihan tersimpan | 2 |
| F-12 | Akun anonim | Isi nama saat pertama buka, akun anonim dibuat otomatis | Tidak ada layar password; nama bisa diubah di Profil | 3 |
| F-13 | Kode gabung | Kode 6 karakter tanpa huruf ambigu (O, 0, I, 1) | Kode unik di antara tagihan aktif; kode salah memberi pesan jelas | 3 |
| F-14 | Klaim nama | Peserta yang bergabung memilih namanya dari daftar atau menambah nama baru | Satu nama hanya bisa diklaim satu akun | 3 |
| F-15 | Sinkron real-time | Perubahan menu, pemakan, status bayar tampil di semua HP | Perubahan tampil di HP lain dalam 2 detik pada koneksi normal | 3 |
| F-16 | Rekening dan e-wallet | Simpan beberapa rekening; satu ditandai Utama | Hanya peserta di tagihan yang sama yang bisa melihat nomor | 4 |
| F-17 | Tandai sudah transfer | Peserta menandai sendiri; pembayar bisa membatalkan atau menandai manual | Pembayar menerima notifikasi push saat status berubah | 4 |
| F-18 | Ingatkan | Pembayar mengirim pengingat ke peserta yang belum bayar | Maksimal satu pengingat per orang per 12 jam | 4 |
| F-19 | Scan struk | Foto struk, kenali teks di perangkat, tebak menu dan harga, tandai yang ragu | Hasil selalu lewat layar koreksi sebelum masuk tagihan; berjalan tanpa internet | 5 |
| F-20 | Login Google | Menghubungkan akun anonim ke Google | Riwayat tetap ada setelah login di HP lain | 6 |

## 5. Aturan perhitungan

Pajak, service, dan diskon dibagi sebanding dengan porsi pesanan tiap orang; ongkir dibagi rata ke semua peserta. Logika ini wajib berada di satu modul murni (`src/lib/calc.ts`) tanpa akses UI atau database, dan diuji dengan unit test.

**Langkah perhitungan.**

1. Nilai baris menu = harga satuan × jumlah.
2. Bagian orang untuk satu menu = nilai baris ÷ jumlah pemakan menu itu. Menu tanpa pemakan tidak dihitung.
3. Subtotal orang (s_i) = jumlah semua bagian menu orang itu. Subtotal dihitung (S) = jumlah semua s_i.
4. Diskon (D) = nominal, dibatasi maksimal S; atau persen × S, dibatasi 0 sampai 100%.
5. Dasar (B) = S − D.
6. Service (V) = B × persen service.
7. Pajak (T) = (B + V) × persen pajak bila pajak setelah service; selain itu B × persen pajak.
8. Ongkir per orang = ongkir ÷ jumlah peserta.
9. Bagian akhir orang dihitung dengan rumus di bawah, lalu dibulatkan ke atas ke kelipatan langkah pembulatan (1, 100, 500, atau 1.000). Bagian 0 tetap 0.

```
bagian_i = (s_i / S) × (B + V + T) + ongkir / n
```

**Aturan pembulatan dan tampilan.** Hitung dengan angka desimal, tampilkan rincian dibulatkan ke Rp1 terdekat, dan bulatkan hanya bagian akhir. Selisih akibat pembulatan ke atas menjadi milik pembayar dan ditampilkan sebagai baris "Terkumpul setelah dibulatkan". Format Rupiah memakai titik pemisah ribuan: Rp243.900.

**Contoh acuan untuk test (service 5%, pajak 10% setelah service, bulatkan ke Rp100).**

| Menu | Harga | Jumlah | Pemakan |
| --- | --- | --- | --- |
| Mie goreng spesial | 32.000 | 2 | Raka, Bima |
| Nasi goreng kampung | 28.000 | 1 | Dinda |
| Kwetiau siram | 30.000 | 1 | Sekar |
| Mie kuah seafood | 35.000 | 1 | Fajar |
| Pisang goreng keju | 24.000 | 1 | Dinda, Sekar |
| Es teh manis | 6.000 | 5 | Semua |

| Orang | Subtotal | Service | Pajak | Tepat | Dibulatkan |
| --- | --- | --- | --- | --- | --- |
| Raka | 38.000 | 1.900 | 3.990 | 43.890 | 43.900 |
| Bima | 38.000 | 1.900 | 3.990 | 43.890 | 43.900 |
| Dinda | 46.000 | 2.300 | 4.830 | 53.130 | 53.200 |
| Sekar | 48.000 | 2.400 | 5.040 | 55.440 | 55.500 |
| Fajar | 41.000 | 2.050 | 4.305 | 47.355 | 47.400 |
| Total | 211.000 | 10.550 | 22.155 | 243.705 | 243.900 |

**Kasus tepi yang wajib diuji.** Tagihan tanpa menu; menu tanpa pemakan; diskon melebihi subtotal; diskon 100%; service dan pajak 0%; satu peserta saja; peserta tanpa pesanan tetapi ada ongkir; pembagian yang menghasilkan desimal berulang (misalnya Rp10.000 dibagi 3).

## 6. Desain dan UX

Konsep visualnya "struk di atas meja": informasi penting berada di kartu kertas struk bertepi bawah zigzag dengan garis putus-putus, di atas latar hijau daun pucat. Acuan visual lengkap ada di kanvas desain Patungan (sembilan layar terang, sembilan layar gelap, dan komponen navigasi bawah); ekspor gambarnya disimpan di `docs/design/`.

**Token warna.**

| Token | Terang | Gelap | Dipakai untuk |
| --- | --- | --- | --- |
| background | #DCE6D5 | #131D17 | Latar layar |
| paper | #FFFFFF | #22332A | Kartu struk, lembar bawah |
| surface | #FFFFFF | #1C2A22 | Bar aksi bawah, navigasi |
| text | #15241A | #E8EFE6 | Teks utama |
| textMuted | #4A5A4E | #A3B3A6 | Teks sekunder di latar |
| textMutedPaper | #56645A | #A9B8AC | Teks sekunder di kertas |
| line | #DCE3D8 | #3A4D41 | Garis putus-putus |
| outline | #8FA48C | #4F6656 | Tepi tombol sekunder |
| accent | #FF6A3D | #FF7A52 | Tombol utama, nominal, tab aktif |
| onAccent | #15241A | #131D17 | Teks di atas aksen |
| pendingBg / pendingText | #FFE9DC / #8F3412 | #4A2618 / #FFB79A | Label Belum transfer |
| success | #1E6B43 | #6FD39B | Label Lunas |
| warning | #C2412D | #FF6B6B | Hasil scan yang meragukan |

Warna avatar peserta tetap di kedua tema, dengan inisial putih: #B4471B, #2367A0, #6A4AB8, #237A4F, #A93A6B, lalu lima warna tambahan dengan kontras teks putih minimal 4,5:1.

**Tipografi.** Bricolage Grotesque untuk semua teks (judul 800, isi 400 dan 600). IBM Plex Mono khusus nominal Rupiah dan kode gabung, agar angka sejajar dan terasa seperti cetakan struk. Nominal penting diberi garis bawah tebal berwarna aksen dengan bentuk yang sama di mode terang dan gelap: tebal 3 dp, berjarak 2 dp di bawah angka, ujung membulat (radius 1,5 dp); hanya warnanya yang mengikuti token `accent` tiap tema.

**Aturan komponen.**

- Tombol berbentuk pil, tinggi minimal 44 dp; tombol utama berwarna aksen, maksimal satu per layar.
- Kartu struk: sudut atas 6 dp, tepi bawah zigzag 8 dp, pemisah garis putus-putus.
- Tanpa gradien dekoratif, tanpa emoji, ikon garis (stroke) 2 dp.
- Navigasi bawah: kapsul mengambang dengan tiga tab. Latar aksen meluncur ke tab aktif dengan efek pegas (sekitar 460 ms), ikon memantul kecil, label muncul melebar. Animasi dimatikan bila pengguna mengaktifkan pengaturan kurangi gerakan.

**Daftar layar.**

| No | Layar | Isi utama |
| --- | --- | --- |
| 1 | Beranda | Saldo ditunggu dan utang, tombol buat tagihan, scan, gabung, grup, tagihan terakhir |
| 2 | Isi pesanan | Peserta, daftar menu dengan inisial pemakan, kode gabung, total sementara |
| 3 | Scan struk | Kamera, hasil terbaca, koreksi baris meragukan |
| 4 | Bagian tiap orang | Progres lunas, struk per orang, ingatkan, kirim ke WhatsApp |
| 5 | Gabung pakai kode | Input 6 karakter, pratinjau tagihan, pilih nama |
| 6 | Bayar ke teman | Nominal, rekening dan e-wallet pembayar, tandai sudah transfer |
| 7 | Profil | Nama, hubungkan Google, rekening, tema, pengaturan bawaan |
| 8 | Riwayat | Filter, tagihan belum lunas di atas, lunas per bulan |
| 9 | Pengaturan tagihan | Service, pajak, diskon, ongkir, pembulatan, pembayar |

**Bahasa antarmuka.** Bahasa Indonesia santai dan jelas, kalimat aktif, label tombol menyebut aksinya ("Tandai sudah transfer", bukan "Kirim"). Pesan kosong dan pesan galat memberi arahan apa yang harus dilakukan.

## 7. Arsitektur teknis

Aplikasi dibangun dengan Expo (React Native) dan TypeScript, memakai Supabase paket gratis sebagai backend mulai fase 3. Logika perhitungan dipisah sebagai fungsi murni agar bisa diuji tanpa UI maupun server.

**Tumpukan teknologi.**

| Kebutuhan | Pilihan | Catatan |
| --- | --- | --- |
| Framework | Expo SDK stabil terbaru, React Native, TypeScript strict | Expo Go untuk fase 0 sampai 4; development build mulai fase 5 |
| Navigasi | Expo Router | Tab Beranda, Riwayat, Profil; stack untuk layar tagihan |
| State | Zustand | Satu store per domain: bills, groups, settings |
| Penyimpanan lokal | AsyncStorage lewat middleware persist Zustand | Diganti cache lokal setelah fase 3 |
| Animasi | react-native-reanimated | Navigasi bawah, transisi status bayar |
| Grafis | react-native-svg | Tepi zigzag struk, ikon |
| Font | expo-font dengan paket Google Fonts Bricolage Grotesque dan IBM Plex Mono | Dimuat sebelum splash ditutup |
| Backend | Supabase: Postgres, Auth anonim, Realtime, Edge Functions | Paket gratis |
| Notifikasi | expo-notifications + Edge Function ke layanan push Expo | Butuh kredensial Firebase Cloud Messaging untuk Android |
| Scan struk | @react-native-ml-kit/text-recognition + expo-image-picker atau expo-camera | Berjalan di perangkat, gratis, tanpa internet |
| Test | Jest (jest-expo), React Native Testing Library | Fokus utama di `calc.ts` dan parser struk |
| Kualitas | ESLint, Prettier, GitHub Actions | Lint dan test di setiap push |
| Rilis | EAS Build profil preview (APK) atau Gradle lokal | APK diunggah ke GitHub Releases |

**Struktur folder.**

```
patungan/
  src/
    app/               # Expo Router: layar dan layout
      (tabs)/          # index (Beranda), riwayat, profil
      tagihan/[id]/    # isi pesanan, hasil, pengaturan
      gabung.tsx
      bayar/[id].tsx
      scan.tsx
    lib/calc.ts        # perhitungan murni (+ calc.test.ts)
    lib/format.ts      # format Rupiah, tanggal
    lib/receipt-parser.ts
    lib/join-code.ts
    theme/             # token warna terang & gelap, tipografi, spacing
    components/        # ReceiptCard, ZigzagEdge, Avatar, PersonToggle, PillButton, AnimatedTabBar
    stores/            # Zustand stores
    services/supabase/ # klien, query, realtime
    types/
  supabase/
    migrations/        # skema SQL + RLS
    functions/         # Edge Functions (notifikasi)
  docs/
    PRD.md
    LANGKAH-PENGERJAAN.md
    design/            # ekspor gambar layar
  CLAUDE.md
  README.md
```

**Model data (Postgres).** Uang disimpan sebagai bilangan bulat Rupiah (`bigint`), persen sebagai `numeric(5,2)`.

| Tabel | Kolom utama | Relasi |
| --- | --- | --- |
| profiles | id (= auth.uid), display_name, theme | 1 per akun |
| payment_methods | id, profile_id, kind (bank/ewallet), provider, account_number, account_name, is_primary | milik profiles |
| groups | id, owner_id, name | milik profiles |
| group_members | id, group_id, display_name, color, profile_id (opsional) | milik groups |
| bills | id, owner_id, title, bill_date, join_code (unik), payer_participant_id, service_pct, tax_pct, tax_after_service, discount_type, discount_value, extra_fee, rounding_step, created_at | milik profiles |
| participants | id, bill_id, display_name, color, profile_id (terisi setelah klaim), paid_at, paid_marked_by | milik bills |
| items | id, bill_id, name, unit_price, qty, position | milik bills |
| item_shares | item_id, participant_id (kunci gabungan), bill_id | menghubungkan items dan participants; bill_id dipakai untuk filter real-time dan menjamin menu serta pemakan berasal dari tagihan yang sama |
| reminders | id, bill_id, participant_id, sent_at | untuk batas 12 jam |

**Keamanan data (Row Level Security).**

- Pengguna hanya bisa membaca tagihan bila ia pemiliknya atau punya baris participants dengan profile_id miliknya.
- Bergabung lewat fungsi `join_bill(code)` (security definer) yang mengembalikan pratinjau tagihan dan daftar nama yang belum diklaim, tanpa membuka tabel bills secara umum.
- Klaim nama lewat fungsi `claim_participant(participant_id)` yang menolak bila nama sudah diklaim.
- payment_methods hanya terbaca oleh pemiliknya dan orang yang berada di tagihan yang sama.
- Hanya pemilik tagihan yang bisa mengubah menu, pengaturan, dan menghapus tagihan; peserta hanya bisa mengubah pilihan pemakan miliknya dan status bayarnya sendiri.

**Grup dan tema.** Tabel groups, group_members, dan kolom profiles.theme sudah dibuat sejak fase 3, tetapi data grup dan pilihan tema tetap disimpan lokal di perangkat sampai fase 6 (login Google).

**Real-time.** Layar tagihan berlangganan perubahan tabel bills, items, item_shares, dan participants yang difilter berdasarkan bill_id. Perhitungan selalu diulang di perangkat dari data mentah, jadi server tidak menyimpan total.

## 8. Kebutuhan non-fungsional

Aplikasi harus terasa cepat di HP Android kelas menengah, aman untuk data rekening, dan bisa diaudit lewat kode sumbernya.

| Area | Target |
| --- | --- |
| Perangkat | Android 8.0 ke atas; diuji di HP dengan RAM 3 GB |
| Performa | Buka aplikasi sampai Beranda di bawah 2 detik; perhitungan ulang di bawah 16 ms untuk 50 menu dan 20 orang; animasi 60 fps |
| Offline | Fase 1 dan 2 penuh offline; setelah fase 3, tagihan yang sudah dibuka tetap terbaca tanpa internet dan perubahan dikirim saat online lagi |
| Ukuran APK | Di bawah 60 MB |
| Keamanan | Kunci anon Supabase saja di aplikasi; tidak ada service role key di repo; semua tabel memakai RLS; file `.env` masuk `.gitignore` |
| Privasi | Nomor rekening hanya terlihat oleh peserta tagihan yang sama; foto struk tidak diunggah ke server; tidak ada analitik pihak ketiga |
| Aksesibilitas | Target sentuh minimal 44 dp; kontras teks minimal 4,5:1; label aksesibilitas pada tombol ikon; mendukung ukuran huruf sistem; status tidak hanya dibedakan lewat warna |
| Kualitas kode | TypeScript strict tanpa `any`; ESLint bersih; cakupan test `src/lib` minimal 90% |
| Keandalan | Galat jaringan ditampilkan dengan pesan dan tombol coba lagi; tidak ada data hilang saat aplikasi ditutup paksa |

## 9. Metrik, risiko, dan pertanyaan terbuka

Keberhasilan diukur dari apakah aplikasi benar-benar dipakai teman dan apakah repo layak dipamerkan saat melamar kerja.

**Metrik keberhasilan v1.0.**

- Minimal 10 tagihan nyata dibuat bersama teman dalam sebulan setelah rilis.
- Membuat tagihan 5 menu untuk 5 orang selesai di bawah 2 menit (tanpa scan) atau 1 menit (dengan scan).
- Tidak ada laporan selisih hitungan di luar aturan pembulatan.
- Repo memiliki README dengan GIF demo, diagram arsitektur, dan badge CI hijau.

**Risiko.**

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Proyek Supabase gratis dijeda saat tidak dipakai | Aplikasi gagal sinkron | Pesan galat yang jelas; aktifkan ulang dari dasbor; fitur offline tetap jalan |
| Akurasi scan rendah pada struk thermal pudar | Pengguna kesal | Layar koreksi wajib; tandai baris ragu; input manual selalu tersedia |
| Fase 3 (real-time) terlalu berat untuk pemula | Proyek berhenti | Fase 1 dan 2 sudah bisa dirilis; kerjakan fase 3 sedikit demi sedikit dengan test |
| Data rekening bocor karena RLS salah | Kepercayaan hilang | Test kebijakan RLS dengan dua akun; tinjau ulang setiap migrasi |
| Kuota build gratis EAS habis | Rilis tertunda | Build APK lokal dengan Gradle sebagai cadangan |
| Pengguna iPhone tidak bisa install | Sebagian teman tidak ikut | Rincian tetap dibagikan lewat WhatsApp |

**Pertanyaan terbuka.**

- [ ] Apakah tagihan perlu bisa diarsipkan atau dihapus otomatis setelah semua lunas?
- [x] Apakah peserta boleh menambah menu sendiri, atau hanya pembayar?
- [x] Berapa lama kode gabung berlaku (misalnya 30 hari)? Keputusan v0.3: selama tagihan ada, tanpa kedaluwarsa. Kode unik di antara semua tagihan dan tidak bisa diganti.
- [x] Perlukah ekspor riwayat ke CSV untuk patungan kos bulanan?
