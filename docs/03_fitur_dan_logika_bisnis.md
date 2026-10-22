# Fitur dan Logika Bisnis

Dokumen ini merupakan ekstraksi evidence tentang fitur dan business rules Tooang yang berkaitan dengan RBAC dan multi-tenancy pada domain digital menu. Status yang digunakan adalah `IMPLEMENTED`, `DOCUMENTED`, `DOCUMENTATION / IMPLEMENTATION GAP`, dan `NOT FOUND IN REPOSITORY`. Istilah _tenant_ merujuk pada `Place`.

Dokumen ini bukan katalog lengkap seluruh fitur. Fokusnya adalah operasi yang memerlukan keputusan authentication, authorization, tenant scope, atau ownership. Arsitektur guard dan alur request dijelaskan di `01_arsitektur_dan_teknologi.md`; struktur tabel dijelaskan di `02_perancangan_basis_data.md`.

Konvensi path:

- Path backend relatif terhadap `backend/src/` bila diawali `modules/` atau `common/`, dan ditulis lengkap pada blok `Source`.
- Endpoint ditulis tanpa prefix global `/api/v1`.

## 1. Actor dan Role

### `IMPLEMENTED`

Permission sebuah actor ditentukan oleh empat hal: platform role saat ini, membership aktif pada target place, permission map di kode, dan aturan scope/domain pada resource target. Tabel role di bawah disusun dari grant map, decorator controller, service check, dan test; tidak disimpulkan dari nama role.

Source:

- `backend/docs/software-requirement-specification.md:110-115`
- `backend/src/common/auth/permissions.ts:83-177`
- `backend/src/modules/places/place-access.service.ts:38-85`

### 1.1 Platform Actors

#### Role: `USER`

| Aspek                  | Evidence                                                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose/Scope          | Self-service. Semua grant memakai scope `own`. Platform role default pada registrasi; schema registrasi `.strict()` tidak menerima field role.                                                                                   |
| Allowed Operations     | `profile.read`, `profile.update`, `account.deletion.request`, `cart.manage`, `order.checkout`, `order.read`, `order.cancel`, `review.create`, `review.update`, `review.delete`.                                                  |
| Denied Operations      | Semua permission place management, menu, table, member, media, user administration, moderation, dan `order.create_manual` bila tidak memiliki membership. `GET /orders` (global order list) ditolak `403` karena `order.read` milik USER hanya `own`. Pembatalan order sendiri hanya untuk status `PENDING`. |
| Applicable Tenant      | Tidak terikat place. Cart dan checkout memakai `placeId` target, tetapi data dibatasi pada actor.                                                                                                                                |
| Applicable Resources   | Profile sendiri, cart sendiri per place, order sendiri, review sendiri.                                                                                                                                                          |

Source:

- `backend/src/common/auth/permissions.ts:83-94`
- `backend/src/modules/auth/auth.service.ts:53-67`
- `backend/src/modules/auth/auth.schema.ts:18-24`
- `backend/prisma/schema.prisma:91`
- `backend/src/modules/orders/order-queries.service.ts:76-99`
- `backend/src/modules/orders/order-transitions.service.ts:51-77`
- `backend/src/common/auth/__tests__/permissions.spec.ts:90-111`
- `backend/test/order-lifecycle.e2e-spec.ts:179-235`

#### Role: `ADMIN`

| Aspek                  | Evidence                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose/Scope          | Operasi platform lintas place. Mewarisi grant `USER`, lalu menambah grant `global` dan satu grant `restricted`.                                                                                                                                                                 |
| Allowed Operations     | Global: `order.read`, `order.cancel` (keduanya `own + global`), `order.create_manual`, `review.moderate`, `place.create/read/update/publish/delete`, `table.read/create/update/delete`, `menu.create/update/delete`, `place_member.read`, `cashier.assign/revoke`, `user.read`, `user.create`, `media.upload/delete`. Restricted: `user.deactivate`. |
| Denied Operations      | `owner.assign`, `owner.revoke`, `platform_role.assign`, `platform_role.update`. Tidak memiliki grant platform untuk `order.confirm`, `order.prepare`, `order.ready`, `order.complete`. `user.create` hanya untuk akun `USER` (service melempar `ADMIN may create only USER accounts`). `user.deactivate` hanya untuk target berrole `USER`. |
| Applicable Tenant      | Semua place aktif untuk permission dengan scope `global`, tanpa membership. Untuk permission non-global, ADMIN diperlakukan seperti user lain dan memerlukan membership aktif.                                                                                                  |
| Applicable Resources   | Place, menu, dining table, membership CASHIER, media, order (read/cancel/manual), review (moderasi), akun user berrole `USER`.                                                                                                                                                  |

Source:

- `backend/src/common/auth/permissions.ts:96-122`
- `backend/src/modules/users/users.service.ts:63-80`
- `backend/src/modules/users/users.service.ts:254-271`
- `backend/src/modules/places/place-members.service.ts:167-173`
- `backend/src/modules/orders/order-transitions.service.ts:196-205`
- `backend/src/common/auth/__tests__/permissions.spec.ts:113-181`
- `backend/src/modules/users/__tests__/users.service.spec.ts:42-90`
- `backend/src/modules/users/__tests__/users.service.spec.ts:171-191`
- `backend/test/auth-users.e2e-spec.ts:255-490`

#### Role: `SUPER_ADMIN`

| Aspek                  | Evidence                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose/Scope          | Administrasi sistem dan keamanan. Mewarisi grant `ADMIN`.                                                                                                                                                                          |
| Allowed Operations     | Semua grant `ADMIN`, dengan `user.deactivate` menjadi `global`, ditambah `owner.assign`, `owner.revoke`, `platform_role.assign`, `platform_role.update`. Dapat membuat user dengan platform role selain `USER`.                     |
| Denied Operations      | Tetap tidak memiliki grant platform untuk `order.confirm/prepare/ready/complete`. Tidak dapat mendemosi, menonaktifkan, atau menghapus akun SUPER_ADMIN aktif terakhir. Tidak dapat mencabut atau mengubah OWNER aktif terakhir sebuah place. Tidak dapat menonaktifkan user yang menjadi satu-satunya OWNER aktif sebuah place. |
| Applicable Tenant      | Semua place aktif untuk permission global.                                                                                                                                                                                         |
| Applicable Resources   | Sama dengan ADMIN, ditambah membership OWNER dan platform role semua user.                                                                                                                                                         |

Source:

- `backend/src/common/auth/permissions.ts:124-131`
- `backend/src/modules/users/users.service.ts:216-252`
- `backend/src/modules/users/users.service.ts:254-296`
- `backend/src/modules/places/place-members.service.ts:34-165`
- `backend/src/common/auth/__tests__/permissions.spec.ts:183-237`
- `backend/src/modules/users/__tests__/users.service.spec.ts:193-245`

### 1.2 Tenant/Place Actors

Place role disimpan di `PlaceMember.role` dan hanya berlaku bila membership aktif (`revokedAt = null`), place aktif, dan user aktif. Seorang user dengan platform role apa pun dapat memiliki place role. Platform role dan place role tidak saling diturunkan.

Source:

- `backend/src/modules/places/places.repository.ts:299-316`
- `backend/src/common/auth/__tests__/permissions.spec.ts:365-380`
- `backend/docs/application-rules.md:21-22`

#### Role: `OWNER`

| Aspek                  | Evidence                                                                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose/Scope          | Pengelolaan place yang dimiliki. Semua grant memakai scope `owned`.                                                                                                                                                                                        |
| Allowed Operations     | `order.create_manual/read/cancel/confirm/prepare/ready/complete`, `place.read/update/publish/delete`, `table.read/create/update/delete`, `menu.create/update/delete`, `place_member.read`, `cashier.assign/revoke`, `media.upload/delete`.                    |
| Denied Operations      | `owner.assign`, `owner.revoke` (tidak ada di grant map OWNER). Karena itu OWNER tidak dapat menambah OWNER lain atau mengubah OWNER menjadi CASHIER. Tidak ada grant untuk `place.create`, `review.moderate`, user administration.                            |
| Applicable Tenant      | Hanya place dengan membership OWNER aktif milik actor.                                                                                                                                                                                                      |
| Applicable Resources   | Profil place, jam operasional, dining table, kategori dan item menu, membership CASHIER, media place/menu, order place.                                                                                                                                      |

Source:

- `backend/src/common/auth/permissions.ts:152-176`
- `backend/src/modules/places/place-members.service.ts:53-66`
- `backend/src/modules/places/place-members.service.ts:167-173`
- `backend/src/common/auth/__tests__/permissions.spec.ts:260-293`
- `backend/src/modules/places/__tests__/place-members.service.spec.ts:51-86`

#### Role: `CASHIER`

| Aspek                  | Evidence                                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose/Scope          | Operasional order pada place tempat actor menjadi member. Semua grant memakai scope `member`.                                                                                                                                                                            |
| Allowed Operations     | `order.create_manual/read/cancel/confirm/prepare/ready/complete`, `place.read`, `table.read`, `place_member.read`.                                                                                                                                                       |
| Denied Operations      | `place.update/publish/delete`, `table.create/update/delete`, `menu.create/update/delete`, `cashier.assign/revoke`, `owner.*`, `media.*`. Endpoint manajemen menu (`GET places/:placeId/menu-categories`, `GET places/:placeId/menu-items`) mensyaratkan `menu.update`, sehingga tidak dapat diakses CASHIER. |
| Applicable Tenant      | Hanya place dengan membership CASHIER aktif milik actor.                                                                                                                                                                                                                 |
| Applicable Resources   | Order place; daftar membership dibatasi pada baris miliknya sendiri; dining table dibatasi yang aktif; opsi menu/meja untuk manual order.                                                                                                                                 |

Source:

- `backend/src/common/auth/permissions.ts:140-151`
- `backend/src/modules/places/place-members.service.ts:24-32`
- `backend/src/modules/places/dining-tables.service.ts:25-41`
- `backend/src/modules/menus/menus.controller.ts:42-58`
- `backend/src/modules/menus/menus.controller.ts:104-120`
- `backend/src/modules/orders/manual-orders.service.ts:41-62`
- `backend/src/common/auth/__tests__/permissions.spec.ts:239-258`
- `backend/src/modules/places/__tests__/dining-tables.service.spec.ts:20-35`

### 1.3 Public/Customer Actor

#### Actor: Visitor (tanpa autentikasi)

| Aspek                  | Evidence                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose/Scope          | Akses baca publik. Endpoint ditandai `@Public()` sehingga melewati `JwtAuthGuard`.                                                                                                                                             |
| Allowed Operations     | `GET places`, `GET places/:slug`, `GET places/:placeId/menu`, `GET places/:placeId/reviews`, `GET places/:placeId/menu-items/:menuItemId/reviews`, `GET order-verifications/:token`, `GET health/ready`, legacy root `GET /` (belum dinormalisasi; tercatat sebagai gap F-01 di `04_skenario_dan_hasil_pengujian.md` §10), serta `POST auth/register`, `auth/login`, `auth/refresh`, `auth/logout`. |
| Denied Operations      | Semua endpoint lain memerlukan access token karena `JwtAuthGuard` terpasang global.                                                                                                                                             |
| Applicable Tenant      | Place yang `isPublished: true` dan `deletedAt: null` untuk discovery dan menu publik.                                                                                                                                           |
| Applicable Resources   | Place terpublikasi, menu publik yang eligible, review yang terlihat, respons verifikasi order minimal.                                                                                                                          |

Source:

- `backend/src/app.controller.ts:11-12`
- `backend/src/modules/places/places.controller.ts:36-37`
- `backend/src/modules/places/places.controller.ts:71-72`
- `backend/src/modules/menus/menus.controller.ts:162-167`
- `backend/src/modules/reviews/reviews.controller.ts:40-41`
- `backend/src/modules/reviews/reviews.controller.ts:75-76`
- `backend/src/modules/orders/order-access.controller.ts:194-201`
- `backend/src/modules/auth/auth.controller.ts:24-26`
- `backend/src/modules/observability/health.controller.ts:22-23`
- `backend/src/modules/places/places.repository.ts:100-132`
- `backend/src/modules/menus/menus.repository.ts:138-170`

#### Actor: Customer (USER yang login)

Customer adalah actor terautentikasi dengan grant `own`: mengelola cart per place, checkout, membaca dan membatalkan order sendiri, mengambil token verifikasi order sendiri, serta membuat, mengubah, dan menghapus review dari order sendiri yang `COMPLETED`. Grant ini juga dimiliki ADMIN dan SUPER_ADMIN karena ketiganya mewarisi `USER_PLATFORM_GRANTS`.

Source:

- `backend/src/common/auth/permissions.ts:83-94`
- `backend/src/modules/carts/carts.controller.ts:19-54`
- `backend/src/modules/orders/orders.controller.ts:32-93`
- `backend/src/modules/reviews/reviews.controller.ts:54-55`
- `backend/src/modules/reviews/reviews.controller.ts:111-176`

### `DOCUMENTED`

SRS mendeskripsikan enam konteks actor: Visitor, Platform USER, Place CASHIER, Place OWNER, ADMIN, dan SUPER_ADMIN. Deskripsi tersebut konsisten dengan grant map di kode, kecuali dua permission yang dicatat di §3.

Source:

- `backend/docs/software-requirement-specification.md:117-124`

## 2. Authorization Model

### `IMPLEMENTED`

Authorization berjalan dalam beberapa lapis. Lapis yang lebih awal tidak menggantikan lapis berikutnya.

| Lapis | Komponen                                   | Keputusan                                                                                                                                                                                              |
| ----- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `@Public()` / `JwtAuthGuard`               | Endpoint non-public memerlukan bearer access token valid; actor dimuat ulang dari database.                                                                                                            |
| 2     | `PermissionsGuard` + `@RequirePermissions` / `@RequireAnyPermission` | *Coarse admission*: lolos bila platform role memiliki grant permission tersebut, **atau** permission tersebut dapat diberikan oleh suatu place role. Bila endpoint tidak memiliki metadata permission, guard meloloskan request yang sudah terautentikasi. |
| 3     | `PlaceAccessService.assertPermission`      | Untuk target `placeId`: bila platform role punya scope `global`, cukup verifikasi place aktif; jika tidak, wajib ada membership aktif pada place itu dengan role yang memberi permission tersebut.          |
| 4     | Service domain check                       | Aturan target dan state: restricted target, last OWNER, last SUPER_ADMIN, status order, publish readiness, dan sebagainya.                                                                              |
| 5     | Repository predicate                       | Query dan mutation menyertakan `placeId`, actor ID, scope membership, dan lifecycle predicate.                                                                                                          |

Source:

- `backend/src/modules/auth/jwt-auth.guard.ts:29-53`
- `backend/src/common/guards/permissions.guard.ts:24-55`
- `backend/src/common/auth/permissions.ts:301-310`
- `backend/src/modules/places/place-access.service.ts:38-85`
- `backend/src/modules/orders/orders.repository.ts:529-541`

Keputusan `PlaceAccessService`:

```text
resolveScope(actor, permission):
  if platformRole has GLOBAL scope for permission  -> { kind: global }
  allowedRoles = place roles whose grant map contains permission
  if allowedRoles is empty                         -> 403 Insufficient permissions
  else                                             -> { kind: membership, actorId, allowedRoles }

assertPermission(actor, placeId, permission):
  global     -> active place exists ? { source: platform } : 404 Place not found
  membership -> active membership (placeId, actorId, role in allowedRoles,
                revokedAt null, place active, user active) ?
                { source: membership, resourceScope: member|owned } : 404 Place not found
```

Source:

- `backend/src/modules/places/place-access.service.ts:38-85`

Hasil `ResolvedPlaceAccess.source` dipakai lebih lanjut oleh service:

- `platform` → service menambahkan audit `ADMIN_CROSS_PLACE_MUTATION` pada mutation;
- `membership` → query order memakai predicate membership, daftar member dan daftar meja dibatasi untuk CASHIER.

Source:

- `backend/src/modules/places/places.service.ts:278-296`
- `backend/src/modules/orders/order-queries.service.ts:88-93`
- `backend/src/modules/places/place-members.service.ts:24-32`
- `backend/src/modules/places/dining-tables.service.ts:25-41`

Beberapa operasi global tidak melewati `PlaceAccessService` karena tidak memiliki target place. Untuk operasi ini service memeriksa ulang scope global secara eksplisit:

