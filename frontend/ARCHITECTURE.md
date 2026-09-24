# Arsitektur Frontend Tooang

Dokumen ini menjelaskan implementasi frontend Tooang yang berjalan saat ini. Backend dalam repository yang sama adalah sumber kebenaran untuk kontrak HTTP, invariants domain, dan otorisasi resource.

## 1. Ringkasan

Frontend dibangun dengan React 19, TypeScript, Vite, TanStack Router, TanStack Query, TanStack Form, Zod, CASL, Axios, Tailwind CSS v4, Radix UI, dan Vitest.

Prinsip utamanya:

- kode domain dikelompokkan secara feature-oriented;
- route menyusun halaman, layout, dan guard, sedangkan feature menangani UI dan use case domain;
- TanStack Query menjadi sumber kebenaran server state;
- semua request backend melewati service feature dan shared JWT transport;
- permission yang dikirim backend membentuk kemampuan CASL dan visibilitas UI;
- backend tetap menjadi boundary otorisasi final;
- loading, empty, error, mutation feedback, dan recovery memakai komponen bersama.

## 2. Struktur dan Aliran Dependensi

```text
src/
  components/       shared UI, form, layout, dan application states
  configs/          environment, API, auth, dan dashboard navigation
  features/         domain components, query, mutation, schema, service, type
  integrations/     adapter TanStack Query dan integrasi eksternal
  routes/           file-based routes, layout, guard, dan route composition
  types/            tipe dan enum lintas feature
  utils/            context, hook, auth helpers, serta normalisasi API/error
  main.tsx           bootstrap provider dan router
  router.ts          router context
  routeTree.gen.ts   route tree yang digenerate; jangan diedit manual
  styles.css         semantic design tokens dan global styles
```

Aliran utama sebuah management feature adalah:

```text
TanStack route
  -> feature page/component
  -> query options atau mutation hook
  -> feature service
  -> shared api/JwtService
  -> backend /api/v1
```

Component dan route tidak memanggil Axios atau backend secara langsung. Pengecualian yang disengaja adalah `features/media/integrations/imagekit-upload.ts`, yang mengunggah file ke URL provider ImageKit dari upload intent backend. Pembuatan dan penyelesaian upload intent tetap melalui service API Tooang.

Feature yang telah diimplementasikan mencakup auth, places, place members, business hours, dining tables, menu categories, menu items, media, orders, reviews, dan users. Setiap feature menyimpan artefak domainnya sendiri di subfolder `components`, `queries`, `schemas`, `services`, dan `types` sesuai kebutuhan.

## 3. Bootstrap dan Provider

`main.tsx` memasang provider dengan urutan berikut:

```text
StrictMode
  -> ThemeProvider
  -> TanstackQueryProvider
  -> AuthContextProvider
  -> AppAbilityProvider
  -> AppRouter
```

`AuthContextProvider` membutuhkan query client untuk auth-session cache. `AppAbilityProvider` kemudian membangun ability dari authenticated user. `AppRouter` menunggu bootstrap autentikasi selesai, memasukkan `queryClient`, auth state, dan ability ke router context, lalu meng-invalidasi router ketika user atau status autentikasi berubah agar guard dievaluasi ulang.

Root route memasang tooltip, route loading indicator, toaster, serta devtools pada development. Root `errorComponent` menampilkan application error generik, sedangkan `notFoundComponent` hanya dipakai untuk route yang benar-benar tidak ditemukan.

## 4. Routing dan Dashboard

TanStack Router menggunakan file-based routing. Route aktif meliputi landing page, login, not-found, dan dashboard berikut:

- `/dashboard` untuk overview;
- route place-scoped untuk orders, menu, dining tables, business hours, members, dan settings;
- route platform-scoped untuk places, place creation/detail, global orders, review moderation, dan users.

`routes/dashboard.tsx` adalah layout route yang mempertahankan dashboard shell, navigation, place switcher, provider, dan authenticated session ketika child outlet berubah. Setiap leaf dashboard memasang `DashboardRouteError`; error render pada satu feature mengganti outlet tersebut tanpa menjatuhkan shell. Parent dashboard dan root juga memiliki fallback dengan retry dan navigasi recovery.

