# Skenario dan Hasil Pengujian

Dokumen ini merupakan ekstraksi evidence pengujian dari repository Tooang untuk authentication, authorization/RBAC, permission, tenant isolation, cross-tenant access, resource ownership, dan business rule kritis. Status yang digunakan adalah `IMPLEMENTED`, `DOCUMENTED`, `DOCUMENTATION / IMPLEMENTATION GAP`, dan `NOT FOUND IN REPOSITORY`.

Dokumen ini membedakan dua hal secara ketat:

| Istilah                        | Arti dalam dokumen ini                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Test Exists**                | File dan kasus test ada di repository. Ini adalah *test specification*; keberadaannya tidak membuktikan test pernah lulus.                    |
| **Test Executed Successfully** | Ada hasil eksekusi nyata dengan kondisi yang tercatat: dari dokumen di repository (`DOCUMENTED`) atau dari eksekusi lokal saat penyusunan dokumen ini. |

Hasil eksekusi berasal dari sumber berbeda yang tidak boleh dicampur:

1. **Verification record di repository.** Tercatat pada audit implementasi bertanggal 2026-09-17 (`DOCUMENTED`).
2. **Eksekusi lokal unit test saat penyusunan dokumen.** Dijalankan pada 2026-10-22 terhadap source code commit `7fcf3d2` (backend Jest dan frontend Vitest).
3. **Eksekusi lokal E2E dengan PostgreSQL lokal.** Dijalankan pada 2026-10-22 melalui `npm run test:e2e:local` dengan `TEST_DATABASE_URL` dari `backend/.env` pengguna. Script tersebut belum ada pada `7fcf3d2`; script ditambahkan pada working tree saat penyusunan dokumen dan kemudian di-commit pada `931d54c` (lihat §8.2).

Detail lingkungan sumber 2 dan 3 ada di §8.2. Hasil keduanya adalah observasi penyusun, bukan artefak yang tersimpan di repository.

## 1. Testing Strategy

### `IMPLEMENTED`

Strategi pengujian yang dapat dibuktikan dari struktur repository:

| Lapisan                          | Lokasi                                       | Karakteristik                                                                                                                         |
| -------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Backend unit test                | `backend/src/**/__tests__/*.spec.ts`         | Menguji service, guard, repository, schema, dan permission map dengan dependency yang di-mock.                                         |
| Backend E2E / integrasi database | `backend/test/*.e2e-spec.ts`                 | Menjalankan aplikasi NestJS/Prisma terhadap PostgreSQL nyata melalui HTTP (`supertest`) atau repository langsung.                     |
| Frontend unit / komponen         | `frontend/src/**/*.test.{ts,tsx}`            | Menguji pembentukan ability CASL, route guard, service, query, schema, dan komponen.                                                  |
| CI                               | `.github/workflows/backend-ci.yml`           | Backend saja: migration deploy ke PostgreSQL 16, unit test, build, lalu E2E test.                                                     |

Seluruh suite E2E backend dibungkus `describeDatabase`, yang menjadi `describe.skip` bila environment variable `TEST_DATABASE_URL` tidak di-set. Akibatnya, suite E2E hanya benar-benar berjalan pada lingkungan yang menyediakan database test, misalnya CI.

Jest tidak memuat `backend/.env`, sehingga `TEST_DATABASE_URL` yang hanya ditulis di `.env` tidak terbaca oleh `npm run test:e2e`. Untuk eksekusi lokal, repository menyediakan script `test:e2e:local` yang memuat `.env` melalui `node --env-file=.env`. Langkah menyiapkan database test (database terpisah dan migration) didokumentasikan di README backend. Script `test:e2e` yang dipakai CI tidak berubah.

Catatan provenance: script `test:e2e:local`, bagian README "Running database E2E tests locally", dan contoh `TEST_DATABASE_URL` di `.env.example` ditambahkan secara sengaja pada commit `931d54c`, yaitu commit yang sama dengan penambahan dokumen ini. Ketiganya bukan bagian dari baseline `7fcf3d2` dan tidak mengubah source code aplikasi maupun konfigurasi CI.

Source:

- `backend/package.json:16-21`
- `backend/package.json:76-101`
- `backend/README.md:384-412`
- `backend/.env.example:11-13`
- `backend/test/jest-e2e.json:1-18`
- `frontend/package.json:10`
- `frontend/vitest.config.ts:11-19`
- `.github/workflows/backend-ci.yml:1-49`
- `backend/test/app.e2e-spec.ts:8-11`
- `backend/test/database-constraints.e2e-spec.ts:7-8`
- `backend/test/auth-users.e2e-spec.ts:15-16`

### `DOCUMENTED`

SRS menetapkan bahwa mapping permission untuk platform role dan membership role, beserta keputusan scope yang representatif, harus dicakup automated test (SRS-AUTHZ-017). Test matriks permission juga harus lulus sebelum release (SRS-TST-005).

Source:

- `backend/docs/software-requirement-specification.md:173`
- `backend/docs/srs-v1.3-implementation-audit.md:361`

## 2. Testing Tools dan Framework

### `IMPLEMENTED`

| Bagian   | Tool                                   | Evidence                                                                                                      |
| -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Backend  | Jest 30, `ts-jest`, `supertest`        | Script `test`, `test:e2e`, `test:cov`; config Jest unit (`rootDir: src`) dan E2E (`testRegex: .e2e-spec.ts$`). |
| Backend  | PostgreSQL 16 (CI service)             | Service `postgres:16` dengan health check; `TEST_DATABASE_URL` di-set pada job.                                |
| Frontend | Vitest 5, Testing Library              | Script `test: vitest run`; `include: src/**/*.test.{ts,tsx}`; `environment: node`; setup file.                 |
| CI       | GitHub Actions, Node.js 22             | `actions/setup-node@v4` dengan `node-version: 22`.                                                            |

Source:

- `backend/package.json:16-21`
- `backend/package.json:54-74`
- `backend/test/jest-e2e.json:1-18`
- `frontend/package.json:10`
- `frontend/package.json:43-71`
- `frontend/vitest.config.ts:1-20`
- `.github/workflows/backend-ci.yml:10-49`

### `NOT FOUND IN REPOSITORY`

- Workflow CI untuk frontend.
- Tool atau script load/performance testing.
- Tool security scanning atau penetration testing.
- Konfigurasi coverage threshold.

Source:

- `.github/workflows/` (hanya berisi `backend-ci.yml`)
- `backend/docs/srs-v1.3-implementation-audit.md:362`

## 3. Test Categories

### 3.1 Unit Testing

### `IMPLEMENTED` — Test Exists

- Backend: 54 file `*.spec.ts` di bawah `backend/src`.
- Frontend: 120 file `*.test.{ts,tsx}` di bawah `frontend/src`.

File unit test backend yang paling relevan dengan fokus penelitian:

| File                                                                     | Fokus                                                          |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `backend/src/common/auth/__tests__/permissions.spec.ts`                  | Matriks permission, scope, default deny                        |
| `backend/src/common/guards/__tests__/permissions.guard.spec.ts`          | Coarse admission endpoint                                      |
| `backend/src/modules/auth/__tests__/jwt-auth.guard.spec.ts`              | Verifikasi token dan principal dari database                   |
| `backend/src/modules/auth/__tests__/auth.service.spec.ts`, `auth-hardening.spec.ts` | Password, registrasi, refresh rotation              |
| `backend/src/modules/places/__tests__/place-access.service.spec.ts`      | Global vs membership scope, foreign tenant                     |
| `backend/src/modules/places/__tests__/place-members.service.spec.ts`     | Last OWNER, demosi OWNER, reaktivasi                           |
| `backend/src/modules/places/__tests__/dining-tables.service.spec.ts`     | Pembatasan CASHIER, meja place lain                            |
| `backend/src/modules/orders/__tests__/order-queries.service.spec.ts`     | Scope baca own/place/global                                    |
| `backend/src/modules/orders/__tests__/order-transitions.service.spec.ts` | Permission per transisi, race                                  |
| `backend/src/modules/orders/__tests__/orders.repository.spec.ts`         | Predicate membership pada query order                          |
| `backend/src/modules/users/__tests__/users.service.spec.ts`              | Batas ADMIN/SUPER_ADMIN, invariant                              |
| `backend/src/modules/reviews/__tests__/reviews.service.spec.ts`          | Kepemilikan order, moderasi                                    |
| `backend/src/modules/media/__tests__/media.service.spec.ts`              | Target media place lain                                        |

