# Repository Research Data Extraction — Tooang

## Context

Saya sedang mempersiapkan Karya Ilmiah dengan judul:

> **TOOANG – PLATFORM MENU MAKANAN DIGITAL BERBASIS WEB DENGAN ROLE-BASED ACCESS CONTROL (RBAC)**

Tujuan tahap ini **bukan menulis karya ilmiah**, melainkan mengekstrak fakta teknis dan implementasi dari repository Tooang ke dalam 4 dokumen Markdown yang nantinya akan digunakan sebagai _research material_.

Fokus penelitian adalah:

1. Tooang sebagai platform menu makanan digital berbasis web.
2. Implementasi **Role-Based Access Control (RBAC)**.
3. Arsitektur **multi-tenant / place-scoped access**.
4. Mekanisme **authorization dan tenant isolation**.
5. Pengujian terhadap mekanisme tersebut.

Digital menu adalah domain aplikasi. RBAC merupakan fokus utama penelitian. Multi-tenancy merupakan karakteristik arsitektur penting yang mendukung platform tersebut.

---

# TUJUAN UTAMA

Lakukan analisis terhadap seluruh repository project secara sistematis, kemudian hasilkan tepat **4 file Markdown** berikut:

```text
01_arsitektur_dan_teknologi.md
02_perancangan_basis_data.md
03_fitur_dan_logika_bisnis.md
04_skenario_dan_hasil_pengujian.md
```

Keempat file harus berisi **fakta yang dapat dibuktikan dari repository**, bukan interpretasi bebas atau informasi yang dibuat berdasarkan asumsi.

Dokumen tersebut akan menjadi sumber data untuk penulisan karya ilmiah pada tahap berikutnya.

---

# ATURAN UMUM EKSTRAKSI

## 1. Repository adalah single source of truth

Gunakan seluruh sumber yang tersedia di repository, termasuk bila relevan:

- source code
- README
- documentation
- PRD
- SRS
- API specification
- database schema
- Prisma schema
- migration
- test files
- configuration
- route/controller
- guard/middleware
- service
- repository/data-access layer
- DTO/schema/validation
- frontend implementation
- backend implementation
- deployment/configuration files

Jangan hanya membaca dokumentasi. **Verifikasi dokumentasi terhadap implementasi aktual jika memungkinkan.**

---

## 2. Jangan mengarang informasi

Jangan membuat:

- alasan desain yang tidak tertulis atau tidak dapat disimpulkan secara kuat dari implementasi;
- tujuan fitur yang tidak didukung repository;
- klaim keamanan;
- klaim performa;
- klaim scalability;
- klaim novelty;
- klaim bahwa suatu pendekatan adalah "terbaik";
- klaim bahwa sistem "aman";
- klaim bahwa Tooang adalah "yang pertama";
- angka hasil pengujian yang tidak ditemukan;
- test result yang tidak benar-benar tersedia.

Jika informasi tidak ditemukan, tulis secara eksplisit:

> **NOT FOUND IN REPOSITORY**

Jika implementasi dan dokumentasi berbeda, jangan memilih salah satunya secara diam-diam. Catat perbedaannya.

---

## 3. Source traceability wajib

Setiap fakta teknis penting harus memiliki sumber yang dapat ditelusuri.

Gunakan format:

```text
Source:
- `path/to/file.ts:10-35`
```

Untuk dokumentasi:

```text
Source:
- `docs/SRS.md:75-115`
```

Untuk kode:

```text
Source:
- `src/modules/auth/guards/authorization.guard.ts:20-78`
```

Jika suatu informasi berasal dari beberapa file, cantumkan semua sumber yang relevan.

Tujuan traceability ini adalah agar pada tahap penulisan karya ilmiah setiap pernyataan teknis dapat diverifikasi kembali ke repository.

---

## 4. Bedakan tiga jenis informasi

Gunakan label berikut jika diperlukan:

### `IMPLEMENTED`

Fitur benar-benar ditemukan dalam source code dan/atau konfigurasi.

### `DOCUMENTED`

Informasi ditemukan dalam dokumentasi tetapi implementasi tidak dapat diverifikasi.

### `NOT FOUND IN REPOSITORY`

Informasi tidak ditemukan.

Jika dokumentasi menyatakan sesuatu tetapi implementasinya berbeda, gunakan:

### `DOCUMENTATION / IMPLEMENTATION GAP`

dan jelaskan keduanya.

---

## 5. Jangan mengubah hasil ekstraksi menjadi paper