Direct access diperiksa dalam `beforeLoad`:

- user tanpa sesi diarahkan ke `/login` dengan redirect lokal yang telah disanitasi;
- user terautentikasi tanpa management capability diarahkan ke landing page;
- route place/platform memeriksa permission metadata untuk scope yang sesuai;
- route yang disembunyikan karena tidak berwenang memakai not-found policy agar keberadaan resource tidak bocor.

## 5. Kontrak API `/api/v1`

`VITE_BASE_SERVER_URL` wajib berupa origin HTTP(S) tanpa path, credentials, query, atau fragment. `configs/env.ts` membentuk `${origin}/api/v1`; seluruh endpoint service harus relatif, misalnya `/me` atau `/places`. `JwtService` menolak URL absolut, protocol-relative, dan path yang kembali menambahkan `/api` agar prefix tidak terduplikasi atau boundary tidak dilewati.

Service frontend mengikuti controller backend untuk auth, users, places dan management views, publishing/ordering, members, business hours, dining tables, menus, orders, reviews, dan media. Request/response ditentukan oleh type serta Zod schema feature, kemudian envelope backend dibuka melalui shared response utilities. Error transport dinormalisasi menjadi `ApplicationError` sebelum mencapai Query atau UI.

Tidak ada endpoint atau field frontend yang boleh dianggap valid hanya karena dibutuhkan UI. Perubahan kontrak harus dimulai dari backend/controller/schema authoritative lalu diselaraskan ke service, mapper, schema, dan test frontend.

## 6. Siklus Autentikasi

Auth-session disimpan pada TanStack Query key `['auth', 'session']` dengan `staleTime` dan `gcTime` tak terbatas. `AuthContext` mengekspos state dan operasi autentikasi tanpa membuat salinan user state lain.

Bootstrap berjalan sebagai berikut:

1. Jika access token lokal tidak tersedia, client memanggil `POST /auth/refresh` menggunakan HttpOnly refresh cookie dan `withCredentials`.
2. Client memanggil `GET /me` untuk memperoleh user, platform permissions, dan place memberships authoritative.
3. Keberhasilan mengisi auth-session cache; kegagalan membersihkan access token dan menetapkan sesi lokal menjadi unauthenticated.

Login memanggil `POST /auth/login`, menyimpan access token, lalu selalu menghidrasi profil melalui `GET /me`. Registrasi tidak otomatis membuat sesi. Logout memanggil `POST /auth/logout` dan, berhasil maupun gagal, menghapus access token, menetapkan auth-session ke `null`, serta menghapus seluruh private query cache lain.

Interceptor menangani `401` dengan satu shared refresh promise sehingga request concurrent tidak membuat beberapa refresh. Login, register, dan refresh dikecualikan dari siklus refresh. Request asli diberi penanda retry dan hanya diulang sekali; `401` berikutnya atau refresh gagal akan mengekspirasi sesi satu kali sehingga tidak terjadi infinite loop.

## 7. Otorisasi dan Pemisahan Role

`GET /me` memisahkan:

- `platformRole` (`USER`, `ADMIN`, `SUPER_ADMIN`) dan `globalPermissions` untuk capability lintas platform;
- `placeMemberships`, masing-masing dengan role (`OWNER` atau `CASHIER`), `permissions`, dan `effectivePermissions` untuk satu `placeId`.

Role adalah metadata identitas atau payload operasi; role bukan sumber permission frontend. Tidak ada matriks role-to-permission lokal. `createAbilityForUser` membangun rule CASL hanya dari `globalPermissions` serta `effectivePermissions` membership, dengan condition `placeId` untuk permission place-scoped.

Dashboard entry, navigation, route access, dan action visibility membaca permission identifiers yang sama. Platform navigation memakai `globalPermissions`; place navigation dan action memakai permission membership untuk selected place. Backend tetap memvalidasi setiap operasi, termasuk invariants seperti pengelolaan OWNER terakhir.

## 8. Selected Place dan Isolasi Data

