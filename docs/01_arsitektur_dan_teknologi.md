# Arsitektur dan Teknologi

Dokumen ini merupakan ekstraksi evidence teknis dari repository Tooang. Status yang digunakan adalah `IMPLEMENTED`, `DOCUMENTED`, `DOCUMENTATION / IMPLEMENTATION GAP`, dan `NOT FOUND IN REPOSITORY`. Istilah _tenant_ pada dokumen ini merujuk pada entitas `Place`, karena implementasi mengikat membership dan mayoritas resource operasional ke `placeId`.

## 1. Ringkasan Arsitektur

### `IMPLEMENTED`

Tooang terdiri dari frontend _single-page application_ berbasis React dan backend REST API berbasis NestJS. Backend diorganisasikan sebagai modular monolith: `AppModule` memasang modul autentikasi, pengguna, place, menu, cart, order, review, media, observability, dan data lifecycle dalam satu aplikasi. Prefix API global adalah `/api/v1`.

Source:

- `frontend/src/main.tsx:16-60`
- `backend/src/app.module.ts:28-58`
- `backend/src/main.ts:16-38`

Alur arsitektur yang dapat diverifikasi adalah:

```text
Frontend route/component
  -> feature query/mutation dan service
  -> shared Axios/JWT client
  -> REST API /api/v1
  -> request-context middleware
  -> JwtAuthGuard
  -> PermissionsGuard
  -> feature controller
  -> feature service dan resource-scope authorization
  -> feature repository dengan predicate actor/place/lifecycle
  -> Prisma Client
  -> PostgreSQL
```

`JwtAuthGuard` dan `PermissionsGuard` terpasang sebagai global guard. `RequestContextMiddleware` berlaku untuk seluruh route, sedangkan `HttpExceptionFilter` terpasang secara global. Endpoint yang diberi metadata `@Public()` melewati autentikasi JWT.

Source:

- `backend/src/app.module.ts:47-57`
- `backend/src/modules/auth/jwt-auth.guard.ts:29-53`
- `backend/src/common/decorators/public.decorator.ts:1-4`

Model authorization memiliki lima komponen yang berbeda tetapi saling berhubungan:

```text
Platform Role
  + Place Membership
  + Place Role
  + Permission
  + Resource Scope
```

- **Platform Role** berada pada `User.platformRole` dan bernilai `USER`, `ADMIN`, atau `SUPER_ADMIN`.
- **Place Membership** berada pada satu baris `PlaceMember` untuk pasangan `(placeId, userId)`; membership aktif ditandai `revokedAt = null`.
- **Place Role** berada pada `PlaceMember.role` dan bernilai `OWNER` atau `CASHIER`.
- **Permission** adalah identifier dan role-to-grant map yang didefinisikan dalam source code.
- **Resource Scope** membedakan scope platform `own`, `restricted`, `global` dan scope membership `member`, `owned`; target place tetap diperiksa melalui membership aktif atau global grant eksplisit.

Source:

- `backend/prisma/schema.prisma:13-22`
- `backend/prisma/schema.prisma:85-110`
- `backend/prisma/schema.prisma:204-218`
- `backend/src/common/auth/permissions.ts:9-73`
- `backend/src/modules/places/place-access.service.ts:15-84`

## 2. Technology Stack

### 2.1 Frontend

### `IMPLEMENTED`

Frontend menggunakan React 19, TypeScript, Vite, TanStack Router, TanStack Query, TanStack Form, CASL, Axios, Zod, Tailwind CSS, dan Radix UI. Vitest dan Testing Library tersedia sebagai tool pengujian frontend. Library yang tidak berkaitan langsung dengan arsitektur aplikasi atau fokus RBAC tidak dirinci lebih lanjut di dokumen ini.

Source:

- `frontend/package.json:6-14`
- `frontend/package.json:16-41`
- `frontend/package.json:43-71`
- `frontend/vite.config.ts:3-20`

Provider aplikasi dipasang dengan urutan `ThemeProvider`, `TanstackQueryProvider`, `AuthContextProvider`, `AppAbilityProvider`, lalu router. State autentikasi dan CASL ability diteruskan ke router context.

Source:

- `frontend/src/main.tsx:16-41`
- `frontend/src/main.tsx:44-60`
- `frontend/src/router.ts:10-34`

### 2.2 Backend

### `IMPLEMENTED`

Backend menggunakan NestJS 11 dan TypeScript. Dependensi yang relevan meliputi NestJS JWT, Prisma Client/adapter PostgreSQL, `pg`, bcrypt, cookie parser, Zod, Winston, dan ImageKit SDK. Script repository menyediakan build, unit test, E2E test, type-check, serta Prisma seed.

Source:

- `backend/package.json:8-24`
- `backend/package.json:26-43`
- `backend/package.json:45-74`

Kode backend dipisahkan menurut feature module. Controller menangani route dan DTO/parameter tervalidasi; service menjalankan authorization/resource checks, business rules, audit, dan transaction boundary; repository mengeksekusi query Prisma.

Source:

- `backend/src/app.module.ts:12-45`
- `backend/src/modules/places/places.controller.ts:32-129`
- `backend/src/modules/places/places.service.ts:68-143`
- `backend/src/modules/places/places.repository.ts:62-98`

### 2.3 Database

### `IMPLEMENTED`

Datasource Prisma menggunakan PostgreSQL. Prisma schema mendefinisikan model user, refresh session, audit log, place, membership, menu, cart, order, review, media, dan resource place-scoped lainnya. Repository juga memuat migration chain yang bersifat berurutan.

Source:

- `backend/prisma/schema.prisma:1-11`
- `backend/prisma/schema.prisma:85-218`
- `backend/prisma/schema.prisma:221-464`
- `backend/prisma/migrations/20260912082709_init/migration.sql:1-493`
- `backend/prisma/migrations/20260927120000_add_category_thumbnails_and_manual_orders/migration.sql:1-43`

Tidak terdapat model database generik bernama `Role`, `Permission`, `UserRole`, atau `RolePermission`. Authority yang dipersistenkan adalah `User.platformRole` dan `PlaceMember.role`; permission mapping berada pada kode aplikasi.

Source:

- `backend/prisma/schema.prisma:13-22`
- `backend/prisma/schema.prisma:85-110`
- `backend/prisma/schema.prisma:204-218`
- `backend/src/common/auth/permissions.ts:83-177`

### 2.4 Authentication

### `IMPLEMENTED`

Autentikasi menggunakan pasangan access token dan refresh token JWT. Access token berisi `sub` berupa public user ID dan `tokenType: access`; role, membership, dan permission tidak dimasukkan sebagai authority ke dalam access token. Refresh session disimpan di PostgreSQL menggunakan hash token, `familyId`, waktu kedaluwarsa, status revoke, dan hubungan replacement.

Source:

- `backend/src/lib/jwt-config.service.ts:19-47`
- `backend/prisma/schema.prisma:114-130`
- `backend/src/modules/auth/auth.service.ts:87-109`

### 2.5 Authorization

### `IMPLEMENTED`

Authorization backend menggunakan decorator permission, global `PermissionsGuard`, permission policy statis, `PlaceAccessService`, service-level domain checks, dan repository predicates. Frontend menggunakan metadata permission dari endpoint `/me` untuk membentuk CASL rules dan route/UI visibility; komentar implementasi menyatakan backend tetap menjadi authorization boundary.

Source:

- `backend/src/common/decorators/permissions.decorator.ts:1-10`
- `backend/src/common/guards/permissions.guard.ts:24-55`
- `backend/src/modules/places/place-access.service.ts:38-84`
- `frontend/src/utils/create-ability.ts:12-50`
- `frontend/src/utils/auth/has-permission.ts:4-15`

### 2.6 Infrastructure / Deployment

### `IMPLEMENTED`

Frontend memiliki konfigurasi Vercel yang me-_rewrite_ semua path ke `index.html`, sesuai kebutuhan SPA routing. Backend CI berjalan di GitHub Actions, menggunakan Node.js 22 dan service PostgreSQL 16, kemudian menjalankan instalasi dependensi, Prisma generate, migration deploy, unit test, build, dan E2E test.

Source:

- `frontend/vercel.json:1-3`
- `.github/workflows/backend-ci.yml:1-49`

### `DOCUMENTATION / IMPLEMENTATION GAP`

README backend hanya menyatakan aplikasi dapat ditempatkan pada platform yang mendukung Node.js dan PostgreSQL. Instruksi platform backend, URL produksi, detail health-check deployment, kebijakan CORS deployment, dan workflow CI/CD masih ditandai `TODO`. Versi minimum Node.js, npm, dan PostgreSQL pada bagian prerequisites juga belum ditetapkan secara final. Konfigurasi hosting frontend ditemukan, tetapi konfigurasi deployment backend ke penyedia tertentu tidak ditemukan.

Source:

- `backend/README.md:84-90`
- `backend/README.md:398-423`
- `frontend/vercel.json:1-3`

> **NOT FOUND IN REPOSITORY**: bukti konfigurasi dan hasil verifikasi lingkungan produksi aktual, termasuk domain produksi, secret manager yang digunakan, topologi runtime, backup/restore yang telah diuji, dan hasil load test.

Source:

- `backend/docs/srs-v1.3-implementation-audit.md:359-373`
- `backend/docs/srs-v1.3-implementation-audit.md:399-407`

## 3. Arsitektur Aplikasi

### 3.1 Frontend Architecture

### `IMPLEMENTED`

Frontend menggunakan file-based routing melalui TanStack Router. Router context memuat `queryClient`, state autentikasi, authenticated user, dan CASL ability. Dashboard membaca `placeId` dari search parameter, mencocokkannya dengan membership aktif yang diterima frontend, dan mengoreksi pilihan place yang tidak tersedia ke membership pertama yang dapat dipilih.

Source:

- `frontend/src/router.ts:10-34`
- `frontend/src/routes/dashboard.tsx:15-38`
- `frontend/src/utils/dashboard-place.ts:3-27`

CASL rules tidak dibangun dengan menebak permission dari nama role. Rules dibuat dari `permissions`, `globalPermissions`, dan `placeMemberships[].effectivePermissions` yang diterima dari backend. Global place permission menjadi rule subject `Place` tanpa condition, sedangkan membership permission diberi condition `placeId`.

Source:

- `frontend/src/types/user-data.type.ts:1-27`
- `frontend/src/utils/create-ability.ts:12-47`
- `frontend/src/utils/__tests__/create-ability.test.ts:68-117`

Route guard frontend memisahkan route account, platform, dan place. Place route memeriksa `effectivePermissions` pada membership yang sedang dipilih; platform route memeriksa `globalPermissions`. Penolakan direct route diarahkan ke `/not-found`.

Source:

- `frontend/src/utils/auth/dashboard-route-access.ts:6-48`
- `frontend/src/utils/auth/__tests__/dashboard-route-access.test.ts:36-73`

Kontrol frontend tersebut adalah kebijakan presentasi dan navigasi. Ia tidak menggantikan pemeriksaan authorization backend.