File unit test frontend yang relevan: `frontend/src/utils/__tests__/create-ability.test.ts`, `frontend/src/utils/auth/__tests__/authorization-scenarios.test.ts`, `dashboard-route-access.test.ts`, `dashboard-access.test.ts`, `customer-access.test.ts`, `frontend/src/utils/__tests__/dashboard-place.test.ts`, dan `frontend/src/configs/auth/__tests__/jwt-service.test.ts`.

Source:

- `backend/src/` (54 file `*.spec.ts`)
- `frontend/src/` (120 file `*.test.ts`/`*.test.tsx`)

### 3.2 Integration Testing

### `IMPLEMENTED` — Test Exists

Repository tidak memisahkan folder khusus "integration". Suite berikut menguji integrasi repository/Prisma dengan PostgreSQL nyata tanpa melalui HTTP:

| File                                              | Jumlah `it` | Fokus                                                                             |
| ------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `backend/test/place-access.repository.e2e-spec.ts`| 3           | Lookup membership aktif, lifecycle user/place, rollback mutation bila audit gagal |
| `backend/test/database-constraints.e2e-spec.ts`   | 12          | Constraint tenant, CHECK, trigger cart, membership unik, upload intent, index     |

Verification record di audit menyebut kategori "PostgreSQL E2E/integration" sebagai satu kelompok.

Source:

- `backend/test/place-access.repository.e2e-spec.ts:15-159`
- `backend/test/database-constraints.e2e-spec.ts:23-730`
- `backend/docs/srs-v1.3-implementation-audit.md:406`

### 3.3 End-to-End Testing

### `IMPLEMENTED` — Test Exists

Suite E2E HTTP backend (`supertest` terhadap aplikasi NestJS):

| File                                   | Jumlah `it` | Fokus                                                                                   |
| -------------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `backend/test/app.e2e-spec.ts`         | 1           | Bootstrap aplikasi                                                                      |
| `backend/test/auth-users.e2e-spec.ts`  | 5           | Cookie auth, refresh reuse, deletion request, batas ADMIN/SUPER_ADMIN, demosi konkuren   |
| `backend/test/places.e2e-spec.ts`      | 1           | Siklus hidup place                                                                      |
| `backend/test/menus.e2e-spec.ts`       | 2           | Menu ter-scope dan menu publik                                                          |
| `backend/test/carts-orders.e2e-spec.ts`| 4           | Cart, checkout, idempotency                                                             |
| `backend/test/order-lifecycle.e2e-spec.ts` | 5       | Isolasi baca order, transisi, verifikasi publik, expiry, transisi konkuren              |
| `backend/test/reviews.e2e-spec.ts`     | 2           | Review dan moderasi                                                                     |

Total yang terdeteksi oleh runner: 9 suite / 35 test, termasuk dua suite di §3.2.

E2E berbasis browser (misalnya Playwright atau Cypress) tidak ditemukan.

Source:

- `backend/test/*.e2e-spec.ts`
- §8.2 dokumen ini (output runner E2E)

### 3.4 Other Testing

### `IMPLEMENTED` — Test Exists

- Test schema validasi Zod di backend (`*.schema.spec.ts`) dan frontend (`schemas/__tests__`).
- Test observability: health controller, operational metrics, request context middleware.
- Test rate limit auth (`auth-rate-limit.guard.spec.ts`, `auth-rate-limit.service.spec.ts`).

Source:

- `backend/src/modules/*/__tests__/*.schema.spec.ts`
- `backend/src/modules/observability/__tests__/`
- `backend/src/modules/auth/__tests__/auth-rate-limit.guard.spec.ts:36-52`

### `NOT FOUND IN REPOSITORY`

- **Load test.** Audit mencatat SRS-TST-006 sebagai `NOT_IMPLEMENTED`, yaitu prototype load suite tidak ada.
- **Penetration test atau security audit eksternal.**
- **Backup/restore test.** Audit mencatat SRS-TST-004 sebagai `PARTIALLY_IMPLEMENTED` karena evidence rollback/restore tidak ada.

Source:

- `backend/docs/srs-v1.3-implementation-audit.md:361-363`
- `backend/docs/srs-v1.3-implementation-audit.md:367-373`

## 4. Authentication Test Scenarios

Kolom **Result**: `PASSED (local)` berarti test termasuk run unit test lokal 2026-10-22 yang seluruhnya lulus. `PASSED (local E2E)` berarti test termasuk run E2E lokal 2026-10-22 terhadap PostgreSQL lokal; status per `it` diambil dari laporan JSON Jest (35/35 `passed`). Detail keduanya ada di §8.2. Bila satu baris merujuk ke satu `it` besar (misalnya `auth-users.e2e-spec.ts:255-490`), statusnya adalah status `it` tersebut secara keseluruhan. Kolom **Actual** diisi "Assertion terpenuhi" untuk test yang lulus.

| ID      | Scenario                                                                                     | Actor/Role             | Tenant | Expected                                                                 | Actual               | Result           | Source                                                          |
| ------- | -------------------------------------------------------------------------------------------- | ---------------------- | ------ | ------------------------------------------------------------------------ | -------------------- | ---------------- | --------------------------------------------------------------- |
| AUTH-01 | Token valid diverifikasi dan `request.user` diganti actor dari database                       | User terautentikasi    | —      | Actor = state database terkini                                            | Assertion terpenuhi  | PASSED (local)   | `backend/src/modules/auth/__tests__/jwt-auth.guard.spec.ts:48-77` |
| AUTH-02 | Token valid tetapi tidak ada actor aktif di server                                            | User nonaktif          | —      | Ditolak                                                                   | Assertion terpenuhi  | PASSED (local)   | `backend/src/modules/auth/__tests__/jwt-auth.guard.spec.ts:79-86` |
| AUTH-03 | Route `@Public()` tidak diautentikasi                                                        | Visitor                | —      | Guard tidak memverifikasi token                                           | Assertion terpenuhi  | PASSED (local)   | `backend/src/modules/auth/__tests__/jwt-auth.guard.spec.ts:88-93` |
| AUTH-04 | Actor dibentuk minimal dan immutable dari state server                                        | User terautentikasi    | —      | Actor hanya berisi field yang diperlukan                                  | Assertion terpenuhi  | PASSED (local)   | `backend/src/modules/auth/__tests__/auth-principal.service.spec.ts:26` |
| AUTH-05 | Registrasi membuat user `USER` secara eksplisit di dalam transaksi service                    | Visitor                | —      | Platform role `USER`                                                      | Assertion terpenuhi  | PASSED (local)   | `backend/src/modules/auth/__tests__/auth-hardening.spec.ts:45-89` |
| AUTH-06 | Login dengan email tidak dikenal memakai dummy bcrypt verification                           | Visitor                | —      | Verifikasi dummy dijalankan                                               | Assertion terpenuhi  | PASSED (local)   | `backend/src/modules/auth/__tests__/auth-hardening.spec.ts:26-43` |
| AUTH-07 | Reuse refresh token yang sudah dirotasi                                                      | User terautentikasi    | —      | Seluruh family direvoke                                                   | Assertion terpenuhi  | PASSED (local)   | `backend/src/modules/auth/__tests__/auth.service.spec.ts:64`      |
| AUTH-08 | Parent session dikonsumsi sebelum replacement dibuat dan ditautkan                            | User terautentikasi    | —      | Urutan rotasi benar                                                       | Assertion terpenuhi  | PASSED (local)   | `backend/src/modules/auth/__tests__/auth-hardening.spec.ts:101`   |
| AUTH-09 | Rate limit verifikasi publik memakai scope IP; lookup order-code memakai actor + IP dan `Retry-After` | Visitor / staff | —      | Scope rate limit sesuai policy                                            | Assertion terpenuhi  | PASSED (local)   | `backend/src/modules/auth/__tests__/auth-rate-limit.guard.spec.ts:36-52` |
| AUTH-10 | Alur cookie authentication dan profil user saat ini                                           | User                   | —      | Login, refresh, `/me` berhasil                                            | Assertion terpenuhi | PASSED (local E2E) | `backend/test/auth-users.e2e-spec.ts:121-195`                   |
| AUTH-11 | Refresh token yang sama dikirim bersamaan                                                    | User                   | —      | Seluruh family direvoke                                                   | Assertion terpenuhi | PASSED (local E2E) | `backend/test/auth-users.e2e-spec.ts:197-222`                   |
| AUTH-12 | Setelah deletion request, access dan refresh token lama diblokir                              | User                   | —      | Token lama ditolak                                                        | Assertion terpenuhi | PASSED (local E2E) | `backend/test/auth-users.e2e-spec.ts:224-253`                   |
| AUTH-13 | Setelah user dinonaktifkan, `GET /me` dengan token lama                                       | USER (target)          | —      | `401`                                                                     | Assertion terpenuhi | PASSED (local E2E) | `backend/test/auth-users.e2e-spec.ts:255-490`                   |
| AUTH-14 | Frontend: bearer token ditempel; refresh sekali lalu retry; satu refresh bersama untuk 401 konkuren; sesi dibersihkan bila refresh gagal | Frontend client | — | Perilaku interceptor sesuai | Assertion terpenuhi | PASSED (local) | `frontend/src/configs/auth/__tests__/jwt-service.test.ts:74-240` |