Selected place direpresentasikan oleh search parameter `placeId` dan harus cocok dengan membership user. Nilai hilang memilih membership pertama; nilai stale atau tidak dapat diakses dikanonisasi ke membership yang valid. Place switcher mengganti route search dan seluruh route place-scoped menerima `selectedPlace` dari dashboard context.

Query key place-scoped selalu menyertakan `placeId` sebelum filter atau resource id. Karena itu data place A tidak dipublikasikan di key place B ketika user berpindah context. Query list/detail dibentuk oleh factory per feature; mutation meng-invalidasi collection dan detail yang benar-benar terdampak, menghapus detail resource yang telah dihapus, dan meng-invalidasi auth-session ketika membership atau platform role dapat mengubah capability.

## 9. Application States dan Error Recovery

Shared state primitives meliputi `LoadingState`, `TableSkeleton`, `EmptyState`, `ErrorState`, `DataTable`, dan confirmation dialog. Management surfaces mengikuti aturan berikut:

- skeleton struktural hanya untuk initial load; data lama tetap terlihat saat background refetch;
- koleksi kosong dibedakan dari filtered no-results;
- kegagalan refetch dengan stale data ditampilkan sebagai warning non-destruktif;
- mutation mencegah duplicate submit, menunjukkan pending label, dan menjaga destructive confirmation tetap terbuka selama request;
- operasi berhasil memakai success toast dan destructive failure memakai safe error toast;
- `403` menawarkan navigation recovery, `404` menyatakan resource tidak tersedia, `409` meminta refresh state authoritative, dan network/5xx menawarkan retry.

`getDashboardErrorPresentation` hanya menghasilkan copy yang dikontrol aplikasi. Raw stack trace, Axios object, provider error, atau internal JavaScript error tidak dirender. Error API yang diharapkan tetap terpisah dari unexpected render error yang ditangani route boundary.

## 10. Design System

`styles.css` mendefinisikan semantic tokens light/dark untuk canvas, surface, typography, brand, feedback, controls, tables, navigation, charts, radius, elevation, dan spacing. Tailwind theme memetakan token tersebut ke utility semantic seperti `bg-background`, `text-muted-foreground`, `border-border`, dan `text-destructive`.

Shared components di `components/ui`, `components/forms`, dan `components/layouts` menjadi sumber konsistensi visual serta accessibility behavior. Feature menggunakan semantic tokens dan component variants, bukan palette warna domain atau nilai warna hard-coded.

## 11. Testing dan Quality Gates

Test Vitest berfokus pada behavior dan mencakup:

- bootstrap auth, login/logout, refresh tunggal, kegagalan refresh, dan pencegahan loop;
- permission-aware route, navigation, action visibility, serta perpindahan selected place;
- query key scoping, invalidation/refetch, dan pembersihan private cache;
- management operations berisiko tinggi beserta success, `403`, `404`, `409`, dan confirmation;
- shared loading/error/empty states dan dashboard route recovery;
- schema, service contract, mapper, dan API error normalization.

Quality gates sebelum merge:

```powershell
npm.cmd run lint
npm.cmd run check
npm.cmd run type-check
npm.cmd run test
npm.cmd run build
```

## 12. Aturan Pengembangan

Saat menambah feature:

1. Tambahkan route tipis sebagai composition dan access boundary.
2. Tempatkan UI serta use case domain di feature terkait.
3. Definisikan query-key factory yang menyusun root, list, detail, place scope, dan filter secara prediktabel.
4. Akses backend hanya melalui feature service dan shared API client.
5. Cocokkan DTO, response, enum, field, dan endpoint dengan backend authoritative.
6. Gunakan permission metadata backend untuk route, navigation, dan action; jangan membuat role-permission matrix.
7. Gunakan shared design tokens dan application-state components.
8. Tambahkan test behavior untuk success, denial, conflict, cache update, dan recovery yang relevan.

Tech debt yang masih wajar dicatat adalah monitoring/error tracking produksi, audit aksesibilitas berkala, dan evaluasi chunking ketika ukuran aplikasi bertambah. Implementasi dashboard, permission metadata, auth lifecycle tests, serta route-level error recovery bukan lagi pekerjaan yang belum tersedia.