Source:

- `frontend/src/utils/auth/has-permission.ts:10-15`
- `frontend/src/utils/auth/dashboard-access.ts:17-42`

### 3.2 Backend Architecture

### `IMPLEMENTED`

Backend berjalan sebagai satu aplikasi NestJS yang menggabungkan seluruh feature module. `ConfigModule` bersifat global; middleware request context, dua global guard, dan global exception filter dipasang dari `AppModule`.

Source:

- `backend/src/app.module.ts:28-58`

Contoh alur modul place memperlihatkan pemisahan layer: controller menetapkan route dan permission metadata, service memanggil `PlaceAccessService` serta mengelola transaction/audit, dan repository membatasi query berdasarkan `placeId` serta lifecycle state.

Source:

- `backend/src/modules/places/places.controller.ts:47-129`
- `backend/src/modules/places/places.service.ts:68-143`
- `backend/src/modules/places/places.repository.ts:65-98`

### 3.3 API Architecture

### `IMPLEMENTED`

API menggunakan prefix `/api/v1`. Controller memakai decorator HTTP NestJS dan decorator lokal untuk public route, current actor, required permission, serta validasi Zod terhadap body, param, dan query. Contoh route place membedakan public discovery/detail dari management operations yang memerlukan permission.

Source:

- `backend/src/main.ts:21-37`
- `backend/src/modules/places/places.controller.ts:32-129`
- `backend/src/common/decorators/current-user.decorator.ts:1-16`
- `backend/src/common/decorators/permissions.decorator.ts:1-10`

Frontend membentuk base URL dari origin `VITE_BASE_SERVER_URL` ditambah `/api/v1`. Shared JWT client menolak URL absolut, protocol-relative, atau endpoint yang mencoba menambahkan `/api` lagi.

Source:

- `frontend/src/configs/env.ts:1-38`
- `frontend/src/configs/api-config.ts:1-4`
- `frontend/src/configs/auth/jwt-service.ts:192-198`

### 3.4 Data Access Architecture

### `IMPLEMENTED`

Data access diimplementasikan melalui feature repository yang menggunakan `PrismaService` atau `Prisma.TransactionClient`. Service mengirim transaction client yang sama ketika authorization check, mutation, dan audit perlu berada dalam satu transaction.

Source:

- `backend/src/modules/places/places.repository.ts:10-12`
- `backend/src/modules/places/places.service.ts:127-143`
- `backend/src/modules/places/place-members.service.ts:40-108`

Filter lifecycle diterapkan bersama identity/scope filter. Contohnya, principal tidak aktif ditolak bila user deleted, deletion-pending, atau anonymized; membership aktif mensyaratkan `revokedAt: null`, place aktif, user aktif, target `placeId`, actor internal ID, dan role yang diizinkan.

Source:

- `backend/src/modules/auth/auth-principal.service.ts:11-28`
- `backend/src/modules/places/places.repository.ts:299-319`

## 4. Authorization Architecture

### 4.1 Platform Roles

### `IMPLEMENTED`

Platform role disimpan pada `User.platformRole` dengan default `USER`. Nilai enum adalah `USER`, `ADMIN`, dan `SUPER_ADMIN`.

Source:

- `backend/prisma/schema.prisma:13-17`
- `backend/prisma/schema.prisma:85-108`

Grant platform yang ditemukan adalah:

| Platform role | Karakteristik grant yang diimplementasikan                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `USER`        | Self-service/own scope untuk profile, account deletion request, cart, checkout, own order, dan own review operations.                                                                                                   |
| `ADMIN`       | Mewarisi grant `USER`; memiliki berbagai global place/menu/table/order/review/user capabilities, tetapi `user.deactivate` bersifat `restricted` dan tidak memiliki owner-management atau platform-role mutation grants. |
| `SUPER_ADMIN` | Mewarisi grant `ADMIN`; `user.deactivate` menjadi global serta mendapat owner assignment/revocation dan platform-role assignment/update.                                                                                |

Source:

- `backend/src/common/auth/permissions.ts:83-137`

Platform role bukan bukti tunggal untuk mengakses semua resource. Permission platform memiliki scope, dan operasi place tanpa global grant masih harus diselesaikan melalui membership target place.

Source:

- `backend/src/common/auth/permissions.ts:217-250`
- `backend/src/modules/places/place-access.service.ts:38-84`

### 4.2 Place/Tenant Roles

### `IMPLEMENTED`

Place role disimpan terpisah pada `PlaceMember.role`. Nilainya hanya `OWNER` dan `CASHIER`; seorang user dapat memiliki membership pada beberapa place karena uniqueness berlaku per `(placeId, userId)`.

Source:

- `backend/prisma/schema.prisma:19-22`
- `backend/prisma/schema.prisma:204-218`

`CASHIER` memperoleh permission operasional order, membaca place/table, dan membaca membership pada scope `member`. `OWNER` memperoleh permission operasional dan management untuk place, table, menu, membership CASHIER, serta media pada scope `owned`. `OWNER` tidak diberi `owner.assign` atau `owner.revoke` oleh membership grant map.

Source:

- `backend/src/common/auth/permissions.ts:139-177`

Pembuatan place secara otomatis membuat membership `OWNER` untuk actor pembuat dalam operasi database yang sama.

Source:

- `backend/src/modules/places/places.repository.ts:72-98`
- `backend/src/modules/places/places.service.ts:81-120`

### 4.3 Permission Model

### `IMPLEMENTED`