| Operasi                               | Pemeriksaan service                                                       |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `GET places/management`               | `hasGlobalPlatformPermission(..., place.read)`, jika tidak `403`.         |
| `GET orders`, `GET orders/:orderId`   | `hasGlobalPlatformPermission(..., order.read)`, jika tidak `403`.         |
| Moderasi review                       | `hasGlobalPlatformPermission(..., review.moderate)` di dalam transaksi.   |
| `PUT users/:userId/platform-role`     | Scope `global` pada `platform_role.update`.                               |

Source:

- `backend/src/modules/places/places.service.ts:50-53`
- `backend/src/modules/orders/order-queries.service.ts:76-99`
- `backend/src/modules/reviews/reviews.service.ts:296-306`
- `backend/src/modules/users/users.service.ts:216-223`

## 3. Permission Model

### `IMPLEMENTED`

- 40 permission identifier didefinisikan sebagai konstanta `PERMISSION`.
- Scope platform: `own`, `restricted`, `global`. Scope membership: `member`, `owned`.
- Grant map: `USER` → `ADMIN` (spread `USER`) → `SUPER_ADMIN` (spread `ADMIN`); `CASHIER` dan `OWNER` didefinisikan terpisah.
- Fungsi resolusi menolak role dan permission yang tidak dikenal dengan hasil kosong (default deny).
- Effective place permission (metadata untuk frontend) adalah gabungan aditif dari grant membership dan grant platform `global` yang termasuk dalam himpunan permission berkonteks place.

Source:

- `backend/src/common/auth/permissions.ts:9-50`
- `backend/src/common/auth/permissions.ts:55-81`
- `backend/src/common/auth/permissions.ts:83-177`
- `backend/src/common/auth/permissions.ts:183-189`
- `backend/src/common/auth/permissions.ts:213-275`
- `backend/src/common/auth/__tests__/permissions.spec.ts:295-321`
- `backend/src/common/auth/__tests__/permissions.spec.ts:382-397`

Matriks grant yang diekstrak langsung dari kode (`—` berarti tidak ada grant):

| Permission                          | USER | ADMIN          | SUPER_ADMIN    | CASHIER | OWNER |
| ----------------------------------- | ---- | -------------- | -------------- | ------- | ----- |
| `profile.read`, `profile.update`    | own  | own            | own            | —       | —     |
| `account.deletion.request`          | own  | own            | own            | —       | —     |
| `cart.manage`, `order.checkout`     | own  | own            | own            | —       | —     |
| `order.read`, `order.cancel`        | own  | own + global   | own + global   | member  | owned |
| `order.create_manual`               | —    | global         | global         | member  | owned |
| `order.confirm/prepare/ready/complete` | — | —              | —              | member  | owned |
| `review.create/update/delete`       | own  | own            | own            | —       | —     |
| `review.moderate`                   | —    | global         | global         | —       | —     |
| `place.create`                      | —    | global         | global         | —       | —     |
| `place.read`                        | —    | global         | global         | member  | owned |
| `place.update/publish/delete`       | —    | global         | global         | —       | owned |
| `table.read`                        | —    | global         | global         | member  | owned |
| `table.create/update/delete`        | —    | global         | global         | —       | owned |
| `menu.create/update/delete`         | —    | global         | global         | —       | owned |
| `place_member.read`                 | —    | global         | global         | member  | owned |
| `cashier.assign/revoke`             | —    | global         | global         | —       | owned |
| `owner.assign/revoke`               | —    | —              | global         | —       | —     |
| `platform_role.assign/update`       | —    | —              | global         | —       | —     |
| `user.read`, `user.create`          | —    | global         | global         | —       | —     |
| `user.deactivate`                   | —    | restricted     | global         | —       | —     |
| `media.upload/delete`               | —    | global         | global         | —       | owned |

Source:

- `backend/src/common/auth/permissions.ts:83-177`

Tidak ada permission `menu.read`. Endpoint baca manajemen menu memakai `menu.update`.

Source:

- `backend/src/common/auth/permissions.ts:35-37`
- `backend/src/modules/menus/menus.service.ts:36-50`
- `backend/src/modules/menus/menus.service.ts:127-141`

### `DOCUMENTATION / IMPLEMENTATION GAP`

| Permission            | Dokumentasi                                                                                                                                                                                         | Implementasi                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order.create_manual` | Tidak tercantum di matriks SRS §4.3. Dijelaskan di SRS-ORD-024, API specification `orders.md`, dan implementation audit.                                                                            | Didefinisikan dan diberikan ke ADMIN/SUPER_ADMIN (global) serta CASHIER/OWNER (member/owned); dipakai endpoint `places/:placeId/orders/manual` dan `manual-options`.    |
| `user.create`         | Tidak ditemukan di matriks SRS §4.3, API specification `users.md`, maupun implementation audit.                                                                                                     | Didefinisikan, diberikan global ke ADMIN/SUPER_ADMIN, dipakai `POST users`; ADMIN hanya dapat membuat akun `USER`.                                                   |

Source:

- `backend/docs/software-requirement-specification.md:180-250`
- `backend/docs/software-requirement-specification.md:751-752`
- `backend/docs/api-specification/orders.md:35`
- `backend/docs/srs-v1.3-implementation-audit.md:414`
- `backend/src/common/auth/permissions.ts:15`
- `backend/src/common/auth/permissions.ts:45`
- `backend/src/common/auth/permissions.ts:99`
- `backend/src/common/auth/permissions.ts:118`
- `backend/src/modules/users/users.controller.ts:55-63`
- `backend/src/modules/orders/order-access.controller.ts:62-78`

## 4. Tenant-Scoped Operations

Seluruh endpoint di bagian ini memakai `placeId` dari path (kecuali media upload intent yang memakai `placeId` dari body) dan meneruskannya ke `PlaceAccessService`.

### 4.1 Place Management

### `IMPLEMENTED`

| Endpoint                              | Permission      | Aturan bisnis utama                                                                                                                                                                       |
| ------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST places`                         | `place.create`  | Hanya ADMIN/SUPER_ADMIN. Slug reserved ditolak. Place dan membership OWNER untuk actor pembuat dibuat bersama dalam serializable transaction, dengan audit `PLACE_CREATED` dan `PLACE_MEMBER_ASSIGNED`. |
| `GET places/management`               | `place.read`    | Hanya untuk scope global.                                                                                                                                                                 |
| `GET places/:placeId/management`      | `place.read`    | Global atau membership OWNER/CASHIER.                                                                                                                                                     |
| `PATCH places/:placeId`               | `place.update`  | Slug reserved ditolak.                                                                                                                                                                    |
| `PATCH places/:placeId/publishing`    | `place.publish` | Publish mensyaratkan nama, alamat, dan timezone IANA valid, minimal satu OWNER aktif, dan minimal satu menu item yang memenuhi syarat. Unpublish juga mematikan `isOrderingEnabled`.       |
| `PATCH places/:placeId/ordering`      | `place.update`  | Mengaktifkan ordering mensyaratkan place terpublikasi dan minimal satu menu item tersedia.                                                                                                |
| `DELETE places/:placeId`              | `place.delete`  | Ditolak bila masih ada order yang belum terselesaikan; soft delete dan mematikan publishing/ordering.                                                                                     |

Mutation yang aksesnya berasal dari scope platform menambahkan audit `ADMIN_CROSS_PLACE_MUTATION`.

Source:

- `backend/src/modules/places/places.controller.ts:47-129`
- `backend/src/modules/places/places.service.ts:50-73`
- `backend/src/modules/places/places.service.ts:86-121`
- `backend/src/modules/places/places.service.ts:148-184`
- `backend/src/modules/places/places.service.ts:186-235`
- `backend/src/modules/places/places.service.ts:237-275`
- `backend/src/modules/places/places.service.ts:278-296`
- `backend/src/modules/places/__tests__/places.service.spec.ts:11-110`
- `backend/test/places.e2e-spec.ts:77`

### `DOCUMENTATION / IMPLEMENTATION GAP`

`application-rules.md` menyatakan bahwa place dapat dipublikasi bila memiliki nama, tipe, alamat, minimal satu OWNER, dan minimal satu menu item aktif. Implementasi juga memeriksa validitas timezone IANA; pemeriksaan tipe tidak tampak secara eksplisit di `setPublishing` karena `type` adalah kolom enum non-null.

Source:

- `backend/docs/application-rules.md:44`
- `backend/src/modules/places/places.service.ts:196-205`
- `backend/prisma/schema.prisma:170`

