# Pengujian HTTP Lintas Tenant (Menu, Meja, Place)

Koleksi Postman ini membuktikan bahwa satu tenant (pemilik/kasir sebuah place) tidak dapat membaca
atau mengubah data milik tenant lain melalui endpoint place, menu (kategori + item), dan meja.

| File | Isi |
| --- | --- |
| `tooang-cross-tenant.postman_collection.json` | 72 request, 424 assertion |
| `tooang-cross-tenant.postman_environment.json` | `baseUrl`, password fixture, email akun, ID fixture, slot token |
| `../prisma/seed-cross-tenant.ts` | Data dasar pengujian (deterministik, dapat dijalankan ulang) |

## Data dasar (seed)

| Tenant | Akun | Peran | Data |
| --- | --- | --- | --- |
| A | `owner.tenant-a@tooang.test` | OWNER Place A | Place A `tenant-a-kitchen` (published), kategori `Tenant A Food`, item `Tenant A Fried Rice`, meja `A-01` |
| A | `cashier.tenant-a@tooang.test` | CASHIER Place A | |
| B | `owner.tenant-b@tooang.test` | OWNER Place B + Draft B | Place B `tenant-b-coffee` (published): kategori `Tenant B Espresso Bar` (aktif) + `Tenant B Seasonal` (nonaktif), item `Tenant B Latte` (32000) + `Tenant B Secret Blend` (tidak tersedia), meja `B-01` + `B-Maintenance` (nonaktif) |
| B | `cashier.tenant-b@tooang.test` | CASHIER Place B | Draft B `tenant-b-draft-bakery` (belum dipublikasikan) |
| - | `outsider.tenant@tooang.test` | USER tanpa membership | |
| - | `admin.tenant@tooang.test` | Platform ADMIN | Kontrol positif akses global |

Semua ID memakai prefiks `04000000-0000-4000-8000-…` dan sudah tercantum di file environment.
Seed menghapus lalu membuat ulang hanya baris fixture tersebut (termasuk order/cart/audit yang
terkait), sehingga aman dijalankan berulang kali untuk memulihkan baseline.

## Menjalankan

1. Gunakan database pengembangan/uji yang boleh diubah (seed menolak berjalan saat
   `NODE_ENV=production`).
2. Muat fixture dari folder `backend/`:

   ```bash
   CONFIRM_TEST_SEED=1 SEED_TEST_PASSWORD='Tooang-CrossTenant-2026!' npm run prisma:seed:cross-tenant
   ```

   Nilai `SEED_TEST_PASSWORD` harus sama dengan variabel environment Postman `fixturePassword`.
3. Jalankan API (`npm run start:dev`). `baseUrl` bawaan adalah `http://localhost:3001/api/v1`;
   sesuaikan bila `PORT` berbeda.
4. Import kedua file JSON ke Postman, pilih environment **Tooang - Cross Tenant (Local)**, lalu
   jalankan koleksi lewat Collection Runner (urutan folder 00 → 05). Alternatif CLI:

   ```bash
   npx newman run postman/tooang-cross-tenant.postman_collection.json \
     -e postman/tooang-cross-tenant.postman_environment.json \
     --reporters cli,junit --reporter-junit-export evidence/newman-cross-tenant.xml
   ```

Login dibatasi 10 percobaan per 15 menit. Folder 00 menyimpan token beserta waktu kedaluwarsanya
dan melewati login selama token masih berlaku, sehingga run berulang tidak terkena 429.

## Cakupan skenario

| Folder | Yang diuji | Hasil yang diharapkan |
| --- | --- | --- |
| 00 Setup | Login 6 akun | 200, token tersimpan |
| 01 Baseline | Owner/Cashier mengakses tenant sendiri; Admin membaca Place B | 200, hanya baris milik tenant sendiri |
| 02 Place | Owner A / Cashier A / Outsider ke Place B dan Draft B (GET, PATCH profil, publishing, ordering, DELETE, members); Owner B ke Place A; daftar global oleh Owner A | 404 `Place not found`; daftar global 403 |
| 03a Menu | CRUD kategori dan item pada Place B oleh Owner A / Cashier A; arah sebaliknya | 404 `Place not found` |
| 03b Menu | ID smuggling: `placeId` milik A dengan `categoryId`/`menuItemId` milik B, termasuk membuat item di kategori B dan memindahkan item A ke kategori B | 404 `Menu category not found` / `Menu item not found` |
| 03c Menu | Filter `categoryId` asing pada daftar item dan menu publik; menu publik B menyembunyikan baris nonaktif; menu Draft B | Hasil kosong / 404 |
| 04a Meja | CRUD meja Place B oleh Owner A, Cashier A, Outsider; arah sebaliknya oleh Owner B / Cashier B | 404 `Place not found` |
| 04b Meja | ID smuggling: `placeId` A dengan `tableId` B | 404 `Dining table not found` |
| 05 Integritas | Owner B membaca ulang seluruh data B setelah semua serangan | Nama, status publish/ordering, harga, kategori, dan meja tidak berubah; tidak ada baris baru |

Setiap request penolakan juga memeriksa bahwa body berbentuk error envelope tanpa `data` dan
tidak memuat nama resource tenant lain. Respons 404 (bukan 403) dipakai agar keberadaan resource
tenant lain tidak terungkap.