Permission identifier didefinisikan sebagai finite constant set dalam `permissions.ts`. Mapping platform dan membership juga berada pada file tersebut dan diperiksa melalui fungsi yang menolak role atau permission yang tidak dikenal dengan hasil kosong/tidak diberi grant.

Source:

- `backend/src/common/auth/permissions.ts:9-73`
- `backend/src/common/auth/permissions.ts:179-250`

Platform permission scope:

- `own`: operasi terhadap resource milik actor;
- `restricted`: capability platform dengan pembatasan target tambahan di service;
- `global`: capability terhadap target place/resource tanpa membership, tetapi tetap melalui domain service.

Membership permission scope:

- `member`: capability yang berasal dari membership aktif;
- `owned`: capability yang berasal dari membership `OWNER` aktif.

Source:

- `backend/src/common/auth/permissions.ts:55-81`
- `backend/src/modules/users/users.service.ts:210-279`
- `backend/src/modules/places/place-access.service.ts:24-32`

Endpoint `/me` mengembalikan platform permissions, global platform permissions, active place memberships, membership permissions, dan effective place permissions. Effective permission place menggabungkan membership grant dengan global platform grant yang relevan secara aditif.

Source:

- `backend/src/modules/users/users.service.ts:107-126`
- `backend/src/modules/users/users.repository.ts:45-65`
- `backend/src/common/auth/permissions.ts:253-275`

### 4.4 Authorization Flow

### `IMPLEMENTED`

Urutan authorization untuk protected place operation adalah:

1. `JwtAuthGuard` membaca bearer token dan memverifikasi access token.
2. Guard mengambil ulang principal aktif dari database menggunakan public `userId`; request actor dibentuk dari internal ID, public ID, dan platform role terkini.
3. `PermissionsGuard` membaca metadata `RequirePermissions`/`RequireAnyPermission` dan menjalankan `canAttemptPermission` sebagai coarse admission.
4. Controller meneruskan actor dan `placeId` tervalidasi ke service.
5. `PlaceAccessService` memilih global scope bila platform role memiliki global grant; jika tidak, ia menentukan membership roles yang dapat memberi permission tersebut.
6. Repository mencari membership aktif yang cocok dengan actor, target `placeId`, allowed role, active place, dan active user.
7. Service memeriksa business/domain rule dan repository menjalankan query atau mutation dengan predicate resource scope.
8. Mutation tertentu menulis audit dalam transaction yang sama.

Source:

- `backend/src/modules/auth/jwt-auth.guard.ts:29-53`
- `backend/src/modules/auth/auth-principal.service.ts:11-28`
- `backend/src/common/guards/permissions.guard.ts:24-55`
- `backend/src/common/auth/permissions.ts:301-310`
- `backend/src/modules/places/place-access.service.ts:38-84`
- `backend/src/modules/places/places.repository.ts:299-319`
- `backend/src/modules/places/places.service.ts:127-143`

`PermissionsGuard` tidak membuktikan target-place membership. Hal ini dinyatakan pada fungsi `canAttemptPermission` dan diverifikasi oleh test guard yang menerima operasi membership-capable untuk admission awal saja.

Source:

- `backend/src/common/auth/permissions.ts:301-310`
- `backend/src/common/guards/__tests__/permissions.guard.spec.ts:63-78`

### 4.5 Resource Scope

### `IMPLEMENTED`

Resource scope dibedakan menjadi empat kategori:

| Kategori        | Mekanisme scope                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Platform/global | Global grant eksplisit; tidak memerlukan membership, tetapi target aktif dan domain rule tetap diperiksa.          |
| Place-scoped    | `placeId` dari route/input digabung dengan active membership atau global grant.                                    |
| User-owned      | Query menggunakan internal actor ID, misalnya cart `(userId, placeId)`, own order, dan own review.                 |
| Public          | Query mensyaratkan state yang dapat dipublikasikan, misalnya place/menu `isPublished: true` dan `deletedAt: null`. |

Source:

- `backend/src/modules/places/place-access.service.ts:38-84`
- `backend/src/modules/carts/carts.repository.ts:77-97`
- `backend/src/modules/reviews/reviews.repository.ts:192-257`
- `backend/src/modules/places/places.repository.ts:100-132`
- `backend/src/modules/menus/menus.repository.ts:138-170`

## 5. Multi-Tenant Architecture

### 5.1 Tenant Representation

### `IMPLEMENTED`

Tenant direpresentasikan oleh model `Place`. `Place` memiliki relasi ke membership, business hours, dining tables, menu categories, menu items, reviews, carts, orders, dan media upload intents. Resource-resource tersebut membawa `placeId` secara langsung atau terhubung melalui relasi place-scoped.

Source:

- `backend/prisma/schema.prisma:166-201`
- `backend/prisma/schema.prisma:221-248`
- `backend/prisma/schema.prisma:275-352`
- `backend/prisma/schema.prisma:394-464`

Tidak ditemukan model bernama `Tenant`; penggunaan istilah multi-tenant dalam dokumen ini merupakan pemetaan arsitektural terhadap `Place` sebagai boundary data dan authorization yang dapat dibuktikan dari relasi dan predicate `placeId`.

Source:

- `backend/prisma/schema.prisma:166-218`
- `backend/src/modules/places/place-access.service.ts:54-84`

### 5.2 Tenant Identification

### `IMPLEMENTED`

Pada API management, target tenant umumnya berasal dari path `places/:placeId/...`. Pada dashboard frontend, `placeId` berada di search state dan dipilih hanya dari `placeMemberships` yang dikirim `/me`. Untuk global platform pages, frontend menggunakan context platform terpisah.