### 4.2 Menu Management

### `IMPLEMENTED`

| Endpoint                                                      | Permission    | Aturan bisnis utama                                                                                   |
| ------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| `GET places/:placeId/menu-categories[/:categoryId]`           | `menu.update` | Hanya OWNER atau global.                                                                              |
| `POST/PATCH/DELETE places/:placeId/menu-categories[/:id]`     | `menu.create/update/delete` | Nama ternormalisasi unik per place; kategori yang masih berisi menu item tidak dapat dihapus. |
| `GET places/:placeId/menu-items[/:menuItemId]`                | `menu.update` | Hanya OWNER atau global.                                                                              |
| `POST/PATCH/DELETE places/:placeId/menu-items[/:id]`          | `menu.create/update/delete` | Kategori dicari dengan pasangan `categoryId` + `placeId`; kategori dari place lain menghasilkan `404 Menu category not found`. |
| `GET places/:placeId/menu`                                    | Public        | Hanya item yang eligible dari place terpublikasi.                                                     |

Setelah mutation menu, `reconcilePlaceState` menghitung ulang item yang eligible. Place di-unpublish otomatis bila tidak ada item yang memenuhi syarat, dan ordering dimatikan bila tidak ada item tersedia atau place tidak terpublikasi. Perubahan ordering tersebut diaudit sebagai `ORDERING_SETTING_UPDATED`.

Source:

- `backend/src/modules/menus/menus.controller.ts:38-170`
- `backend/src/modules/menus/menus.service.ts:36-125`
- `backend/src/modules/menus/menus.service.ts:143-171`
- `backend/src/modules/menus/menus.service.ts:173-260`
- `backend/src/modules/menus/menus.service.ts:297-325`
- `backend/src/modules/menus/menus.service.ts:327-345`
- `backend/src/modules/menus/menus.repository.ts:56-115`
- `backend/test/menus.e2e-spec.ts:74`

### 4.3 Business Hours

### `IMPLEMENTED`

| Endpoint                                  | Permission     | Aturan                                                                                   |
| ----------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `GET places/:placeId/business-hours`      | `place.read`   | Global, OWNER, atau CASHIER.                                                             |
| `PUT places/:placeId/business-hours/:day` | `place.update` | Global atau OWNER; upsert per `(placeId, day)`; audit `ADMIN_CROSS_PLACE_MUTATION` bila global. |

Jam operasional dipakai pada checkout: order customer ditolak dengan `PLACE_CLOSED` bila place sedang tutup menurut timezone dan business hours.

Source:

- `backend/src/modules/places/business-hours.controller.ts:16-31`
- `backend/src/modules/places/business-hours.service.ts:29-75`
- `backend/src/modules/orders/orders.service.ts:148-150`

### 4.4 Dining Tables

### `IMPLEMENTED`

| Endpoint                                         | Permission                   | Aturan                                                                                    |
| ------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------- |
| `GET places/:placeId/dining-tables[/:tableId]`   | `table.read`                 | CASHIER hanya melihat meja aktif (`activeOnly`); OWNER dan global melihat semua.          |
| `POST/PATCH/DELETE places/:placeId/dining-tables[/:tableId]` | `table.create/update/delete` | Global atau OWNER; nama ternormalisasi unik per place; meja dicari dengan `placeId` + `tableId`. |

Meja milik place lain dikembalikan sebagai `404 Dining table not found`.

Source:

- `backend/src/modules/places/dining-tables.controller.ts:18-65`
- `backend/src/modules/places/dining-tables.service.ts:25-160`
- `backend/src/modules/places/places.repository.ts:251-296`
- `backend/src/modules/places/__tests__/dining-tables.service.spec.ts:20-54`

### 4.5 Orders

### `IMPLEMENTED`

Order memiliki tiga konteks akses yang terpisah:

| Konteks               | Endpoint                                                                                       | Scope query                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Own (customer)        | `POST me/orders`, `GET me/orders[/:orderId]`, `GET me/orders/:orderId/verification`, `PATCH me/orders/:orderId/status` | `userId = actor.id`                                                       |
| Place (operasional)   | `GET places/:placeId/orders`, `GET places/:placeId/orders/:orderId`, `GET .../by-code/:orderCode`, `PATCH .../:orderId/status`, `GET/POST .../manual[-options]` | `placeId` + predicate membership (actor, role, `revokedAt: null`) atau global |
| Global (platform)     | `GET orders`, `GET orders/:orderId`                                                            | Tanpa filter place; hanya untuk scope global `order.read`                            |
| Public                | `GET order-verifications/:token`                                                               | Token valid, `verificationDisabledAt: null`, dan masih dalam jendela waktu           |

Source:

- `backend/src/modules/orders/orders.controller.ts:32-93`
- `backend/src/modules/orders/order-access.controller.ts:54-201`
- `backend/src/modules/orders/order-queries.service.ts:31-99`
- `backend/src/modules/orders/orders.repository.ts:370-421`
- `backend/src/modules/orders/orders.repository.ts:452-470`
- `backend/src/modules/orders/orders.repository.ts:529-541`
- `backend/test/order-lifecycle.e2e-spec.ts:179-235`

**Checkout customer** (`POST me/orders`, `order.checkout`) dijalankan dalam serializable transaction dengan idempotency key. Langkahnya: kunci user aktif dan cart milik actor pada `placeId`, lalu tolak bila place terhapus (`404`), cart kosong, place tidak terpublikasi (`PLACE_UNAVAILABLE`), ordering mati (`ORDERING_DISABLED`), place tutup (`PLACE_CLOSED`), atau ada item tidak valid / melebihi batas (`CART_ITEM_INVALID`). Untuk `DINE_IN`, meja dicari dengan `tableId` + `placeId`.

Source:

- `backend/src/modules/orders/orders.service.ts:52-102`
- `backend/src/modules/orders/orders.service.ts:132-175`
- `backend/src/modules/orders/orders.service.ts:277-312`
- `backend/test/carts-orders.e2e-spec.ts:113-300`

**Manual order** (`POST places/:placeId/orders/manual`, `order.create_manual`) dibuat oleh CASHIER, OWNER, atau global actor. Service memeriksa akses place di dalam transaksi, memvalidasi bahwa setiap item dan kategorinya milik `placeId`, dan membuat order dengan `source: MANUAL`, `status: CONFIRMED`, `createdBy` = actor, `userId` kosong, serta `verificationDisabledAt` diisi.

Source:

- `backend/src/modules/orders/manual-orders.service.ts:41-62`
- `backend/src/modules/orders/manual-orders.service.ts:140-176`
- `backend/src/modules/orders/manual-orders.service.ts:198-215`
- `backend/src/modules/orders/__tests__/manual-orders.service.spec.ts:100-140`

**Verifikasi order publik** hanya menerima token dengan format 43 karakter base64url dan hanya mengembalikan `orderCode`, nama place, status, tipe fulfillment, dan timestamp. Kegagalan dikembalikan sebagai `404 ORDER_VERIFICATION_NOT_FOUND`. Endpoint ini memakai rate limit. `application-rules.md` menyatakan bahwa kepemilikan QR code saja tidak memberi hak mutation.

Source:

- `backend/src/modules/orders/order-verification.service.ts:7-41`
- `backend/src/modules/orders/order-access.controller.ts:194-209`
- `backend/docs/application-rules.md:139-144`
- `backend/test/order-lifecycle.e2e-spec.ts:276-316`

### 4.6 Reviews

### `IMPLEMENTED`

| Operasi                                      | Permission                     | Aturan                                                                                                                                       |
| -------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Buat place review                            | `review.create`                | Order harus milik actor dan berstatus `COMPLETED`; `order.placeId` harus sama dengan `placeId` (`REVIEW_ORDER_PLACE_MISMATCH`); place harus reviewable. Review yang pernah di-soft-delete dipulihkan, bukan dibuat baru. |
| Buat menu item review                        | `review.create`                | Order milik actor, `COMPLETED`, dan harus berisi menu item tersebut.                                                                          |
| Ubah/hapus review sendiri                    | `review.update`, `review.delete` | Dibatasi pada `userId` actor.                                                                                                              |
| Daftar review sendiri                        | `profile.read`                 | Dibatasi pada actor.                                                                                                                         |
| Moderasi (`GET/DELETE place-reviews`, `menu-item-reviews`) | `review.moderate`  | Hanya global (ADMIN/SUPER_ADMIN); permission diperiksa ulang di dalam transaksi; diaudit.                                                    |
| Daftar review publik                         | Public                         | Untuk place/menu item yang dapat dipublikasikan.                                                                                             |