## 5. RBAC Test Scenarios

### 5.1 Platform Role Authorization

| ID      | Scenario                                                                                    | Actor/Role         | Tenant         | Expected                                                                   | Actual              | Result          | Source                                                                    |
| ------- | ------------------------------------------------------------------------------------------- | ------------------ | -------------- | -------------------------------------------------------------------------- | ------------------- | --------------- | ------------------------------------------------------------------------- |
| RBAC-01 | Allowlist USER tepat pada scope `own`                                                       | USER               | —              | Hanya grant self-service                                                   | Assertion terpenuhi | PASSED (local)  | `backend/src/common/auth/__tests__/permissions.spec.ts:90-111`            |
| RBAC-02 | Grant ADMIN global/restricted tanpa security administration                                | ADMIN              | Semua place    | Tidak ada `owner.*`/`platform_role.*`; `user.deactivate` restricted        | Assertion terpenuhi | PASSED (local)  | `backend/src/common/auth/__tests__/permissions.spec.ts:113-181`           |
| RBAC-03 | Grant SUPER_ADMIN termasuk security dan ownership administration                           | SUPER_ADMIN        | Semua place    | `owner.*`, `platform_role.*`, `user.deactivate` global                     | Assertion terpenuhi | PASSED (local)  | `backend/src/common/auth/__tests__/permissions.spec.ts:183-237`           |
| RBAC-04 | ADMIN membuat USER dengan password ter-hash dan audit tersanitasi                           | ADMIN              | —              | User dibuat                                                                | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/users/__tests__/users.service.spec.ts:42-74`         |
| RBAC-05 | ADMIN mencoba membuat akun berplatform role tinggi                                          | ADMIN              | —              | Ditolak                                                                    | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/users/__tests__/users.service.spec.ts:76-90`         |
| RBAC-06 | ADMIN menonaktifkan ADMIN / SUPER_ADMIN                                                     | ADMIN              | —              | Ditolak                                                                    | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/users/__tests__/users.service.spec.ts:171-191`       |
| RBAC-07 | Update platform role tanpa grant global yang dipetakan                                      | Non-SUPER_ADMIN    | —              | Ditolak                                                                    | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/users/__tests__/users.service.spec.ts:193-206`       |
| RBAC-08 | Assignment ke role yang sama adalah read idempoten tanpa write/audit                        | SUPER_ADMIN        | —              | Tidak ada write                                                            | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/users/__tests__/users.service.spec.ts:246-261`       |
| RBAC-09 | `/me` mengembalikan permission platform dan membership; SUPER_ADMIN global tanpa membership | USER / SUPER_ADMIN | Place member   | Metadata sesuai                                                            | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/users/__tests__/users.service.spec.ts:92-169`        |
| RBAC-10 | Batas administrasi user ADMIN vs SUPER_ADMIN via HTTP (list user, ubah role, deaktivasi, membership OWNER) | USER, ADMIN, SUPER_ADMIN | Place test | `403` untuk USER/ADMIN pada operasi terlarang; `200` untuk SUPER_ADMIN | Assertion terpenuhi | PASSED (local E2E) | `backend/test/auth-users.e2e-spec.ts:255-490`                             |
| RBAC-11 | Moderasi review ditolak setelah administrator didemosi                                      | ADMIN → USER       | —              | Ditolak                                                                    | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:218-225`   |

### 5.2 Tenant Role Authorization

| ID      | Scenario                                                                               | Actor/Role       | Tenant         | Expected                                                     | Actual              | Result          | Source                                                                          |
| ------- | -------------------------------------------------------------------------------------- | ---------------- | -------------- | ------------------------------------------------------------ | ------------------- | --------------- | ------------------------------------------------------------------------------- |
| RBAC-12 | Allowlist CASHIER tepat pada scope `member`                                            | CASHIER          | Member place   | Hanya grant operasional                                      | Assertion terpenuhi | PASSED (local)  | `backend/src/common/auth/__tests__/permissions.spec.ts:239-258`                 |
| RBAC-13 | OWNER memiliki management pada scope `owned` tanpa platform/OWNER administration      | OWNER            | Owned place    | Tidak ada `owner.*`                                          | Assertion terpenuhi | PASSED (local)  | `backend/src/common/auth/__tests__/permissions.spec.ts:260-293`                 |
| RBAC-14 | CASHIER membaca meja                                                                   | CASHIER          | Member place   | Hanya meja aktif                                             | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/dining-tables.service.spec.ts:20-35`      |
| RBAC-15 | Demosi OWNER memerlukan revocation OWNER dan assignment CASHIER                        | OWNER / SUPER_ADMIN | Owned place | Kedua permission diperiksa                                   | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/place-members.service.spec.ts:51-86`      |
| RBAC-16 | Konfirmasi order oleh ADMIN tanpa membership, outsider, dan CASHIER                    | ADMIN, outsider, CASHIER | Place test | ADMIN `404`, outsider `404`, CASHIER `200`               | Assertion terpenuhi | PASSED (local E2E) | `backend/test/order-lifecycle.e2e-spec.ts:236-254`                              |
| RBAC-17 | Frontend: CASHIER mendapat UI operasional tanpa aksi konfigurasi; OWNER mengelola place tanpa platform administration | CASHIER, OWNER | Selected place | Ability sesuai metadata | Assertion terpenuhi | PASSED (local) | `frontend/src/utils/auth/__tests__/authorization-scenarios.test.ts:51-83` |
| RBAC-18 | Frontend: capability berubah ketika membership aktif berganti                         | Multi-membership | Dua place      | Ability mengikuti place terpilih                             | Assertion terpenuhi | PASSED (local)  | `frontend/src/utils/auth/__tests__/authorization-scenarios.test.ts:116`         |

### 5.3 Permission Authorization

| ID      | Scenario                                                                           | Actor/Role      | Tenant | Expected                                                | Actual              | Result         | Source                                                                       |
| ------- | ---------------------------------------------------------------------------------- | --------------- | ------ | ------------------------------------------------------- | ------------------- | -------------- | ---------------------------------------------------------------------------- |
| PERM-01 | Daftar identifier stabil, unik, dan berbasis capability                            | —               | —      | Tidak ada duplikat                                      | Assertion terpenuhi | PASSED (local) | `backend/src/common/auth/__tests__/permissions.spec.ts:28-79`                |
| PERM-02 | Setiap role yang didukung terpetakan dan tidak ada role yang tidak dikenal          | —               | —      | Map lengkap                                             | Assertion terpenuhi | PASSED (local) | `backend/src/common/auth/__tests__/permissions.spec.ts:81-88`                |
| PERM-03 | Grant platform dan membership digabung aditif tanpa kehilangan scope              | —               | —      | Scope tetap                                             | Assertion terpenuhi | PASSED (local) | `backend/src/common/auth/__tests__/permissions.spec.ts:295-321`              |
| PERM-04 | Platform authority dan membership saling independen                               | —               | —      | Tidak saling menurunkan                                 | Assertion terpenuhi | PASSED (local) | `backend/src/common/auth/__tests__/permissions.spec.ts:365-380`              |
| PERM-05 | Role dan permission tidak dikenal menghasilkan penolakan                           | —               | —      | Default deny                                            | Assertion terpenuhi | PASSED (local) | `backend/src/common/auth/__tests__/permissions.spec.ts:382-397`              |
| PERM-06 | Guard: semua permission yang dideklarasikan harus tersedia                         | —               | —      | Ditolak bila salah satu tidak ada                       | Assertion terpenuhi | PASSED (local) | `backend/src/common/guards/__tests__/permissions.guard.spec.ts:52-61`        |
| PERM-07 | Guard meloloskan operasi membership-capable tanpa menganggapnya target access     | USER            | —      | Admission saja                                          | Assertion terpenuhi | PASSED (local) | `backend/src/common/guards/__tests__/permissions.guard.spec.ts:63-68`        |
| PERM-08 | Guard any-of untuk route yang aksinya diputuskan di service                       | —               | —      | Lolos bila salah satu tersedia                          | Assertion terpenuhi | PASSED (local) | `backend/src/common/guards/__tests__/permissions.guard.spec.ts:70-78`        |
| PERM-09 | Guard menolak capability global-only yang tidak diberikan platform role            | USER            | —      | `403`                                                   | Assertion terpenuhi | PASSED (local) | `backend/src/common/guards/__tests__/permissions.guard.spec.ts:80-86`        |
| PERM-10 | Transisi operasional dipetakan ke permission yang tepat                           | Staff           | Place  | `CONFIRMED→order.confirm`, dst.                         | Assertion terpenuhi | PASSED (local) | `backend/src/modules/orders/__tests__/order-transitions.service.spec.ts:88-103` |
| PERM-11 | Frontend: rule CASL hanya dari metadata backend; tidak menyimpulkan grant dari nama role | Frontend   | —      | Ability tidak dibentuk dari role                         | Assertion terpenuhi | PASSED (local) | `frontend/src/utils/__tests__/create-ability.test.ts:39-125`                 |
| PERM-12 | Frontend: permission non-global tidak dipromosikan menjadi akses semua place       | Frontend        | —      | Tidak ada rule tanpa kondisi                            | Assertion terpenuhi | PASSED (local) | `frontend/src/utils/__tests__/create-ability.test.ts:93-104`                 |

### 5.4 Unauthorized Access

| ID      | Scenario                                                                    | Actor/Role         | Tenant | Expected                                    | Actual              | Result          | Source                                                                     |
| ------- | --------------------------------------------------------------------------- | ------------------ | ------ | ------------------------------------------- | ------------------- | --------------- | -------------------------------------------------------------------------- |
| UNA-01  | Route terproteksi tanpa principal                                            | Tanpa auth         | —      | Ditolak                                     | Assertion terpenuhi | PASSED (local)  | `backend/src/common/guards/__tests__/permissions.guard.spec.ts:88-92`      |
| UNA-02  | Tidak ada grant platform maupun membership untuk permission                  | USER               | —      | Forbidden                                   | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/place-access.service.spec.ts:92-99`  |
| UNA-03  | Route global order tanpa scope global                                        | USER               | —      | Ditolak                                     | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/order-queries.service.spec.ts:26-31` |
| UNA-04  | `GET /users` oleh USER                                                       | USER               | —      | `403`                                       | Assertion terpenuhi | PASSED (local E2E) | `backend/test/auth-users.e2e-spec.ts:255-490`                              |
| UNA-05  | `GET /orders/:orderId` (global) oleh customer                                | USER               | —      | `403`                                       | Assertion terpenuhi | PASSED (local E2E) | `backend/test/order-lifecycle.e2e-spec.ts:227-229`                         |
| UNA-06  | Frontend: akses langsung tanpa autentikasi ke dashboard                      | Visitor            | —      | Redirect login dengan return path tersanitasi      | Assertion terpenuhi | PASSED (local)  | `frontend/src/utils/auth/__tests__/dashboard-access.test.ts:82-96`         |
| UNA-07  | Frontend: route yang ditolak                                                 | User               | —      | Redirect ke not-found                       | Assertion terpenuhi | PASSED (local)  | `frontend/src/utils/auth/__tests__/dashboard-route-access.test.ts:67`      |
| UNA-08  | Frontend: flag autentikasi tanpa principal yang ter-hydrate                  | —                  | —      | Tidak diterima                              | Assertion terpenuhi | PASSED (local)  | `frontend/src/utils/auth/__tests__/customer-access.test.ts:41`             |

## 6. Multi-Tenant Test Scenarios

### 6.1 Same-Tenant Access

| ID     | Scenario                                                                      | Actor/Role      | Tenant        | Expected                                    | Actual              | Result          | Source                                                                       |
| ------ | ----------------------------------------------------------------------------- | --------------- | ------------- | ------------------------------------------- | ------------------- | --------------- | ---------------------------------------------------------------------------- |
| MT-01  | Membership aktif yang cocok diizinkan                                         | OWNER/CASHIER   | Place sendiri | Akses membership                            | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/place-access.service.spec.ts:49-71`    |
| MT-02  | Lookup membership hanya cocok untuk target place dan role yang diizinkan       | OWNER, CASHIER  | Place A       | OWNER cocok; CASHIER tidak untuk `['OWNER']`| Assertion terpenuhi | PASSED (local E2E) | `backend/test/place-access.repository.e2e-spec.ts:70-99`                     |
| MT-03  | Detail order place oleh OWNER dan CASHIER; lookup by-code oleh OWNER          | OWNER, CASHIER  | Place test    | `200`                                       | Assertion terpenuhi | PASSED (local E2E) | `backend/test/order-lifecycle.e2e-spec.ts:210-222`                           |
| MT-04  | Membership diperiksa ulang dan diteruskan ke predicate query order            | Staff           | Place         | Predicate membership di query               | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/order-queries.service.spec.ts:33-55`   |
| MT-05  | Query order place-scoped menyertakan scope membership saat ini                | Staff           | Place         | Predicate `members.some` di `where`         | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/orders.repository.spec.ts:6-27`        |