Source:

- `backend/src/modules/places/places.controller.ts:32-129`
- `backend/src/modules/places/place-members.controller.ts:23-57`
- `backend/src/modules/menus/menus.controller.ts:38-170`
- `frontend/src/routes/dashboard.tsx:15-35`
- `frontend/src/routes/dashboard.tsx:40-76`

Pemilihan `placeId` di frontend bukan authority. Backend tidak menerima role/permission frontend sebagai bukti; ia memuat principal dan membership terkini sebelum operasi protected dilanjutkan.

Source:

- `frontend/src/utils/auth/has-permission.ts:10-15`
- `backend/src/modules/auth/jwt-auth.guard.ts:36-53`
- `backend/src/modules/places/place-access.service.ts:54-84`

### 5.3 Tenant-Scoped Resources

### `IMPLEMENTED`

| Resource            | Evidence scope yang diterapkan                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Membership          | Unik pada `(placeId, userId)`; active lookup memeriksa place, actor, role, `revokedAt`, dan lifecycle user/place.                      |
| Business hours      | Menyimpan `placeId` dan unik pada `(placeId, day)`.                                                                                    |
| Dining table        | Query detail/mutation menggunakan gabungan `tableId` dan `placeId`; nama dinormalisasi unik per place.                                 |
| Menu category/item  | Query detail/mutation menggabungkan resource ID, `placeId`, dan `deletedAt`; item-category relation memakai composite `(id, placeId)`. |
| Cart/cart item      | Cart unik per `(userId, placeId)`; relasi cart item ke cart dan menu item membawa `placeId` yang sama.                                 |
| Order               | Menyimpan `placeId`; place-operational reads menggabungkan order ID/code, target place, dan membership scope.                          |
| Media upload intent | Menyimpan actor dan place; target category/item dicari dengan resource ID dan `placeId`.                                               |
| Review              | Public target memeriksa place/menu item pada `placeId`; own mutations dibatasi `userId`.                                               |

Source:

- `backend/prisma/schema.prisma:204-248`
- `backend/prisma/schema.prisma:275-352`
- `backend/prisma/schema.prisma:394-464`
- `backend/src/modules/places/places.repository.ts:259-319`
- `backend/src/modules/menus/menus.repository.ts:56-115`
- `backend/src/modules/menus/menus.repository.ts:138-239`
- `backend/src/modules/carts/carts.repository.ts:47-97`
- `backend/src/modules/orders/orders.repository.ts:363-418`
- `backend/src/modules/orders/orders.repository.ts:529-541`
- `backend/src/modules/media/media.repository.ts:52-87`
- `backend/src/modules/reviews/reviews.repository.ts:115-124`
- `backend/src/modules/reviews/reviews.repository.ts:192-257`

### 5.4 Tenant Isolation

### `IMPLEMENTED`

Tenant isolation tidak bergantung pada satu guard saja. Implementasi menggunakan kombinasi:

- membership aktif yang cocok dengan target `placeId` dan allowed role;
- global platform grant yang eksplisit;
- repository predicate yang selalu membawa target `placeId` untuk resource place-scoped;
- actor predicate untuk user-owned resource;
- lifecycle predicate seperti `deletedAt: null` atau `revokedAt: null`;
- composite database relation untuk mencegah category/menu item dan cart/menu item berbeda place dipasangkan.

Source:

- `backend/src/modules/places/place-access.service.ts:38-84`
- `backend/src/modules/places/places.repository.ts:299-319`
- `backend/src/modules/orders/orders.repository.ts:529-541`
- `backend/prisma/schema.prisma:321-350`
- `backend/prisma/schema.prisma:394-424`

Database tidak ditemukan menggunakan PostgreSQL Row-Level Security. Isolation yang dapat dibuktikan berasal dari application authorization, Prisma predicates, relations, unique constraints, foreign keys, dan check constraints yang terdapat pada migration.

Source:

- `backend/prisma/schema.prisma:1-11`
- `backend/prisma/schema.prisma:204-464`
- `backend/prisma/migrations/20260912082709_init/migration.sql:1-493`

### 5.5 Cross-Tenant Access Prevention

### `IMPLEMENTED`

Jika actor tidak memiliki global grant, `PlaceAccessService` mencari membership untuk target place. Membership yang tidak ada, salah role, revoked, berasal dari place lain, atau terhubung ke user/place tidak aktif tidak menghasilkan access object; service melempar `NotFoundException('Place not found')`. Pola ini menyembunyikan keberadaan target dari actor yang tidak memiliki scope tersebut.

Source:

- `backend/src/modules/places/place-access.service.ts:38-84`
- `backend/src/modules/places/places.repository.ts:299-319`

Resource child juga dicari dengan pasangan resource ID dan `placeId`. Contohnya menu item, dining table, order, dan media target tidak diambil berdasarkan ID global saja.

Source:

- `backend/src/modules/menus/menus.repository.ts:172-203`
- `backend/src/modules/places/places.repository.ts:259-296`
- `backend/src/modules/orders/orders.repository.ts:401-418`
- `backend/src/modules/media/media.repository.ts:52-61`

Automated test yang tersedia secara eksplisit mencakup foreign tenant membership, revoked membership, foreign-place dining table, foreign own order, membership predicate pada order query, dan foreign/deleted media target. Keberadaan test dicatat sebagai evidence implementasi; dokumen ini tidak menyatakan hasil eksekusi lokal test tersebut.

Source:

- `backend/src/modules/places/__tests__/place-access.service.spec.ts:49-70`
- `backend/test/place-access.repository.e2e-spec.ts:70-99`
- `backend/src/modules/places/__tests__/dining-tables.service.spec.ts:37-54`
- `backend/src/modules/orders/__tests__/order-queries.service.spec.ts:57-82`
- `backend/src/modules/orders/__tests__/orders.repository.spec.ts:6-27`
- `backend/src/modules/media/__tests__/media.service.spec.ts:128-139`

Global ADMIN/SUPER_ADMIN access bukan bypass tanpa batas. `PlaceAccessService` hanya memilih global scope untuk permission yang memang memiliki scope `global`; service masih memeriksa target aktif dan business invariants. Global mutation tertentu menghasilkan audit `ADMIN_CROSS_PLACE_MUTATION`.

Source:

- `backend/src/common/auth/permissions.ts:96-137`
- `backend/src/modules/places/place-access.service.ts:38-64`
- `backend/src/modules/places/places.service.ts:280-296`
- `backend/src/modules/places/place-members.service.ts:87-107`

## 6. Authentication and Session Architecture

### `IMPLEMENTED`

Register memvalidasi password policy, membuat bcrypt hash, dan membuat user. Login melakukan lookup berdasarkan email, menjalankan password verification/dummy verification, menolak lifecycle user yang tidak aktif, lalu membuat access token dan refresh token. Raw refresh token tidak disimpan; repository menerima hash token untuk `RefreshSession`.

Source:

- `backend/src/modules/auth/auth.service.ts:51-67`
- `backend/src/modules/auth/auth.service.ts:70-109`
- `backend/src/modules/auth/auth.repository.ts:64-78`

Login mengembalikan bearer access token pada response body dan menetapkan refresh token melalui cookie. Cookie tersebut `httpOnly`, `sameSite: lax`, menggunakan flag `secure` dari konfigurasi, dan dibatasi ke path `/api/v1/auth`.

Source:

- `backend/src/modules/auth/auth.controller.ts:41-60`
- `backend/src/modules/auth/refresh-cookie.service.ts:11-44`

Refresh flow mencari session melalui hash token, menolak session revoked/replaced, memverifikasi kecocokan session/family/user payload, memeriksa expiry dan lifecycle user, lalu melakukan rotasi session dalam serializable transaction. Reuse session menyebabkan seluruh family direvoke dan event dicatat ke logger/metrics.

Source:

- `backend/src/modules/auth/auth.service.ts:113-184`
- `backend/src/modules/auth/auth.service.ts:191-250`

Pada setiap protected request, access token hanya dipakai untuk memperoleh identity. `AuthPrincipalService` memuat ulang state user dan platform role dari database. Dengan demikian, actor request tidak dibentuk dari role yang dikirim frontend atau role yang tersimpan dalam payload access token.

Source:

- `backend/src/lib/jwt-config.service.ts:19-30`
- `backend/src/modules/auth/jwt-auth.guard.ts:36-53`
- `backend/src/modules/auth/auth-principal.service.ts:11-28`
- `backend/src/modules/auth/__tests__/jwt-auth.guard.spec.ts:48-85`

Frontend menyimpan access token di memory dan `localStorage`, menambahkan header Authorization melalui interceptor, dan mengirim cookie dengan `withCredentials`. Respons `401` memicu satu shared `refreshPromise`; request awal dicoba ulang sekali, sedangkan kegagalan refresh menghapus sesi client.

Source:

- `frontend/src/configs/auth/jwt-service.ts:20-80`
- `frontend/src/configs/auth/jwt-service.ts:119-183`
- `frontend/src/configs/auth/jwt-service.ts:200-206`

## 7. Security-Relevant Architecture

Bagian ini mencatat mekanisme yang ditemukan dan tidak menyimpulkan bahwa sistem secara keseluruhan “aman”.

### `IMPLEMENTED`

- Konfigurasi environment divalidasi saat startup menggunakan Zod.
- Access dan refresh secret diwajibkan berbeda; placeholder secret ditolak di production.
- Lifetime access token dipatok 15 menit, refresh 30 hari, dan remember-me refresh 90 hari.
- Bcrypt rounds divalidasi; production memerlukan minimum 12.
- Production public API origin dan CORS origins diwajibkan HTTPS; wildcard CORS ditolak.
- `TRUST_PROXY` dan konfigurasi ImageKit diwajibkan dalam production sesuai kondisi implementasi.
- CORS diaktifkan dengan explicit origins dan credentials.
- Endpoint auth memakai `AuthRateLimitGuard` dan policy per operasi.
- Authentication failure dan authorization denial dikirim ke logger/metrics.
- Authorization-critical place/member mutations menggunakan transaction dan audit record.

Source:

- `backend/src/config/env.ts:43-139`
- `backend/src/config/env.ts:161-188`
- `backend/src/config/env.ts:193-213`
- `backend/src/main.ts:21-31`
- `backend/src/modules/auth/auth.controller.ts:24-43`
- `backend/src/modules/auth/jwt-auth.guard.ts:56-61`
- `backend/src/common/guards/permissions.guard.ts:35-55`
- `backend/src/modules/places/place-members.service.ts:40-108`
- `backend/src/modules/places/place-members.service.ts:175-189`

### `NOT FOUND IN REPOSITORY`

- Bukti penetration test atau security audit eksternal.
- Bukti load/performance test yang telah dijalankan terhadap baseline ini.
- Bukti backup/restore database yang telah diuji.
- Bukti review final production controls pada lingkungan target.

Source:

- `backend/docs/srs-v1.3-implementation-audit.md:359-373`
- `backend/docs/srs-v1.3-implementation-audit.md:399-407`