OWNER dan CASHIER tidak memiliki grant moderasi review.

Source:

- `backend/src/modules/reviews/reviews.controller.ts:36-227`
- `backend/src/modules/reviews/reviews.service.ts:58-152`
- `backend/src/modules/reviews/reviews.service.ts:154-226`
- `backend/src/modules/reviews/reviews.service.ts:296-340`
- `backend/src/modules/reviews/reviews.repository.ts:115-124`
- `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:130-225`
- `backend/test/reviews.e2e-spec.ts:154-260`

### 4.7 Other Relevant Resources

### `IMPLEMENTED`

**Place membership**

| Endpoint                                | Permission                                     | Aturan                                                                                                                                                                                      |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET places/:placeId/members`           | `place_member.read`                            | CASHIER hanya menerima baris membership miliknya sendiri.                                                                                                                                   |
| `PUT places/:placeId/members/:userId`   | Any of `cashier.assign`, `owner.assign`        | Permission spesifik ditentukan dari role target. Mengubah role membership aktif juga memerlukan permission revoke untuk role lama. Membership OWNER terakhir tidak dapat diubah. Reaktivasi memakai baris yang sama. |
| `DELETE places/:placeId/members/:userId`| Any of `cashier.revoke`, `owner.revoke`        | Memerlukan `place_member.read` lalu permission revoke sesuai role membership; OWNER aktif terakhir tidak dapat dicabut.                                                                    |

Source:

- `backend/src/modules/places/place-members.controller.ts:23-57`
- `backend/src/modules/places/place-members.service.ts:24-173`
- `backend/src/modules/places/__tests__/place-members.service.spec.ts:31-110`

**Media**

`POST media/upload-intents` (`media.upload`) menerima `placeId` dan target di body. Service memverifikasi actor aktif, akses place, serta target kategori/menu item yang aktif pada place tersebut. `POST media/upload-intents/:intentId/complete` hanya menemukan intent milik actor (`actorUserId`) dan menjalankan ulang pemeriksaan akses target di dalam transaksi. Endpoint penghapusan media place/menu memakai `media.delete`.

Source:

- `backend/src/modules/media/media.controller.ts:25-100`
- `backend/src/modules/media/media.service.ts:54-90`
- `backend/src/modules/media/media.service.ts:107-170`
- `backend/src/modules/media/media.service.ts:293-325`
- `backend/src/modules/media/media.repository.ts:85-90`

**Cart**

`me/carts/:placeId` (`cart.manage`) dibatasi pada pasangan `(actor.id, placeId)`. Item hanya dapat ditambahkan bila menu item milik `placeId`, tidak terhapus, tersedia, dan kategorinya aktif pada place yang sama.

Source:

- `backend/src/modules/carts/carts.controller.ts:19-60`
- `backend/src/modules/carts/carts.service.ts:31-116`
- `backend/src/modules/carts/carts.repository.ts:47-63`

**Administrasi user**

`GET users`, `GET users/:userId` (`user.read`), `POST users` (`user.create`), `PUT users/:userId/platform-role` (`platform_role.update`), dan `DELETE users/:userId` (`user.deactivate`). Deaktivasi mencabut refresh session dalam transaksi yang sama dan diaudit.

Source:

- `backend/src/modules/users/users.controller.ts:51-100`
- `backend/src/modules/users/users.service.ts:63-105`
- `backend/src/modules/users/users.service.ts:197-296`

## 5. Tenant Isolation Rules

### `IMPLEMENTED`

| Aturan                                                                                                                       | Evidence                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Akses place non-global memerlukan membership aktif pada target place yang sama; membership place lain tidak berlaku.          | `place-access.service.ts:67-76`; `places.repository.ts:299-316`                                                      |
| Child resource dicari dengan pasangan resource ID + `placeId`: kategori, menu item, dining table, order, media target, cart item. | `menus.repository.ts:56-115`; `places.repository.ts:259-296`; `orders.repository.ts:399-421`; `media.service.ts:304-321`; `carts.repository.ts:51-63` |
| Query order place-scoped menyertakan predicate membership di database, bukan filter di memory.                               | `orders.repository.ts:529-541`; `orders.repository.spec.ts:6-27`                                                     |
| Mutation status order kondisional pada `id`, `placeId` (atau `userId`), dan status yang diharapkan.                          | `orders.repository.ts:423-450`                                                                                       |
| Item manual order wajib memiliki `placeId` dan `category.placeId` yang sama dengan target.                                   | `manual-orders.service.ts:146-163`                                                                                   |
| Place review wajib memiliki `order.placeId = placeId`.                                                                       | `reviews.service.ts:72-77`                                                                                           |
| Composite FK menolak relasi lintas place pada menu/cart/media intent.                                                        | `02_perancangan_basis_data.md` §5.4                                                                                  |

Source:

- `backend/src/modules/places/place-access.service.ts:67-76`
- `backend/src/modules/places/places.repository.ts:259-316`
- `backend/src/modules/menus/menus.repository.ts:56-115`
- `backend/src/modules/orders/orders.repository.ts:399-450`
- `backend/src/modules/orders/orders.repository.ts:529-541`
- `backend/src/modules/orders/__tests__/orders.repository.spec.ts:6-27`
- `backend/src/modules/orders/manual-orders.service.ts:146-163`
- `backend/src/modules/media/media.service.ts:304-321`
- `backend/src/modules/carts/carts.repository.ts:51-63`
- `backend/src/modules/reviews/reviews.service.ts:72-77`

### `DOCUMENTED`

`application-rules.md` menetapkan bahwa OWNER A tidak dapat membaca atau mengubah entitas privat atau order milik OWNER B, dan bahwa resource tenant lain dikembalikan sebagai `404`.

Source:

- `backend/docs/application-rules.md:36`
- `backend/docs/application-rules.md:158`
- `backend/docs/application-rules.md:178`

## 6. Cross-Tenant Access Rules

### `IMPLEMENTED`

| Situasi                                                                         | Hasil                                                                                                       |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Member place A mengakses endpoint place B                                       | `404 Place not found` (bukan `403`).                                                                        |
| Member mengakses child resource place lain melalui path place miliknya          | `404` resource (mis. `Dining table not found`, `Order not found`, `Menu category not found`).               |
| Customer membaca order user lain lewat `me/orders/:orderId`                     | `404 Order not found`.                                                                                      |
| ADMIN/SUPER_ADMIN dengan permission berscope `global`                           | Diizinkan tanpa membership; place harus aktif; mutation menulis `ADMIN_CROSS_PLACE_MUTATION`.               |
| ADMIN/SUPER_ADMIN dengan permission yang tidak berscope `global` (mis. `order.confirm`) | Diperlakukan sebagai membership check; tanpa membership → `404 Place not found`.                     |
| Actor tanpa platform grant dan permission tanpa membership role (mis. USER memanggil `place.create`) | `403 Insufficient permissions` dari `PermissionsGuard`.                                 |

Source:

- `backend/src/modules/places/place-access.service.ts:38-85`
- `backend/src/common/guards/permissions.guard.ts:38-53`
- `backend/src/modules/orders/order-queries.service.ts:35-39`
- `backend/src/modules/orders/order-transitions.service.ts:79-105`
- `backend/src/modules/orders/order-transitions.service.ts:173-189`
- `backend/src/modules/places/places.service.ts:278-296`
- `backend/src/modules/places/__tests__/place-access.service.spec.ts:23-132`
- `backend/src/modules/places/__tests__/dining-tables.service.spec.ts:37-54`
- `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:193-200`
- `backend/test/order-lifecycle.e2e-spec.ts:179-235`

### `DOCUMENTED`

SRS-RBAC-012 dan SRS-RBAC-013 menetapkan respons not found untuk mencegah *tenant enumeration*, serta bahwa ADMIN/SUPER_ADMIN hanya melewati membership untuk permission berscope global dan tetap tunduk pada validasi, domain rule, target restriction, dan audit.

Source:

- `backend/docs/software-requirement-specification.md:139-140`

## 7. Role-Specific Business Rules

### `IMPLEMENTED`

| Role         | Aturan                                                                                                                                                                       | Source                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| USER         | Pembatalan order sendiri hanya dari `PENDING` (`This order cannot be cancelled by its customer`).                                                                             | `order-transitions.service.ts:58-63`                                         |
| USER         | Registrasi selalu menghasilkan platform role default; payload registrasi tidak menerima role.                                                                                | `auth.service.ts:53-67`; `auth.schema.ts:18-24`                              |
| CASHIER      | Daftar member hanya baris sendiri; daftar dan detail meja hanya yang aktif.                                                                                                  | `place-members.service.ts:24-32`; `dining-tables.service.ts:25-41`           |
| CASHIER/OWNER| Read scope order mengikuti role membership yang memberi akses (`allowedRoles: [membershipRole]`).                                                                            | `order-queries.service.ts:88-93`; `order-transitions.service.ts:207-211`     |
| OWNER        | Dapat assign/revoke CASHIER; tidak dapat assign/revoke OWNER; demosi OWNER → CASHIER memerlukan `owner.revoke` dan `cashier.assign`.                                          | `place-members.service.ts:53-66`; `place-members.service.spec.ts:51-86`      |
| ADMIN        | `user.create` hanya untuk platform role `USER`; `user.deactivate` (restricted) hanya untuk target `USER`.                                                                    | `users.service.ts:63-77`; `users.service.ts:259-268`                         |
| ADMIN/SUPER_ADMIN | Pembuat place otomatis menjadi OWNER place tersebut.                                                                                                                    | `places.service.ts:86-121`                                                   |
| SUPER_ADMIN  | Satu-satunya role dengan `platform_role.update`, `owner.assign`, `owner.revoke`; perubahan ke role yang sama dianggap idempoten tanpa write/audit.                            | `permissions.ts:124-131`; `users.service.ts:216-252`; `users.service.spec.ts:246-261` |
| SUPER_ADMIN  | SUPER_ADMIN aktif terakhir tidak dapat didemosi, dinonaktifkan, atau mengajukan penghapusan akun.                                                                            | `users.service.ts:144-150`; `users.service.ts:229-235`; `users.service.ts:268-273` |
| Semua        | User yang menjadi satu-satunya OWNER aktif suatu place tidak dapat dinonaktifkan atau mengajukan penghapusan akun.                                                           | `users.service.ts:152-156`; `users.service.ts:274-278`                       |

Source:

- `backend/src/modules/orders/order-transitions.service.ts:51-77`
- `backend/src/modules/orders/order-transitions.service.ts:207-211`
- `backend/src/modules/auth/auth.service.ts:53-67`
- `backend/src/modules/places/place-members.service.ts:24-173`
- `backend/src/modules/places/dining-tables.service.ts:25-41`
- `backend/src/modules/orders/order-queries.service.ts:88-93`
- `backend/src/modules/users/users.service.ts:63-296`
- `backend/src/modules/places/places.service.ts:86-121`
- `backend/src/modules/places/__tests__/place-members.service.spec.ts:31-110`
- `backend/src/modules/users/__tests__/users.service.spec.ts:42-407`

### `DOCUMENTED`

SRS-RBAC-014 hingga SRS-RBAC-021 mendokumentasikan aturan yang sama: hanya SUPER_ADMIN yang mengubah platform role; invariant SUPER_ADMIN dan OWNER terakhir; OWNER dan ADMIN mengelola CASHIER; hanya SUPER_ADMIN yang mengelola OWNER.

Source:

- `backend/docs/software-requirement-specification.md:141-148`

## 8. Resource Ownership Rules

### `IMPLEMENTED`

| Jenis kepemilikan   | Resource                                          | Mekanisme                                                                                                   |
| ------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Kepemilikan place   | Place dan resource place-scoped                   | Membership `OWNER` aktif (scope `owned`); tidak ada kolom owner di `Place`.                                  |
| Keanggotaan place   | Order operasional, meja (baca), place (baca)      | Membership `CASHIER` atau `OWNER` aktif (scope `member`/`owned`).                                            |
| Milik user          | Cart, order customer, review, upload intent       | Predicate `userId`/`actorUserId` = internal ID actor dari principal server-side.                            |
| Pembuat order manual| Order `MANUAL`                                    | `createdByUserId` = actor; tidak memiliki `userId` customer, sehingga tidak muncul di `me/orders` dan tidak dapat direview. |

Identitas actor selalu diambil dari principal hasil verifikasi token, bukan dari body request. `application-rules.md` menetapkan aturan ini secara eksplisit.

Source:

- `backend/src/common/auth/permissions.ts:139-177`
- `backend/src/modules/carts/carts.service.ts:31-116`
- `backend/src/modules/orders/orders.repository.ts:370-393`
- `backend/src/modules/reviews/reviews.service.ts:58-66`
- `backend/src/modules/media/media.repository.ts:85-90`
- `backend/src/modules/orders/manual-orders.service.ts:198-215`
- `backend/src/modules/auth/jwt-auth.guard.ts:36-53`
- `backend/docs/application-rules.md:7`

## 9. State Transition Rules yang Relevan

### `IMPLEMENTED`

**Status order**

```text
PENDING   -> CONFIRMED | CANCELLED   (PENDING yang lewat expiresAt hanya -> EXPIRED)
CONFIRMED -> PREPARING | CANCELLED
PREPARING -> READY     | CANCELLED
READY     -> COMPLETED | CANCELLED
COMPLETED, CANCELLED, EXPIRED -> (terminal)
```

| Target       | Permission       | Catatan                                                                                         |
| ------------ | ---------------- | ----------------------------------------------------------------------------------------------- |
| `CONFIRMED`  | `order.confirm`  | Mengisi `confirmedAt`.                                                                          |
| `PREPARING`  | `order.prepare`  |                                                                                                 |
| `READY`      | `order.ready`    |                                                                                                 |
| `COMPLETED`  | `order.complete` | Mengisi `completedAt`.                                                                          |
| `CANCELLED`  | `order.cancel`   | Alasan wajib bila status asal bukan `PENDING`; maksimal 500 karakter Unicode.                   |
| `EXPIRED`    | — (worker)       | Diterapkan oleh `OrderExpiryService` dengan actor audit `SYSTEM` (`order-expiry-worker`).       |

Update status bersifat kondisional terhadap status yang diharapkan. Bila kalah race, service mengembalikan `409 ORDER_STATUS_CHANGED`, atau `ORDER_PENDING_EXPIRED` bila order sudah kedaluwarsa. Setiap transisi diaudit sebagai `ORDER_STATUS_UPDATED`.

Source:

- `backend/src/modules/orders/order-transition.ts:25-75`
- `backend/src/modules/orders/order-transitions.service.ts:107-205`
- `backend/src/modules/orders/orders.repository.ts:423-450`
- `backend/src/modules/orders/orders.repository.ts:480-500`
- `backend/src/modules/orders/order-expiry.service.ts:20-45`
- `backend/src/modules/orders/__tests__/order-transitions.service.spec.ts:70-143`
- `backend/test/order-lifecycle.e2e-spec.ts:236-354`

**Status place**

- Publish ⇒ syarat identity, OWNER aktif, dan item eligible.
- Unpublish ⇒ ordering dimatikan.
- Enable ordering ⇒ place harus terpublikasi dan ada item tersedia.
- Mutation menu dapat memicu unpublish atau pematian ordering otomatis.
- Soft delete ⇒ diblokir bila ada order yang belum terselesaikan.

Source:

- `backend/src/modules/places/places.service.ts:148-275`
- `backend/src/modules/menus/menus.service.ts:297-325`

**Status membership dan akun**

- Membership: aktif ↔ revoked (`revokedAt`); reaktivasi memakai baris yang sama.
- Akun: aktif → deletion requested (`deletionRequestedAt`) → anonymized (setelah 30 hari, oleh worker); aktif → deactivated (`deletedAt`). Status selain aktif menyebabkan principal tidak dapat di-resolve, dan membership user tersebut dikecualikan dari lookup membership aktif.

Source:

- `backend/src/modules/places/places.repository.ts:299-371`
- `backend/src/modules/users/users.service.ts:134-195`
- `backend/src/modules/auth/auth-principal.service.ts:11-28`
- `backend/src/modules/data-lifecycle/data-lifecycle.repository.ts:36-123`

## 10. Validation dan Authorization Rules

### `IMPLEMENTED`

| Aturan                                                                                                                                                       | Evidence                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Body, param, dan query divalidasi Zod melalui decorator lokal; schema registrasi `.strict()`.                                                                | `order-access.controller.ts:135-139`; `auth.schema.ts:18-24`                                  |
| Status order operasional divalidasi dengan discriminated union; `cancellationReason` hanya diterima untuk `CANCELLED`. Customer hanya dapat mengirim `CANCELLED`. | `orders.schema.ts:145-175`                                                                    |
| Permission dan role yang tidak dikenal menghasilkan penolakan.                                                                                               | `permissions.ts:213-251`; `permissions.spec.ts:382-397`                                       |
| `@RequireAnyPermission` dipakai bila permission spesifik bergantung pada input (role target membership, status order); permission spesifik diputuskan ulang di service. | `place-members.controller.ts:37-49`; `order-access.controller.ts:127-134`; `order-transitions.service.ts:196-205` |
| Mutation yang sensitif terhadap authorization dijalankan dalam serializable transaction, dengan pemeriksaan akses memakai transaction client yang sama.       | `place-members.service.ts:40-46`; `order-transitions.service.ts:85-89`; `places.service.ts:127-132` |
| Penolakan authorization dicatat ke logger (`authorization.denied`) dan metrik `authorization_denials_total`.                                                 | `permissions.guard.ts:44-52`                                                                  |
| Kode error domain dikembalikan dalam respons conflict (`ORDER_STATUS_TRANSITION_INVALID`, `REVIEW_ORDER_NOT_COMPLETED`, `PLACE_CLOSED`, dll.).                 | `order-transitions.service.ts:213-235`; `reviews.service.ts:66-77`; `orders.service.ts:144-150` |

Source:

- `backend/src/modules/orders/order-access.controller.ts:127-139`
- `backend/src/modules/auth/auth.schema.ts:18-24`
- `backend/src/modules/orders/orders.schema.ts:145-175`
- `backend/src/common/auth/permissions.ts:213-251`
- `backend/src/common/auth/__tests__/permissions.spec.ts:382-397`
- `backend/src/modules/places/place-members.controller.ts:37-49`
- `backend/src/modules/orders/order-transitions.service.ts:85-89`
- `backend/src/modules/orders/order-transitions.service.ts:196-235`
- `backend/src/modules/places/place-members.service.ts:40-46`
- `backend/src/modules/places/places.service.ts:127-132`
- `backend/src/common/guards/permissions.guard.ts:44-52`
- `backend/src/modules/reviews/reviews.service.ts:66-77`
- `backend/src/modules/orders/orders.service.ts:144-150`

### `DOCUMENTED`

SRS-DATA-008 mensyaratkan validasi aplikasi tetap ada meskipun database memiliki CHECK constraint. SRS-AUTHZ-013 menyatakan permission check frontend hanya mengatur visibilitas dan navigasi.

Source:

- `backend/docs/software-requirement-specification.md:506`
- `backend/docs/software-requirement-specification.md:169`

## 11. Important Edge Cases

### `IMPLEMENTED`

| No | Edge case                                                                                                                                                                                                                                                         | Source                                                                                                    |
| -- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1  | `PermissionsGuard` dapat meloloskan USER tanpa membership pada endpoint place yang permission-nya dimiliki place role (mis. `order.confirm`). Penolakan terjadi kemudian di `PlaceAccessService` sebagai `404`. Guard juga meloloskan endpoint terautentikasi tanpa metadata permission. | `permissions.ts:301-310`; `permissions.guard.ts:33`; `permissions.guard.spec.ts:63-78`                   |
| 2  | ADMIN tanpa membership tidak dapat confirm/prepare/ready/complete order karena tidak ada grant platform untuk permission tersebut, tetapi dapat membatalkan order place mana pun melalui `order.cancel` global.                                                    | `permissions.ts:96-122`; `order-transitions.service.ts:196-205`                                           |
| 3  | Pada `PATCH me/orders/:orderId/status`, pembatasan "hanya `PENDING`" dilewati bila actor memiliki `order.cancel` global. ADMIN/SUPER_ADMIN yang membatalkan order miliknya sendiri dapat membatalkan setelah `PENDING`, dengan alasan pembatalan wajib.             | `order-transitions.service.ts:58-63`; `order-transition.ts:59-66`                                         |
| 4  | `GET orders` (global) ditolak `403` untuk USER walaupun USER memiliki `order.read` (`own`), karena service mensyaratkan scope global.                                                                                                                              | `order-queries.service.ts:95-99`; `order-lifecycle.e2e-spec.ts:227-231`                                   |
| 5  | User biasa tidak dapat membuat place (`place.create` hanya global). OWNER awal sebuah place adalah ADMIN/SUPER_ADMIN pembuatnya; penambahan OWNER lain memerlukan SUPER_ADMIN (`owner.assign`).                                                                 | `permissions.ts:102`; `permissions.ts:127`; `places.service.ts:86-121`                                    |
| 6  | Cart dapat diisi untuk place yang tidak terhapus walaupun belum terpublikasi atau ordering mati. Syarat publish, ordering, dan jam buka baru diperiksa saat checkout.                                                                                              | `carts.repository.ts:47-63`; `orders.service.ts:142-150`                                                  |
| 7  | Manual order dibuat langsung `CONFIRMED` dan `verificationDisabledAt` diisi, sehingga token verifikasinya tidak dapat dipakai di endpoint publik; karena `userId` kosong, order manual tidak dapat direview.                                                       | `manual-orders.service.ts:198-215`; `orders.repository.ts:452-470`; `reviews.service.ts:64-65`            |
| 8  | Penyelesaian upload intent memeriksa ulang akses place dan target, sehingga revocation membership di antara pembuatan dan penyelesaian intent berlaku.                                                                                                            | `media.service.ts:150-170`                                                                                |
| 9  | Moderasi review memeriksa ulang permission global dari principal yang dikunci di dalam transaksi; test mencakup administrator yang didemosi sebelum moderasi.                                                                                                     | `reviews.service.ts:296-306`; `reviews.service.spec.ts:218-225`                                           |
| 10 | Order `PENDING` yang sudah lewat `expiresAt` tetapi belum dimaterialisasi worker tetap ditolak untuk transisi lain (`ORDER_PENDING_EXPIRED`).                                                                                                                     | `order-transition.ts:45-53`; `order-transitions.service.spec.ts:119-129`; `order-lifecycle.e2e-spec.ts:318-333` |
| 11 | Dua revocation OWNER bersamaan pada place yang sama menghasilkan satu sukses dan satu `409`.                                                                                                                                                                      | `auth-users.e2e-spec.ts:448-460`                                                                          |
| 12 | Review place yang pernah di-soft-delete dipulihkan dan diperbarui, bukan dibuat ulang, karena unique `orderId`.                                                                                                                                                   | `reviews.service.ts:80-91`; `reviews.service.spec.ts:147-159`                                             |
| 13 | Upload intent untuk `MENU_CATEGORY_THUMBNAIL` diproses di service, tetapi CHECK `media_upload_intents_target_check` di migration tidak memuat target tersebut (lihat `02_perancangan_basis_data.md` §6.2). Perilaku runtime tidak diverifikasi.                    | `media.service.ts:307-313`; `migrations/20260914190000_add_media_upload_intents/migration.sql:22-25`      |

Source:

- `backend/src/common/auth/permissions.ts:96-131`
- `backend/src/common/auth/permissions.ts:301-310`
- `backend/src/common/guards/permissions.guard.ts:33`
- `backend/src/common/guards/__tests__/permissions.guard.spec.ts:63-78`
- `backend/src/modules/orders/order-transitions.service.ts:58-63`
- `backend/src/modules/orders/order-transitions.service.ts:196-205`
- `backend/src/modules/orders/order-transition.ts:45-66`
- `backend/src/modules/orders/order-queries.service.ts:95-99`
- `backend/src/modules/places/places.service.ts:86-121`
- `backend/src/modules/carts/carts.repository.ts:47-63`
- `backend/src/modules/orders/orders.service.ts:142-150`
- `backend/src/modules/orders/manual-orders.service.ts:198-215`
- `backend/src/modules/orders/orders.repository.ts:452-470`
- `backend/src/modules/media/media.service.ts:150-170`
- `backend/src/modules/media/media.service.ts:307-313`
- `backend/src/modules/reviews/reviews.service.ts:58-99`
- `backend/src/modules/reviews/reviews.service.ts:296-306`
- `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:147-225`
- `backend/src/modules/orders/__tests__/order-transitions.service.spec.ts:119-129`
- `backend/test/order-lifecycle.e2e-spec.ts:227-333`
- `backend/test/auth-users.e2e-spec.ts:448-460`
- `backend/prisma/migrations/20260914190000_add_media_upload_intents/migration.sql:22-25`

## 12. Business Logic Evidence Summary

| Konsep                                                 | Status                               | Evidence utama                                                                          |
| ------------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------- |
| Tiga platform role dengan grant berjenjang             | `IMPLEMENTED`                        | `PLATFORM_ROLE_GRANTS`; `permissions.spec.ts`.                                          |
| Dua place role dengan scope `member`/`owned`           | `IMPLEMENTED`                        | `PLACE_MEMBER_ROLE_GRANTS`.                                                             |
| Coarse admission terpisah dari target-place check      | `IMPLEMENTED`                        | `canAttemptPermission`; `PlaceAccessService`.                                           |
| Global grant sebagai pengganti membership              | `IMPLEMENTED`                        | `resolveScope`; audit `ADMIN_CROSS_PLACE_MUTATION`.                                     |
| Cross-tenant → `404`                                   | `IMPLEMENTED`                        | `assertPermission`; test service dan E2E.                                               |
| Pembatasan data CASHIER (member list, active tables)   | `IMPLEMENTED`                        | `place-members.service.ts`; `dining-tables.service.ts`.                                 |
| OWNER tidak mengelola OWNER                            | `IMPLEMENTED`                        | Grant map; `place-members.service.ts`.                                                  |
| Invariant last OWNER / last SUPER_ADMIN / sole owner   | `IMPLEMENTED`                        | Service dalam serializable transaction; unit dan E2E test.                              |
| Restricted `user.deactivate` dan `user.create` ADMIN   | `IMPLEMENTED`                        | `users.service.ts`.                                                                     |
| State machine order dengan permission per transisi     | `IMPLEMENTED`                        | `order-transition.ts`; `order-transitions.service.ts`.                                  |
| Publish/ordering readiness                             | `IMPLEMENTED`                        | `places.service.ts`; `menus.service.ts`.                                                |
| Review hanya dari order sendiri yang `COMPLETED`       | `IMPLEMENTED`                        | `reviews.service.ts`.                                                                   |
| `order.create_manual` di matriks SRS                   | `DOCUMENTATION / IMPLEMENTATION GAP` | Ada di kode dan SRS-ORD-024; tidak ada di matriks §4.3.                                 |
| `user.create` di dokumentasi                           | `DOCUMENTATION / IMPLEMENTATION GAP` | Ada di kode; tidak ditemukan di SRS maupun API specification.                           |
| Syarat publish (timezone vs tipe)                      | `DOCUMENTATION / IMPLEMENTATION GAP` | Rules menyebut tipe; kode memeriksa timezone.                                           |
| Permission dinamis atau dikelola melalui endpoint      | `NOT FOUND IN REPOSITORY`            | Tidak ada endpoint pengelolaan role/permission.                                         |

Source:

- `backend/src/common/auth/permissions.ts:83-310`
- `backend/src/modules/places/place-access.service.ts:38-85`
- `backend/src/modules/places/place-members.service.ts:24-173`
- `backend/src/modules/users/users.service.ts:63-296`
- `backend/src/modules/orders/order-transition.ts:25-75`
- `backend/docs/software-requirement-specification.md:180-250`
- `backend/docs/authorization-data-model-reconciliation.md:78`

## 13. Repository Traceability

### Permission dan authorization core

- `backend/src/common/auth/permissions.ts:9-50` — permission identifier.
- `backend/src/common/auth/permissions.ts:55-177` — scope dan grant map.
- `backend/src/common/auth/permissions.ts:213-331` — resolusi, default deny, coarse admission.
- `backend/src/common/guards/permissions.guard.ts:24-55` — endpoint admission dan logging penolakan.
- `backend/src/modules/places/place-access.service.ts:38-85` — global vs membership scope.

### Controller (permission per endpoint)

- `backend/src/modules/places/places.controller.ts:32-129`
- `backend/src/modules/places/place-members.controller.ts:23-57`
- `backend/src/modules/places/business-hours.controller.ts:16-31`
- `backend/src/modules/places/dining-tables.controller.ts:18-65`
- `backend/src/modules/menus/menus.controller.ts:38-170`
- `backend/src/modules/orders/orders.controller.ts:32-93`
- `backend/src/modules/orders/order-access.controller.ts:54-209`
- `backend/src/modules/carts/carts.controller.ts:19-60`
- `backend/src/modules/reviews/reviews.controller.ts:36-227`
- `backend/src/modules/media/media.controller.ts:25-100`
- `backend/src/modules/users/users.controller.ts:21-100`

### Service (business rule)

- `backend/src/modules/places/places.service.ts:50-296` — place lifecycle, publish, ordering, audit global.
- `backend/src/modules/places/place-members.service.ts:24-173` — membership assignment/revocation.
- `backend/src/modules/places/dining-tables.service.ts:25-160` — meja dan pembatasan CASHIER.
- `backend/src/modules/places/business-hours.service.ts:29-75` — jam operasional.
- `backend/src/modules/menus/menus.service.ts:36-345` — menu dan rekonsiliasi status place.
- `backend/src/modules/carts/carts.service.ts:31-189` — cart per user per place.
- `backend/src/modules/orders/orders.service.ts:52-312` — checkout.
- `backend/src/modules/orders/manual-orders.service.ts:41-215` — manual order.
- `backend/src/modules/orders/order-queries.service.ts:31-99` — scope baca order.
- `backend/src/modules/orders/order-transitions.service.ts:51-260` — transisi status.
- `backend/src/modules/orders/order-transition.ts:25-75` — state machine.
- `backend/src/modules/orders/order-verification.service.ts:7-41` — verifikasi publik.
- `backend/src/modules/orders/order-expiry.service.ts:20-45` — expiry worker.
- `backend/src/modules/reviews/reviews.service.ts:58-340` — review dan moderasi.
- `backend/src/modules/media/media.service.ts:54-325` — upload intent dan target check.
- `backend/src/modules/users/users.service.ts:63-296` — administrasi user dan invariant.
- `backend/src/modules/auth/auth.service.ts:53-67` — registrasi.

### Repository (predicate)

- `backend/src/modules/places/places.repository.ts:251-371`
- `backend/src/modules/menus/menus.repository.ts:56-170`
- `backend/src/modules/carts/carts.repository.ts:47-63`
- `backend/src/modules/orders/orders.repository.ts:370-541`
- `backend/src/modules/media/media.repository.ts:85-90`
- `backend/src/modules/reviews/reviews.repository.ts:115-124`

### Dokumentasi pembanding

- `backend/docs/software-requirement-specification.md:117-250` — actor, RBAC, permission model, matriks.
- `backend/docs/software-requirement-specification.md:751-752` — manual order.
- `backend/docs/application-rules.md:7-187` — aturan aplikasi.
- `backend/docs/api-specification/orders.md:35` — manual order permission.

### Test yang memuat skenario terkait

- `backend/src/common/auth/__tests__/permissions.spec.ts:28-397`
- `backend/src/common/guards/__tests__/permissions.guard.spec.ts:63-78`
- `backend/src/modules/places/__tests__/place-access.service.spec.ts:23-132`
- `backend/src/modules/places/__tests__/place-members.service.spec.ts:31-110`
- `backend/src/modules/places/__tests__/dining-tables.service.spec.ts:20-54`
- `backend/src/modules/places/__tests__/places.service.spec.ts:11-110`
- `backend/src/modules/users/__tests__/users.service.spec.ts:42-407`
- `backend/src/modules/orders/__tests__/order-transitions.service.spec.ts:70-143`
- `backend/src/modules/orders/__tests__/manual-orders.service.spec.ts:100-140`
- `backend/src/modules/reviews/__tests__/reviews.service.spec.ts:68-225`
- `backend/test/order-lifecycle.e2e-spec.ts:179-354`
- `backend/test/auth-users.e2e-spec.ts:255-520`

Catatan: file test di atas membuktikan bahwa skenario tersedia di repository. Dokumen ini tidak mengklaim hasil eksekusi test; pencatatan hasil pengujian termasuk ruang lingkup `04_skenario_dan_hasil_pengujian.md`.