Jangan menulis:

- abstrak;
- pendahuluan;
- research gap;
- kesimpulan penelitian;
- klaim kontribusi ilmiah;
- klaim novelty;
- literature review.

Dokumen ini adalah **research evidence**, bukan naskah jurnal.

---

# FILE 01 — `docs/01_arsitektur_dan_teknologi.md`

## Tujuan

Mendokumentasikan arsitektur dan teknologi Tooang yang relevan untuk menjelaskan bagaimana platform digital menu dibangun, khususnya bagaimana **RBAC, authorization, multi-tenancy, dan tenant isolation** diimplementasikan.

## Struktur wajib

```markdown
# Arsitektur dan Teknologi

## 1. Ringkasan Arsitektur

## 2. Technology Stack

### 2.1 Frontend

### 2.2 Backend

### 2.3 Database

### 2.4 Authentication

### 2.5 Authorization

### 2.6 Infrastructure / Deployment

## 3. Arsitektur Aplikasi

### 3.1 Frontend Architecture

### 3.2 Backend Architecture

### 3.3 API Architecture

### 3.4 Data Access Architecture

## 4. Authorization Architecture

### 4.1 Platform Roles

### 4.2 Place/Tenant Roles

### 4.3 Permission Model

### 4.4 Authorization Flow

### 4.5 Resource Scope

## 5. Multi-Tenant Architecture

### 5.1 Tenant Representation

### 5.2 Tenant Identification

### 5.3 Tenant-Scoped Resources

### 5.4 Tenant Isolation

### 5.5 Cross-Tenant Access Prevention

## 6. Authentication and Session Architecture

## 7. Security-Relevant Architecture

## 8. Request-to-Database Flow

## 9. Architecture Evidence Summary

## 10. Repository Traceability
```

## Fokus khusus

Cari implementasi konkret untuk:

- platform role;
- place/tenant role;
- membership;
- permission;
- guard;
- middleware;
- decorator;
- authorization service;
- policy;
- resource ownership;
- tenant context;
- place ID propagation;
- authorization checks;
- database filtering;
- cross-tenant rejection;
- authentication/session/token flow.

Jika ada konsep:

```text
Platform Role
+
Place Membership
+
Place Role
+
Permission
+
Resource Scope
```

jelaskan secara eksplisit bagaimana masing-masing komponen bekerja berdasarkan implementasi aktual.

## Jangan lakukan

Jangan menjelaskan seluruh library yang tidak relevan terhadap penelitian.

Contoh:

Jika project menggunakan library UI yang tidak memiliki hubungan dengan RBAC, cukup dicatat secara ringkas dalam technology stack atau diabaikan jika tidak relevan.

---

# FILE 02 — `docs/02_perancangan_basis_data.md`

## Tujuan

Mendokumentasikan desain basis data yang relevan dengan:

- user;
- role;
- permission;
- membership;
- place/tenant;
- tenant-scoped resource;
- hubungan antarentitas;
- integritas dan isolasi data.

Dokumen tidak perlu mendeskripsikan seluruh database secara mendalam apabila entity tersebut tidak relevan terhadap fokus penelitian.

## Struktur wajib

```markdown
# Perancangan Basis Data

## 1. Ringkasan Database

## 2. Entitas Utama

### 2.1 User

### 2.2 Place / Tenant

### 2.3 Membership

### 2.4 Role

### 2.5 Permission

### 2.6 Tenant-Scoped Resources

## 3. Relasi Antarentitas

## 4. Model Role dan Membership

## 5. Model Multi-Tenancy

### 5.1 Tenant Boundary

### 5.2 Tenant Ownership

### 5.3 Tenant-Scoped Data

### 5.4 Cross-Tenant Data Isolation

## 6. Database Constraints

## 7. Indexing yang Relevan

## 8. Data Integrity yang Relevan

## 9. Entity/Relationship Diagram Description

## 10. Evidence Summary

## 11. Repository Traceability
```

## Untuk setiap entity penting, dokumentasikan

Jika tersedia:

- nama entity/table;
- primary key;
- foreign key;
- atribut penting;
- enum;
- relationship;
- cardinality;
- unique constraint;
- index;
- cascade behavior;
- nullable/non-nullable;
- tenant reference;
- ownership relationship.

Gunakan tabel bila membuat informasi lebih mudah dibandingkan paragraf.

## Fokus utama

Harus dapat menjawab:

> Bagaimana database Tooang merepresentasikan hubungan user, membership, role, place/tenant, dan resource sehingga authorization dan tenant isolation dapat diterapkan?

Jangan menyatakan bahwa database "menjamin keamanan" kecuali repository benar-benar memberikan mekanisme yang mendukung klaim tersebut.

---

# FILE 03 — `docs/03_fitur_dan_logika_bisnis.md`

## Tujuan

Mendokumentasikan fitur dan business rules Tooang yang relevan untuk menunjukkan bagaimana RBAC dan multi-tenancy diterapkan pada domain digital menu.

Jangan membuat katalog seluruh fitur secara detail.

Prioritaskan fitur yang memiliki hubungan dengan:

- authentication;
- authorization;
- role;
- permission;
- tenant;
- place;
- resource ownership;
- tenant isolation;
- menu management;
- order management;
- customer access;
- administrative access.

## Struktur wajib

```markdown
# Fitur dan Logika Bisnis

## 1. Actor dan Role

### 1.1 Platform Actors

### 1.2 Tenant/Place Actors

### 1.3 Public/Customer Actor

## 2. Authorization Model

## 3. Permission Model

## 4. Tenant-Scoped Operations

### 4.1 Place Management

### 4.2 Menu Management

### 4.3 Business Hours

### 4.4 Dining Tables

### 4.5 Orders

### 4.6 Reviews

### 4.7 Other Relevant Resources

## 5. Tenant Isolation Rules

## 6. Cross-Tenant Access Rules

## 7. Role-Specific Business Rules

## 8. Resource Ownership Rules

## 9. State Transition Rules yang Relevan

## 10. Validation dan Authorization Rules

## 11. Important Edge Cases

## 12. Business Logic Evidence Summary

## 13. Repository Traceability
```

## Untuk setiap role

Dokumentasikan:

```text
Role
Purpose/Scope
Allowed Operations
Denied Operations
Applicable Tenant
Applicable Resources
Source
```

Jangan menyimpulkan permission hanya dari nama role.

Verifikasi dari:

- permission constants;
- guards;
- authorization checks;
- controller;
- service;
- test;
- dokumentasi.

---

# FILE 04 — `docs/04_skenario_dan_hasil_pengujian.md`

## Tujuan

Mengekstrak seluruh evidence pengujian yang relevan terhadap:

- authentication;
- authorization;
- RBAC;
- permission;
- tenant isolation;
- cross-tenant access;
- resource ownership;
- critical business rules.

## Struktur wajib

```markdown
# Skenario dan Hasil Pengujian

## 1. Testing Strategy

## 2. Testing Tools dan Framework

## 3. Test Categories

### 3.1 Unit Testing

### 3.2 Integration Testing

### 3.3 End-to-End Testing

### 3.4 Other Testing

## 4. Authentication Test Scenarios

## 5. RBAC Test Scenarios

### 5.1 Platform Role Authorization

### 5.2 Tenant Role Authorization

### 5.3 Permission Authorization

### 5.4 Unauthorized Access

## 6. Multi-Tenant Test Scenarios

### 6.1 Same-Tenant Access

### 6.2 Cross-Tenant Access

### 6.3 Tenant Resource Ownership

### 6.4 Cross-Tenant Modification Attempts

## 7. Critical Business Rule Tests

## 8. Test Results

## 9. Quantitative Test Summary

## 10. Failed Tests / Known Issues

## 11. Testing Limitations

## 12. Evidence Summary

## 13. Repository Traceability
```

## Test case extraction

Jika memungkinkan gunakan format:

| ID  | Scenario | Actor/Role | Tenant | Expected | Actual | Result | Source |
| --- | -------- | ---------- | ------ | -------- | ------ | ------ | ------ |

Jangan mengubah hasil test.

Jika test hanya menunjukkan assertion tanpa dokumentasi hasil eksekusi, jelaskan bahwa repository menyediakan **test specification**, bukan necessarily bukti bahwa test telah dieksekusi pada kondisi tertentu.

Bedakan:

```text
Test Exists
```

dengan:

```text
Test Executed Successfully
```

Jangan menganggap keberadaan file test sebagai bukti test berhasil.

---

# CROSS-DOCUMENT REQUIREMENTS

Keempat dokumen harus konsisten.

Jika `01_arsitektur_dan_teknologi.md` menyebut:

```text
OWNER
CASHIER
```

maka penggunaan istilah tersebut di dokumen lain harus konsisten dengan repository.

Jangan menggunakan:

- tenant;
- organization;
- restaurant;
- store;
- merchant;

secara bergantian jika repository menggunakan istilah `Place`.

Jika istilah "tenant" merupakan interpretasi arsitektural terhadap `Place`, jelaskan:

> Dalam konteks penelitian ini, `Place` diperlakukan sebagai tenant berdasarkan struktur membership dan resource scoping yang ditemukan dalam repository.

Tetapi hanya gunakan pernyataan tersebut jika struktur implementasinya memang mendukung interpretasi tersebut.

---

# RESEARCH FOCUS CHECK

Sebelum menyelesaikan ekstraksi, pastikan hasil analisis dapat menjawab pertanyaan berikut berdasarkan repository:

### Architecture

1. Bagaimana Tooang mengimplementasikan authentication?
2. Bagaimana Tooang menentukan role pengguna?
3. Bagaimana platform-level role berbeda dari place-level role?
4. Bagaimana permission ditentukan?
5. Di mana authorization dilakukan?
6. Bagaimana tenant/place context ditentukan?
7. Bagaimana tenant isolation diterapkan?

### Database

8. Bagaimana User terhubung dengan Place?
9. Bagaimana Membership menyimpan role?
10. Bagaimana resource dikaitkan dengan Place?
11. Apa database constraint yang membantu menjaga isolation?

### Business Logic

12. Apa yang dapat dilakukan masing-masing role?
13. Operasi apa yang harus ditolak?
14. Bagaimana sistem menangani akses terhadap resource tenant lain?
15. Bagaimana authorization diterapkan pada resource yang berbeda?

### Testing

16. Apakah RBAC diuji?
17. Apakah permission boundary diuji?
18. Apakah cross-tenant access diuji?
19. Apakah resource ownership diuji?
20. Apa hasil test tersebut?
21. Apakah tersedia evidence kuantitatif?

Jika salah satu pertanyaan tidak dapat dijawab dari repository, tuliskan:

> **NOT FOUND IN REPOSITORY**

---

# OUTPUT QUALITY REQUIREMENTS

Setelah analisis selesai:

1. Pastikan tepat 4 file dibuat.
2. Jangan membuat file tambahan.
3. Jangan mengubah source code.
4. Jangan mengubah konfigurasi project.
5. Jangan mengubah database.
6. Jangan membuat test baru hanya untuk memenuhi laporan.
7. Jangan menjalankan destructive command.
8. Jangan mengarang hasil test.
9. Jangan membuat klaim novelty.
10. Jangan melakukan literature review pada tahap ini.

## Evidence hierarchy

Jika terdapat konflik informasi, prioritaskan:

```text
Actual implementation
        ↓
Automated tests
        ↓
Database schema / migrations
        ↓
API specification
        ↓
SRS / PRD
        ↓
README / general documentation
```

Namun **jangan menghapus informasi dokumentasi yang berbeda**. Catat discrepancy tersebut.

---

# FINAL SELF-REVIEW

Sebelum selesai, lakukan review terhadap keempat dokumen:

### Completeness

Apakah seluruh implementasi RBAC dan multi-tenant yang relevan sudah ditemukan?

### Accuracy

Apakah setiap klaim teknis dapat ditelusuri ke repository?

### Consistency

Apakah istilah, role, permission, tenant, dan resource konsisten?

### Evidence

Apakah setiap hasil testing memiliki source?

### Research Relevance

Apakah informasi yang dikumpulkan relevan dengan judul:

> **TOOANG – PLATFORM MENU MAKANAN DIGITAL BERBASIS WEB DENGAN ROLE-BASED ACCESS CONTROL (RBAC)**

### Scope Control

Pastikan dokumen **tidak berubah menjadi dokumentasi lengkap seluruh sistem**.

Prioritaskan:

> **Digital Menu Platform → Multi-Tenant Architecture → RBAC → Authorization → Tenant Isolation → Testing**

daripada mendokumentasikan setiap fitur Tooang.

---

# FINAL RESPONSE

Setelah keempat file selesai, berikan ringkasan singkat yang berisi:

1. File yang berhasil dibuat.
2. Temuan utama terkait RBAC.
3. Temuan utama terkait multi-tenancy.
4. Temuan utama terkait tenant isolation.
5. Pengujian yang tersedia.
6. Informasi penting yang tidak ditemukan.
7. Documentation/implementation gap jika ada.
8. Bagian yang masih membutuhkan informasi eksternal.

Jangan menulis karya ilmiah pada tahap ini.