## 8. Request-to-Database Flow

### `IMPLEMENTED`

Contoh alur protected mutation `PATCH /api/v1/places/:placeId`:

1. Frontend mengirim request relatif melalui shared JWT client; bearer access token ditambahkan oleh interceptor.
2. NestJS menerima request di bawah prefix `/api/v1`; request-context middleware sudah terpasang.
3. `JwtAuthGuard` memverifikasi token dan mengganti `request.user` dengan principal aktif dari database.
4. `PermissionsGuard` membaca metadata `place.update` dan memeriksa apakah platform role dapat mencoba capability tersebut.
5. Controller memvalidasi `placeId` dan body dengan Zod, lalu memanggil `PlacesService.update` dengan actor server-side.
6. Service membuka serializable transaction dan memanggil `PlaceAccessService.assertPermission`.
7. Bila ada global `place.update`, place aktif diverifikasi. Jika tidak, repository mencari membership `OWNER` aktif pada target place.
8. Repository memperbarui hanya place dengan `id = placeId` dan `deletedAt = null`.
9. Jika akses berasal dari platform/global, service menambahkan audit `ADMIN_CROSS_PLACE_MUTATION` dalam transaction yang sama.
10. Response dikembalikan melalui envelope HTTP aplikasi.

Source:

- `frontend/src/configs/auth/jwt-service.ts:35-80`
- `backend/src/app.module.ts:47-57`
- `backend/src/modules/auth/jwt-auth.guard.ts:29-53`
- `backend/src/common/guards/permissions.guard.ts:24-55`
- `backend/src/modules/places/places.controller.ts:88-97`
- `backend/src/modules/places/places.service.ts:123-144`
- `backend/src/modules/places/place-access.service.ts:38-84`
- `backend/src/modules/places/places.repository.ts:182-190`
- `backend/src/modules/places/places.service.ts:280-304`

Contoh alur read order place-scoped menambahkan scope pada query database: `placeId` digabung dengan predicate membership yang memerlukan actor internal ID, allowed roles, dan `revokedAt: null`. Untuk global scope, predicate membership kosong tetapi permission global telah diselesaikan sebelumnya oleh service/access layer.

Source:

- `backend/src/modules/orders/order-queries.service.ts:39-58`
- `backend/src/modules/orders/orders.repository.ts:363-368`
- `backend/src/modules/orders/orders.repository.ts:401-418`
- `backend/src/modules/orders/orders.repository.ts:529-541`

## 9. Architecture Evidence Summary

| Konsep                                          | Status                               | Evidence implementasi utama                                                           |
| ----------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| React SPA dan NestJS modular monolith           | `IMPLEMENTED`                        | Bootstrap frontend; `AppModule`; `/api/v1` prefix.                                    |
| PostgreSQL melalui Prisma                       | `IMPLEMENTED`                        | Datasource Prisma, repositories, migration chain.                                     |
| Platform role                                   | `IMPLEMENTED`                        | `User.platformRole`: `USER`, `ADMIN`, `SUPER_ADMIN`.                                  |
| Place role                                      | `IMPLEMENTED`                        | `PlaceMember.role`: `OWNER`, `CASHIER`.                                               |
| Membership lifecycle                            | `IMPLEMENTED`                        | Unique `(placeId, userId)`, `revokedAt`, active predicates.                           |
| Permission policy                               | `IMPLEMENTED`                        | Finite permission constants dan static role grant maps.                               |
| Global authorization guard                      | `IMPLEMENTED`                        | `JwtAuthGuard` dan `PermissionsGuard` sebagai `APP_GUARD`.                            |
| Resource-scope authorization                    | `IMPLEMENTED`                        | `PlaceAccessService`, service domain checks, repository predicates.                   |
| Frontend RBAC presentation                      | `IMPLEMENTED`                        | Backend-provided permission metadata menjadi CASL rules dan route checks.             |
| Tenant representation                           | `IMPLEMENTED`                        | `Place` dan resource relations berbasis `placeId`.                                    |
| Tenant isolation                                | `IMPLEMENTED`                        | Target membership, actor/place predicates, lifecycle filters, composite relations.    |
| Refresh session rotation                        | `IMPLEMENTED`                        | Hashed refresh sessions, family/replacement, serializable rotation, reuse revocation. |
| Frontend deployment configuration               | `IMPLEMENTED`                        | Vercel SPA rewrite.                                                                   |
| Backend CI baseline                             | `IMPLEMENTED`                        | GitHub Actions dengan Node 22 dan PostgreSQL 16.                                      |
| Provider-specific backend production deployment | `DOCUMENTATION / IMPLEMENTATION GAP` | README deployment masih generik dan memuat `TODO`.                                    |
| Production topology/domain/secrets evidence     | `NOT FOUND IN REPOSITORY`            | Tidak ada konfigurasi target produksi yang dapat diverifikasi.                        |
| Executed load/security/backup-restore evidence  | `NOT FOUND IN REPOSITORY`            | Implementation audit menandai pemeriksaan tersebut belum dijalankan/tersedia.         |

Source:

- `backend/src/app.module.ts:28-58`
- `backend/prisma/schema.prisma:9-22`
- `backend/prisma/schema.prisma:166-218`
- `backend/src/common/auth/permissions.ts:83-177`
- `backend/src/modules/places/place-access.service.ts:38-84`
- `backend/src/modules/auth/auth.service.ts:113-250`
- `frontend/src/utils/create-ability.ts:12-50`
- `.github/workflows/backend-ci.yml:1-49`
- `backend/README.md:398-423`
- `backend/docs/srs-v1.3-implementation-audit.md:399-407`