### 6.2 Cross-Tenant Access

| ID     | Scenario                                                                    | Actor/Role    | Tenant              | Expected                     | Actual              | Result          | Source                                                                        |
| ------ | --------------------------------------------------------------------------- | ------------- | ------------------- | ---------------------------- | ------------------- | --------------- | ----------------------------------------------------------------------------- |
| MT-06  | Member place A mengakses place B                                            | Member        | Place lain          | Ditolak sebagai not found     | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/place-access.service.spec.ts:49-71`     |
| MT-07  | Place yang tidak ada disembunyikan dari semua actor                         | Semua         | Place tidak ada     | `404`                         | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/place-access.service.spec.ts:135-145`   |
| MT-08  | ADMIN memakai membership independen bila tidak punya grant global           | ADMIN         | Place member        | Jalur membership              | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/place-access.service.spec.ts:73-90`     |
| MT-09  | ADMIN hanya diizinkan untuk permission berscope global                     | ADMIN         | Semua place         | Global hanya bila grant global| Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/place-access.service.spec.ts:23-47`     |
| MT-10  | Membership pada place lain tidak berlaku untuk target place                 | OWNER         | Foreign place       | `null`                        | Assertion terpenuhi | PASSED (local E2E) | `backend/test/place-access.repository.e2e-spec.ts:70-99`                      |
| MT-11  | Outsider membaca detail order place                                         | Outsider      | Place lain          | `404`                         | Assertion terpenuhi | PASSED (local E2E) | `backend/test/order-lifecycle.e2e-spec.ts:223-226`                            |
| MT-12  | Daftar member place asing                                                   | User          | Foreign place       | `404`                         | Assertion terpenuhi | PASSED (local E2E) | `backend/test/auth-users.e2e-spec.ts:255-490`                                 |
| MT-13  | Meja milik place lain                                                       | Member        | Place lain          | Not found                     | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/dining-tables.service.spec.ts:37-54`    |
| MT-14  | Frontend: scope platform dan place dipisah; rule place memakai kondisi `placeId` | Frontend | Multi-place      | Rule terpisah                 | Assertion terpenuhi | PASSED (local)  | `frontend/src/utils/__tests__/create-ability.test.ts:68-91`                   |
| MT-15  | Frontend: route place memakai effective permission place terpilih, terpisah dari global | Frontend | Selected place | Pemeriksaan terpisah          | Assertion terpenuhi | PASSED (local)  | `frontend/src/utils/auth/__tests__/dashboard-route-access.test.ts:37-56`      |
| MT-16  | Frontend: pilihan place yang tidak tersedia jatuh ke membership lain          | Frontend      | Multi-place         | Fallback alfabetis            | Assertion terpenuhi | PASSED (local)  | `frontend/src/utils/__tests__/dashboard-place.test.ts:26-38`                  |

### 6.3 Tenant Resource Ownership

| ID     | Scenario                                                                        | Actor/Role | Tenant        | Expected                                       | Actual              | Result          | Source                                                                       |
| ------ | ------------------------------------------------------------------------------- | ---------- | ------------- | ---------------------------------------------- | ------------------- | --------------- | ---------------------------------------------------------------------------- |
| OWN-01 | Scope own order selalu diturunkan dari actor                                    | USER       | —             | `userId = actor.id`                            | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/order-queries.service.spec.ts:14-24`   |
| OWN-02 | Own order yang hilang atau milik user lain tidak diungkap                        | USER       | —             | Not found                                      | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/order-queries.service.spec.ts:57-63`   |
| OWN-03 | Token verifikasi hanya dari order milik sendiri yang eligible                    | USER       | —             | Token hanya untuk pemilik                      | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/order-queries.service.spec.ts:65-83`   |
| OWN-04 | Pemilihan token verifikasi privat di-scope ke pemilik dan hanya memilih token   | USER       | —             | Predicate pemilik                              | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/orders.repository.spec.ts:87`          |
| OWN-05 | Review hanya dari order milik sendiri yang `COMPLETED`; order user lain disembunyikan | USER | Place order | Review dibuat / not found                      | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:130-200`      |
| OWN-06 | Daftar review sendiri hanya milik actor                                          | USER       | —             | Scope actor                                    | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:68-73`        |
| OWN-07 | Isolasi baca own, place, foreign-tenant, dan global dalam satu alur HTTP        | Customer, OWNER, CASHIER, outsider, ADMIN | Place test | Kombinasi `200`/`404`/`403` sesuai scope | Assertion terpenuhi | PASSED (local E2E) | `backend/test/order-lifecycle.e2e-spec.ts:179-235` |

### 6.4 Cross-Tenant Modification Attempts

| ID     | Scenario                                                                         | Actor/Role | Tenant               | Expected                                | Actual              | Result          | Source                                                                       |
| ------ | -------------------------------------------------------------------------------- | ---------- | -------------------- | --------------------------------------- | ------------------- | --------------- | ---------------------------------------------------------------------------- |
| XT-01  | Membuat atau memindahkan menu item ke kategori place lain                        | Direct DB  | Dua place            | Ditolak database                        | Assertion terpenuhi | PASSED (local E2E) | `backend/test/database-constraints.e2e-spec.ts:238-245`                      |
| XT-02  | Cart item dengan menu item place lain                                            | Direct DB  | Dua place            | Ditolak database                        | Assertion terpenuhi | PASSED (local E2E) | `backend/test/database-constraints.e2e-spec.ts:297-304`                      |
| XT-03  | Upload intent yang merujuk menu item place lain                                  | Direct DB  | Dua place            | Ditolak database                        | Assertion terpenuhi | PASSED (local E2E) | `backend/test/database-constraints.e2e-spec.ts:627-669`                      |
| XT-04  | Upload intent untuk target menu item asing/terhapus                              | OWNER      | Place lain           | Not found sebelum intent disimpan       | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/media/__tests__/media.service.spec.ts:128-140`          |
| XT-05  | Outsider mengonfirmasi order place lain                                          | Outsider   | Place lain           | `404`                                   | Assertion terpenuhi | PASSED (local E2E) | `backend/test/order-lifecycle.e2e-spec.ts:244-248`                           |
| XT-06  | Lookup meja di-scope dengan place dan child ID, mengecualikan yang terhapus      | —          | Place                | Predicate `placeId` + `id`              | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/places.repository.spec.ts:74`          |
| XT-07  | Mutation membership dibatalkan bila audit wajib gagal                            | Staff      | Place                | Rollback                                | Assertion terpenuhi | PASSED (local E2E) | `backend/test/place-access.repository.e2e-spec.ts:127-159`                   |

Tidak ditemukan test HTTP yang secara spesifik mencoba mutation menu, meja, atau place oleh OWNER place A terhadap place B. Skenario cross-tenant untuk mutation diuji melalui unit test service, constraint database, dan transisi order.

Source:

- `backend/test/menus.e2e-spec.ts:74-140`
- `backend/test/places.e2e-spec.ts:77`

## 7. Critical Business Rule Tests

| ID     | Scenario                                                                         | Actor/Role       | Tenant       | Expected                                           | Actual              | Result          | Source                                                                             |
| ------ | -------------------------------------------------------------------------------- | ---------------- | ------------ | -------------------------------------------------- | ------------------- | --------------- | ---------------------------------------------------------------------------------- |
| BR-01  | Revocation OWNER aktif terakhir diblokir                                         | Staff            | Place        | Conflict                                           | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/place-members.service.spec.ts:31-49`         |
| BR-02  | Reaktivasi memakai baris membership unik yang sama dan diaudit atomik             | Staff            | Place        | Baris sama, audit dalam transaksi                  | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/place-members.service.spec.ts:88-117`        |
| BR-03  | Dua revocation OWNER bersamaan                                                   | SUPER_ADMIN      | Place test   | Status `[200, 409]`                                | Assertion terpenuhi | PASSED (local E2E) | `backend/test/auth-users.e2e-spec.ts:448-460`                                      |
| BR-04  | SUPER_ADMIN aktif terakhir: deaktivasi, demosi, deletion request                 | SUPER_ADMIN      | —            | Ditolak                                            | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/users/__tests__/users.service.spec.ts:220-244`, `:275-285`    |
| BR-05  | Demosi konkuren SUPER_ADMIN                                                      | SUPER_ADMIN      | —            | Tetap ada satu SUPER_ADMIN aktif                   | Assertion terpenuhi | PASSED (local E2E) | `backend/test/auth-users.e2e-spec.ts:491-548`                                      |
| BR-06  | Sole OWNER aktif: deaktivasi dan deletion request                                | ADMIN / USER     | Place        | Ditolak                                            | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/users/__tests__/users.service.spec.ts:208-218`, `:263-273`    |
| BR-07  | Place dan membership OWNER awal dibuat bersama dengan dua audit dalam satu transaksi | ADMIN       | Place baru   | Atomik                                             | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/places/__tests__/places.service.spec.ts:75-126`               |
| BR-08  | Pembatalan oleh customer setelah `PENDING`                                       | USER             | —            | Ditolak tanpa write                                | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/order-transitions.service.spec.ts:105-117`   |
| BR-09  | `PENDING` yang kedaluwarsa ditolak sebelum scheduler mengisi `EXPIRED`           | Staff            | Place        | `ORDER_PENDING_EXPIRED`                            | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/order-transitions.service.spec.ts:119-129`   |
| BR-10  | Update kondisional yang kalah race                                               | Staff            | Place        | Conflict stabil                                    | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/order-transitions.service.spec.ts:131-143`   |
| BR-11  | Pembatalan setelah `CONFIRMED` tanpa alasan; dengan alasan; ADMIN membatalkan    | OWNER, ADMIN     | Place test   | `400`, `200`, `200`                                | Assertion terpenuhi | PASSED (local E2E) | `backend/test/order-lifecycle.e2e-spec.ts:255-274`                                 |
| BR-12  | Hanya satu transisi konkuren dari status yang sama yang berhasil                 | Staff            | Place test   | Satu sukses                                        | Assertion terpenuhi | PASSED (local E2E) | `backend/test/order-lifecycle.e2e-spec.ts:335-354`                                 |
| BR-13  | Verifikasi publik minimal; token yang tidak dapat dipakai disembunyikan          | Visitor          | —            | Field minimal; `404`                               | Assertion terpenuhi | PASSED (local E2E) | `backend/test/order-lifecycle.e2e-spec.ts:276-316`                                 |
| BR-14  | Manual order `CONFIRMED` dari snapshot menu server; item tidak tersedia ditolak; replay idempoten | CASHIER/OWNER | Place | Sesuai rule                              | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/orders/__tests__/manual-orders.service.spec.ts:100-140`       |
| BR-15  | Checkout tepat sekali; request ekuivalen bersamaan menghasilkan satu order       | USER             | Place        | Satu order                                         | Assertion terpenuhi | PASSED (local E2E) | `backend/test/carts-orders.e2e-spec.ts:113-285`                                    |
| BR-16  | Satu membership per user per place, termasuk baris revoked                       | Direct DB        | Place        | Ditolak database                                   | Assertion terpenuhi | PASSED (local E2E) | `backend/test/database-constraints.e2e-spec.ts:618-625`                            |
| BR-17  | Review: restore setelah soft delete; duplikat aktif dan order belum selesai ditolak | USER          | Place        | Sesuai rule                                        | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:147-180`            |
| BR-18  | Moderasi memeriksa ulang permission global dan diaudit atomik                    | ADMIN            | —            | Sesuai rule                                        | Assertion terpenuhi | PASSED (local)  | `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:202-216`            |

## 8. Test Results

### 8.1 Hasil yang tercatat di repository (`DOCUMENTED`)

Audit implementasi SRS v1.3 bertanggal **2026-09-17** memuat *verification record* berikut. Hasil di bawah disalin apa adanya:

| Check                                    | Result  | Catatan di dokumen                                                                                    |
| ---------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| Requirement cardinality                  | PASS    | 345 parsed IDs; 345 rows; no duplicates                                                               |
| API document ledger                      | PASS    | Every controller route maps to one feature document; the legacy root is recorded as a gap             |
| Prisma validation/generation             | PASS    | Prisma 7.10.0 validated the schema and generated the client                                           |
| Empty-database migration deployment/diff | NOT RUN | No safely isolated PostgreSQL database was available                                                  |
| TypeScript build                         | PASS    | `nest build` completed successfully                                                                   |
| ESLint and Prettier check                | PASS    | Non-mutating checks completed successfully                                                            |
| Unit tests                               | PASS    | 52 suites and 309 tests passed                                                                        |
| PostgreSQL E2E/integration               | NOT RUN | 9 suites/35 tests were discovered but skipped because no isolated `TEST_DATABASE_URL` was available   |
| Load/backup/production checks            | NOT RUN | Requires F-04, F-05, and F-07                                                                         |

Dokumen yang sama juga menyatakan bahwa tidak ditemukan *critical authorization bypass*, tenant leak, maupun defect sejenis pada "inspected automated baseline". Pernyataan ini adalah kesimpulan audit tersebut, bukan hasil test yang dapat diverifikasi ulang dari artefak.

Source:

- `backend/docs/srs-v1.3-implementation-audit.md:6`
- `backend/docs/srs-v1.3-implementation-audit.md:365-367`
- `backend/docs/srs-v1.3-implementation-audit.md:395-407`

### 8.2 Hasil eksekusi lokal saat penyusunan dokumen

Bagian ini bukan artefak repository. Isinya adalah output runner yang dijalankan penyusun dokumen.

| Atribut                 | Nilai                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Tanggal                 | 2026-10-22                                                                                          |
| Commit                  | Source code `7fcf3d2`. Working tree memuat file dokumen (`docs/`, `prompt/`) serta perubahan non-kode pada `backend/package.json` (script `test:e2e:local`), `backend/README.md`, dan `backend/.env.example`; perubahan tersebut kemudian di-commit pada `931d54c`. Tidak ada perubahan pada `backend/src`, `frontend/src`, Prisma schema, migration, atau workflow CI |
| OS                      | Windows 11 Pro                                                                                      |
| Node.js / npm           | v24.11.1 / 11.6.2 (CI memakai Node.js 22)                                                           |
| `TEST_DATABASE_URL`     | Unit test: tidak di-set. E2E: dimuat dari `backend/.env` melalui `test:e2e:local`.                  |
| Database E2E            | PostgreSQL 16.14 lokal (`localhost:5432`, database `db_tooang`), berbeda dari target `DATABASE_URL` |
| Migration database E2E  | Sebelum run: 7 dari 9 migration sudah diterapkan. Dua migration (`20260916163000_align_exact_expiry_defaults`, `20260927120000_add_category_thumbnails_and_manual_orders`) diterapkan dengan `prisma migrate deploy` hanya ke database tersebut. |

| Perintah                                                 | Hasil runner                                                           | Status                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| `backend: npm test -- --runInBand`                       | `Test Suites: 54 passed, 54 total`; `Tests: 331 passed, 331 total`     | Test Executed Successfully |
| `backend: npm run test:e2e -- --runInBand` (tanpa env)   | `Test Suites: 9 skipped, 0 of 9 total`; `Tests: 35 skipped, 35 total`  | Not executed (skipped)     |
| `backend: npm run test:e2e:local -- --runInBand`         | `Test Suites: 9 passed, 9 total`; `Tests: 35 passed, 35 total`         | Test Executed Successfully |
| `frontend: npx vitest run`                               | `Test Files 120 passed (120)`; `Tests 710 passed (710)`                | Test Executed Successfully |

Run E2E dijalankan dua kali dengan hasil yang sama (35/35 lulus). Run pertama memakai `--verbose`; run kedua memakai `--json --outputFile`, dan laporan JSON-nya menjadi sumber status per `it` di §4–§7: `numFailedTests: 0`, `numPendingTests: 0`. Output dan laporan JSON disimpan di direktori kerja penyusun, bukan di repository.

Status per `it` dari laporan JSON:

| Suite                                  | `it` lulus / total |
| -------------------------------------- | ------------------ |
| `auth-users.e2e-spec.ts`               | 5 / 5              |
| `order-lifecycle.e2e-spec.ts`          | 5 / 5              |
| `carts-orders.e2e-spec.ts`             | 4 / 4              |
| `database-constraints.e2e-spec.ts`     | 12 / 12            |
| `place-access.repository.e2e-spec.ts`  | 3 / 3              |
| `menus.e2e-spec.ts`                    | 2 / 2              |
| `reviews.e2e-spec.ts`                  | 2 / 2              |
| `places.e2e-spec.ts`                   | 1 / 1              |
| `app.e2e-spec.ts`                      | 1 / 1              |

Log aplikasi selama run E2E memuat entri `error`/`warn`, misalnya `Unique constraint failed` pada registrasi email duplikat, `Authentication failed`, `Authorization denied`, dan `refresh-token reuse detected`. Entri tersebut berasal dari skenario negatif yang memang diuji; tidak ada test yang gagal. Runner juga menampilkan `DeprecationWarning` dari library `pg` tentang `client.query()` yang dipanggil saat query lain masih berjalan.

Lint, format check, build, dan Prisma validate **tidak** dijalankan pada penyusunan dokumen ini.

### 8.3 CI

### `IMPLEMENTED` (konfigurasi)

Workflow backend menjalankan unit test dan E2E dengan `TEST_DATABASE_URL` yang di-set ke PostgreSQL 16, sehingga suite E2E dirancang untuk benar-benar berjalan di CI.

Source:

- `.github/workflows/backend-ci.yml:12-49`

### `NOT FOUND IN REPOSITORY`

Log, badge, atau artefak hasil run CI (misalnya JUnit XML atau laporan coverage) tidak tersimpan di repository. Hasil eksekusi E2E terhadap PostgreSQL tidak dapat dibuktikan dari repository; satu-satunya hasil E2E dalam dokumen ini adalah run lokal penyusun (§8.2).

Source:

- Pencarian file `*junit*`, `coverage`, `*.lcov`, `test-results*`, `*report*.json`, `*.xml` di luar `node_modules` tidak menemukan hasil.

## 9. Quantitative Test Summary

| Kategori                        | Test Exists (file)  | Test Exists (kasus)                     | Executed — DOCUMENTED (2026-09-17) | Executed — lokal (2026-10-22)        |
| ------------------------------- | ------------------- | --------------------------------------- | ---------------------------------- | ------------------------------------ |
| Backend unit                    | 54                  | 331 (hitungan runner)                   | 52 suite / 309 test PASS           | 54 suite / 331 test PASS             |
| Backend E2E + integrasi DB      | 9                   | 35 (hitungan runner)                    | NOT RUN (9 / 35 skipped)           | 9 suite / 35 test PASS (PostgreSQL 16.14 lokal) |
| Frontend unit/komponen          | 120                 | 710 (hitungan runner)                   | NOT FOUND IN REPOSITORY            | 120 file / 710 test PASS             |
| Load test                       | 0                   | 0                                       | NOT RUN                            | NOT FOUND IN REPOSITORY              |
| Security/penetration test       | 0                   | 0                                       | NOT FOUND IN REPOSITORY            | NOT FOUND IN REPOSITORY              |

Perbedaan jumlah unit test backend antara audit (52/309) dan run lokal (54/331) sesuai dengan adanya perubahan kode setelah tanggal audit, termasuk addendum fitur 2026-09-27. Dokumen ini tidak memetakan test mana yang ditambahkan.

Jumlah skenario per fokus yang tercatat di §4–§7 dokumen ini:

| Fokus                             | Skenario | PASSED (local) — unit | PASSED (local E2E) | FAILED |
| --------------------------------- | -------- | --------------------- | ------------------ | ------ |
| Authentication (§4)               | 14       | 10                    | 4                  | 0      |
| Platform role (§5.1)              | 11       | 10                    | 1                  | 0      |
| Tenant role (§5.2)                | 7        | 6                     | 1                  | 0      |
| Permission (§5.3)                 | 12       | 12                    | 0                  | 0      |
| Unauthorized access (§5.4)        | 8        | 6                     | 2                  | 0      |
| Same-tenant (§6.1)                | 5        | 3                     | 2                  | 0      |
| Cross-tenant (§6.2)               | 11       | 8                     | 3                  | 0      |
| Resource ownership (§6.3)         | 7        | 6                     | 1                  | 0      |
| Cross-tenant modification (§6.4)  | 7        | 2                     | 5                  | 0      |
| Critical business rule (§7)       | 18       | 11                    | 7                  | 0      |
| **Total**                         | **100**  | **74**                | **26**             | **0**  |

Tabel ini menghitung baris skenario yang dipilih untuk dokumen ini, bukan seluruh kasus test di repository.

Baris skenario tidak identik dengan kasus test independen. Beberapa baris merujuk bagian berbeda dari satu `it` yang sama, sehingga 100 baris skenario berasal dari **89 `it` unik**. Status baris-baris tersebut adalah status `it` induknya secara keseluruhan:

| `it` induk                                                        | Baris skenario                                 |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| `backend/test/auth-users.e2e-spec.ts:255-490`                     | AUTH-13, RBAC-10, UNA-04, MT-12, BR-03         |
| `backend/test/order-lifecycle.e2e-spec.ts:179-235`                | UNA-05, MT-03, MT-11, OWN-07                   |
| `backend/test/order-lifecycle.e2e-spec.ts:236-275`                | RBAC-16, XT-05, BR-11                          |
| `backend/src/modules/places/__tests__/place-access.service.spec.ts:49-71` | MT-01, MT-06                           |
| `backend/test/place-access.repository.e2e-spec.ts:70-99`          | MT-02, MT-10                                   |

Pemetaan dilakukan dengan mencocokkan baris awal setiap `Source` ke deklarasi `it(...)` terdekat di atasnya. Untuk baris yang memuat lebih dari satu sumber (BR-04, BR-06), hanya sumber pertama yang dihitung.

## 10. Failed Tests / Known Issues

### Hasil eksekusi

- Run lokal 2026-10-22: **0 test gagal** pada unit test backend, unit test frontend, dan E2E backend (PostgreSQL lokal).
- Verification record 2026-09-17: tidak ada check berstatus gagal; beberapa check berstatus `NOT RUN`.

### `DOCUMENTED` — gap yang tercatat di audit

| ID   | Gap                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------- |
| F-01 | Legacy root `GET /api/v1` belum dinormalisasi.                                                          |
| F-02 | Koleksi member dan meja belum dipaginasi.                                                               |
| F-03 | CI belum menjalankan ESLint/Prettier dan validasi/drift Prisma secara eksplisit (SRS-TST-002 `PARTIALLY_IMPLEMENTED`). |
| F-04 | Load suite dan hasilnya belum ada (SRS-TST-006 `NOT_IMPLEMENTED`).                                      |
| F-05 | Bukti backup/restore belum ada.                                                                         |
| F-06 | Bukti `EXPLAIN (ANALYZE, BUFFERS)` untuk index belum ada.                                               |
| F-07 | Review kontrol produksi belum dilakukan.                                                                |

Source:

- `backend/docs/srs-v1.3-implementation-audit.md:358-373`
- `backend/docs/srs-v1.3-implementation-audit.md:375-380`

### `IMPLEMENTED` — observasi dari ekstraksi dokumen 02/03 yang tidak dicakup test

- CHECK `media_upload_intents_target_check` tidak memuat `MENU_CATEGORY_THUMBNAIL`. Test constraint upload-intent hanya mencakup `PLACE_LOGO` dan `MENU_ITEM_IMAGE`, dan tidak ada test E2E positif untuk thumbnail kategori. Perilaku runtime tidak diverifikasi.
- Skenario konkuren untuk perubahan role OWNER (bukan revocation) dan deaktivasi SUPER_ADMIN terakhir tidak ditemukan sebagai test tersendiri.

Source:

- `backend/prisma/migrations/20260914190000_add_media_upload_intents/migration.sql:22-25`
- `backend/prisma/migrations/20260927120000_add_category_thumbnails_and_manual_orders/migration.sql:1`
- `backend/test/database-constraints.e2e-spec.ts:627-669`
- `backend/test/auth-users.e2e-spec.ts:448-460`
- `backend/test/auth-users.e2e-spec.ts:491-548`

## 11. Testing Limitations

1. **Bukti eksekusi E2E hanya satu lingkungan lokal.** Ke-35 test E2E/integrasi berstatus `NOT RUN` pada audit 2026-09-17. Satu-satunya bukti eksekusinya adalah run lokal penyusun 2026-10-22, yang tidak tersimpan sebagai artefak di repository.
2. **Hasil CI tidak tersimpan.** Workflow mengonfigurasi PostgreSQL untuk E2E, tetapi tidak ada artefak hasil run di repository.
3. **Lingkungan lokal berbeda dari CI.** Run lokal memakai Node.js v24.11.1 di Windows dengan PostgreSQL 16.14 lokal dan `backend/.env` pengguna; CI memakai Node.js 22 dan PostgreSQL 16 di `ubuntu-latest` dengan env job sendiri. Melalui `test:e2e:local`, variabel `.env` yang tidak ditimpa suite (misalnya `CORS_ALLOWED_ORIGINS`, `IMAGEKIT_*`) ikut terbaca oleh aplikasi yang diuji.
4. **Database E2E bukan database kosong.** Sebelum run, database test sudah memuat 31 baris `audit_logs` dan 2 baris `auth_rate_limit_buckets` dari penggunaan sebelumnya. Suite membersihkan data yang dibuatnya sendiri; beberapa suite menghapus seluruh `auth_rate_limit_buckets`.
5. **Frontend tidak memiliki CI.** Hasil test frontend hanya berasal dari run lokal.
6. **Banyak unit test memakai mock.** Unit test backend memverifikasi logika service dan bentuk predicate, bukan perilaku query terhadap database nyata.
7. **Test frontend bukan authorization boundary.** Test frontend menguji presentasi dan navigasi berbasis metadata permission. Kode dan SRS menyatakan backend sebagai authorization boundary.
8. **Tidak ada load, security, atau penetration test.**
9. **Tidak ada metrik coverage.** Script `test:cov` tersedia, tetapi tidak dijalankan dan tidak ada laporan coverage di repository.
10. **E2E HTTP lintas tenant untuk mutation tidak lengkap.** Tidak ditemukan test HTTP spesifik untuk mutation menu, meja, atau place antar-OWNER.

Source:

- `backend/test/app.e2e-spec.ts:8-11`
- `backend/test/auth-users.e2e-spec.ts:54`
- `backend/test/carts-orders.e2e-spec.ts:44`
- `.github/workflows/backend-ci.yml:1-49`
- `backend/package.json:18`
- `backend/README.md:384-412`
- `frontend/src/utils/auth/has-permission.ts:10-15`
- `backend/docs/software-requirement-specification.md:168-169`
- `backend/docs/srs-v1.3-implementation-audit.md:362`
- `backend/docs/srs-v1.3-implementation-audit.md:395-407`

## 12. Evidence Summary

| Konsep                                             | Test Exists | Test Executed Successfully                         | Status                                   |
| -------------------------------------------------- | ----------- | -------------------------------------------------- | ---------------------------------------- |
| Matriks permission dan default deny                | Ya          | Ya (lokal; audit untuk unit secara umum)           | `IMPLEMENTED`                            |
| Coarse admission `PermissionsGuard`                | Ya          | Ya (lokal)                                         | `IMPLEMENTED`                            |
| Principal dari database pada setiap request        | Ya          | Ya (lokal)                                         | `IMPLEMENTED`                            |
| Refresh rotation dan reuse detection               | Ya          | Unit dan E2E: ya (lokal)                           | `IMPLEMENTED`                            |
| Global vs membership scope (`PlaceAccessService`)  | Ya          | Ya (lokal)                                         | `IMPLEMENTED`                            |
| Cross-tenant → not found (unit)                    | Ya          | Ya (lokal)                                         | `IMPLEMENTED`                            |
| Cross-tenant via HTTP                              | Ya          | Ya (E2E lokal, PostgreSQL 16.14)                   | `IMPLEMENTED`                            |
| Constraint tenant di database                      | Ya          | Ya (E2E lokal, PostgreSQL 16.14)                   | `IMPLEMENTED`                            |
| Invariant last OWNER / SUPER_ADMIN (unit)          | Ya          | Ya (lokal)                                         | `IMPLEMENTED`                            |
| Invariant konkuren di PostgreSQL                   | Sebagian    | Ya untuk skenario yang ada (E2E lokal)             | `IMPLEMENTED` (cakupan sebagian)         |
| State machine order                                | Ya          | Unit dan E2E: ya (lokal)                           | `IMPLEMENTED`                            |
| RBAC presentasi frontend                           | Ya          | Ya (lokal)                                         | `IMPLEMENTED`                            |
| Hasil unit test backend tercatat                   | —           | 52 suite / 309 test PASS (2026-09-17)              | `DOCUMENTED`                             |
| Hasil E2E tercatat di repository                   | —           | NOT RUN (audit 2026-09-17)                         | `DOCUMENTED`                             |
| Hasil E2E lokal penyusun                           | —           | 9 suite / 35 test PASS (2026-10-22)                | Observasi penyusun, bukan artefak repo   |
| Artefak hasil CI                                   | —           | —                                                  | `NOT FOUND IN REPOSITORY`                |
| Load / security / penetration test                 | Tidak       | —                                                  | `NOT FOUND IN REPOSITORY`                |

## 13. Repository Traceability

### Konfigurasi test dan CI

- `backend/package.json:16-21` — script test backend, termasuk `test:e2e:local`.
- `backend/package.json:76-101` — konfigurasi Jest unit.
- `backend/README.md:384-412` — langkah menjalankan E2E lokal (database test terpisah, migration, script).
- `backend/.env.example:11-13` — contoh `TEST_DATABASE_URL`.
- `backend/test/jest-e2e.json:1-18` — konfigurasi Jest E2E.
- `frontend/package.json:10` — script test frontend.
- `frontend/vitest.config.ts:1-20` — konfigurasi Vitest.
- `.github/workflows/backend-ci.yml:1-49` — CI backend dengan PostgreSQL 16.

### Hasil yang terdokumentasi

- `backend/docs/srs-v1.3-implementation-audit.md:6` — tanggal audit.
- `backend/docs/srs-v1.3-implementation-audit.md:358-380` — status SRS-TST, release blocker, gap.
- `backend/docs/srs-v1.3-implementation-audit.md:395-407` — verification record.

### Backend unit test (authorization, tenant, business rule)

- `backend/src/common/auth/__tests__/permissions.spec.ts:28-397`
- `backend/src/common/guards/__tests__/permissions.guard.spec.ts:48-92`
- `backend/src/modules/auth/__tests__/jwt-auth.guard.spec.ts:48-93`
- `backend/src/modules/auth/__tests__/auth-principal.service.spec.ts:26`
- `backend/src/modules/auth/__tests__/auth.service.spec.ts:17-64`
- `backend/src/modules/auth/__tests__/auth-hardening.spec.ts:15-101`
- `backend/src/modules/auth/__tests__/auth-rate-limit.guard.spec.ts:36-52`
- `backend/src/modules/places/__tests__/place-access.service.spec.ts:23-145`
- `backend/src/modules/places/__tests__/place-members.service.spec.ts:31-117`
- `backend/src/modules/places/__tests__/dining-tables.service.spec.ts:20-54`
- `backend/src/modules/places/__tests__/places.service.spec.ts:11-126`
- `backend/src/modules/places/__tests__/places.repository.spec.ts:6-74`
- `backend/src/modules/orders/__tests__/order-queries.service.spec.ts:14-98`
- `backend/src/modules/orders/__tests__/orders.repository.spec.ts:6-87`
- `backend/src/modules/orders/__tests__/order-transitions.service.spec.ts:70-143`
- `backend/src/modules/orders/__tests__/manual-orders.service.spec.ts:100-142`
- `backend/src/modules/users/__tests__/users.service.spec.ts:42-422`
- `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:68-225`
- `backend/src/modules/media/__tests__/media.service.spec.ts:97-190`

### Backend E2E dan integrasi database

- `backend/test/auth-users.e2e-spec.ts:121-548`
- `backend/test/order-lifecycle.e2e-spec.ts:179-354`
- `backend/test/place-access.repository.e2e-spec.ts:70-159`
- `backend/test/database-constraints.e2e-spec.ts:171-730`
- `backend/test/carts-orders.e2e-spec.ts:113-321`
- `backend/test/reviews.e2e-spec.ts:154-278`
- `backend/test/menus.e2e-spec.ts:74-141`
- `backend/test/places.e2e-spec.ts:77`
- `backend/test/app.e2e-spec.ts:8-11`

### Frontend test (presentasi authorization)

- `frontend/src/utils/__tests__/create-ability.test.ts:39-135`
- `frontend/src/utils/auth/__tests__/authorization-scenarios.test.ts:45-116`
- `frontend/src/utils/auth/__tests__/dashboard-route-access.test.ts:37-67`
- `frontend/src/utils/auth/__tests__/dashboard-access.test.ts:82-111`
- `frontend/src/utils/auth/__tests__/customer-access.test.ts:19-41`
- `frontend/src/utils/__tests__/dashboard-place.test.ts:20-36`
- `frontend/src/configs/auth/__tests__/jwt-service.test.ts:74-235`