## 10. Repository Traceability

Indeks berikut mengelompokkan sumber utama agar klaim pada dokumen dapat diperiksa kembali.

### Bootstrap dan application composition

- `backend/src/main.ts:16-49` — bootstrap, CORS, cookie parser, logger, dan prefix API.
- `backend/src/app.module.ts:28-58` — feature modules, global guards/filter, dan request middleware.
- `frontend/src/main.tsx:16-60` — provider composition dan router bootstrap.
- `frontend/src/router.ts:10-34` — router context.

### RBAC dan authorization

- `backend/src/common/auth/permissions.ts:9-177` — permission identifiers, scope, dan role grant maps.
- `backend/src/common/auth/permissions.ts:213-330` — permission resolution dan default-deny helpers.
- `backend/src/common/guards/permissions.guard.ts:24-55` — coarse endpoint admission.
- `backend/src/common/decorators/permissions.decorator.ts:1-10` — all/any permission metadata.
- `backend/src/modules/places/place-access.service.ts:15-84` — global versus membership scope resolution.

### Authentication dan session

- `backend/src/modules/auth/jwt-auth.guard.ts:29-61` — bearer validation dan server-side principal resolution.
- `backend/src/modules/auth/auth-principal.service.ts:11-28` — active actor dan current platform role.
- `backend/src/modules/auth/auth.service.ts:70-109` — login dan session creation.
- `backend/src/modules/auth/auth.service.ts:113-250` — refresh rotation, reuse detection, dan logout.
- `backend/src/modules/auth/refresh-cookie.service.ts:11-44` — refresh-cookie policy.
- `backend/src/lib/jwt-config.service.ts:19-62` — access/refresh token payload creation.

### Tenant representation dan persistence

- `backend/prisma/schema.prisma:13-22` — platform dan place-member role enums.
- `backend/prisma/schema.prisma:85-130` — user dan refresh session.
- `backend/prisma/schema.prisma:166-218` — place dan membership.
- `backend/prisma/schema.prisma:221-352` — business hour, table, media, dan menu scope.
- `backend/prisma/schema.prisma:394-464` — cart dan order scope.
- `backend/prisma/migrations/20260912082709_init/migration.sql:1-493` — initial persisted schema dan constraints.

### Tenant/resource predicates

- `backend/src/modules/places/places.repository.ts:259-319` — table dan active membership predicates.
- `backend/src/modules/menus/menus.repository.ts:56-239` — place-scoped category/item queries.
- `backend/src/modules/carts/carts.repository.ts:47-97` — place and user-owned cart queries.
- `backend/src/modules/orders/orders.repository.ts:363-418` — place-scoped order reads.
- `backend/src/modules/orders/orders.repository.ts:529-541` — membership predicate embedded in order query.
- `backend/src/modules/media/media.repository.ts:52-87` — target-place media intent predicates.
- `backend/src/modules/reviews/reviews.repository.ts:115-124` — reviewable place/menu target predicates.
- `backend/src/modules/reviews/reviews.repository.ts:192-257` — user-owned review predicates.

### Frontend authorization presentation

- `frontend/src/types/user-data.type.ts:1-27` — user, membership, dan permission metadata contract.
- `frontend/src/utils/create-ability.ts:12-50` — backend-driven CASL rules.
- `frontend/src/utils/auth/has-permission.ts:4-15` — platform/place ability helpers dan boundary note.
- `frontend/src/utils/auth/dashboard-route-access.ts:8-48` — account/platform/place route policy.
- `frontend/src/routes/dashboard.tsx:15-76` — selected-place context.

### Infrastructure dan gaps

- `frontend/vercel.json:1-3` — SPA rewrite.
- `.github/workflows/backend-ci.yml:1-49` — backend CI dan PostgreSQL service.
- `backend/src/config/env.ts:43-188` — runtime configuration validation.
- `backend/README.md:84-90` — unresolved prerequisite versions.
- `backend/README.md:398-423` — generic deployment documentation dan TODO.
- `backend/docs/srs-v1.3-implementation-audit.md:359-373` — documented operational release gaps.
- `backend/docs/srs-v1.3-implementation-audit.md:399-407` — recorded verification status; bukan hasil eksekusi ulang pada penyusunan dokumen ini.

### Representative automated verification artifacts

- `backend/src/common/guards/__tests__/permissions.guard.spec.ts:63-92` — coarse permission admission behavior.
- `backend/src/modules/auth/__tests__/jwt-auth.guard.spec.ts:48-93` — principal replacement dan public route behavior.
- `backend/src/modules/places/__tests__/place-access.service.spec.ts:23-132` — global/membership resolution dan foreign tenant rejection.
- `backend/test/place-access.repository.e2e-spec.ts:70-99` — target-place, role, dan revoked membership lookup.
- `backend/src/modules/orders/__tests__/orders.repository.spec.ts:6-27` — membership predicate pada order query.
- `frontend/src/utils/__tests__/create-ability.test.ts:39-117` — separation of platform, global-place, and membership rules.
- `frontend/src/utils/auth/__tests__/dashboard-route-access.test.ts:36-73` — frontend route-scope separation.

Catatan: file test di atas membuktikan bahwa skenario pengujian tersedia dalam repository. Dokumen ini tidak mengklaim hasil eksekusi test pada lingkungan saat penyusunan; pencatatan skenario dan hasil pengujian secara lengkap termasuk ruang lingkup `04_skenario_dan_hasil_pengujian.md`.
