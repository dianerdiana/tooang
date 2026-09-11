# Aturan Service dan Transaksi Aplikasi

Dokumen ini mendefinisikan aturan bisnis yang tidak sepenuhnya dapat dijamin oleh `prisma/schema.prisma`. Semua service, controller, guard, job, dan seed harus mengikuti aturan berikut.

## 1. Prinsip umum

- Jangan menerima `userId`, role, atau identitas pemilik dari request sebagai sumber kebenaran. Ambil identitas user dari access token yang sudah diverifikasi.
- Gunakan `User.id` sebagai foreign key internal. `User.userId` hanya digunakan sebagai identifier publik bila dibutuhkan API.
- Semua pembacaan data aktif harus mengabaikan record dengan `deletedAt != null`, kecuali endpoint administratif yang memang menampilkan arsip.
- Validasi input dilakukan pada DTO dan diulang untuk invariant penting di dalam transaksi.
- Jangan memakai nilai harga, subtotal, nama menu, role, atau status yang dikirim client tanpa menghitung atau memeriksanya kembali di server.
- Operasi yang membaca lalu mengubah beberapa record terkait harus menggunakan `prisma.$transaction`.

## 2. Identitas dan RBAC

### Role user

- Setiap user aktif wajib memiliki minimal satu `UserRole`.
- Registrasi user biasa harus membuat `User` dan memasangkan role `USER` dalam satu transaksi.
- Penambahan dan penghapusan role hanya boleh dilakukan oleh `SUPER_ADMIN`.
- Role terakhir milik user tidak boleh dihapus selama user masih aktif.
- User yang menjadi `PlaceOwner` wajib memiliki role `OWNER`.
- Role `OWNER` tidak boleh dihapus selama user masih memiliki relasi `PlaceOwner`.
- Role sistem pada tabel `Role` harus di-seed dan tidak boleh dihapus melalui endpoint umum.
- Token autentikasi harus merepresentasikan seluruh role aktif user atau service harus mengambil ulang role dari database untuk operasi sensitif. Jangan bergantung pada satu role saja.

### Matriks akses

| Operasi | USER | OWNER | SUPER_ADMIN |
| --- | --- | --- | --- |
| Melihat tempat/menu yang dipublikasikan | Ya | Ya | Ya |
| Menulis review milik sendiri | Ya | Ya | Ya |
| Mengelola keranjang/pesanan sendiri | Ya | Ya | Ya |
| Mengelola tempat yang dimiliki | Tidak | Ya | Ya |
| Melihat dan memproses pesanan suatu tempat | Tidak | Hanya tempat miliknya | Ya |
| Mengelola role dan seluruh data | Tidak | Tidak | Ya |

`ADMIN` dipertahankan pada schema untuk kompatibilitas kode yang sudah ada, tetapi hak aksesnya harus ditentukan secara eksplisit sebelum digunakan. Jangan menyamakannya secara otomatis dengan `SUPER_ADMIN`.

### Pemeriksaan kepemilikan

- Untuk operasi OWNER, query mutasi harus menyertakan pembatas `placeId` yang terhubung ke `PlaceOwner.userId = authenticatedUser.id`.
- Jangan hanya melakukan pemeriksaan role `OWNER`; selalu periksa kepemilikan tempat target.
- Entity turunan—jam operasional, kategori, menu, review administratif, keranjang, dan pesanan—harus ditelusuri ke `Place.id` sebelum dimutasi.
- `SUPER_ADMIN` boleh melewati pemeriksaan kepemilikan, tetapi tetap tunduk pada validasi bisnis dan audit.
- Jika entity ada tetapi bukan milik OWNER, respons yang disarankan adalah `404` agar keberadaan resource milik tenant lain tidak bocor.

## 3. Tempat dan kepemilikan

- Pembuatan `Place`, assignment `PlaceOwner`, dan pemberian role `OWNER` bila diperlukan harus atomik dalam satu transaksi.
- Sebuah tempat aktif minimal memiliki satu OWNER, kecuali tempat dikelola sementara oleh `SUPER_ADMIN` berdasarkan kebijakan operasional yang terdokumentasi.
- Pemilik terakhir tidak boleh dilepas dari tempat aktif.
- `slug` harus dinormalisasi, unik, dan tidak boleh memakai reserved path aplikasi.
- Tempat hanya boleh dipublikasikan bila data minimum telah lengkap: nama, tipe, alamat, minimal satu OWNER, dan minimal satu menu aktif sesuai kebijakan produk.
- Mengaktifkan pemesanan hanya diperbolehkan jika tempat aktif, dipublikasikan, dan memiliki minimal satu menu yang tersedia.
- Menonaktifkan pemesanan mencegah checkout baru, tetapi tidak membatalkan pesanan yang sudah terbentuk.
- Soft delete tempat harus menonaktifkan publikasi dan pemesanan. Penanganan pesanan aktif harus diselesaikan atau dibatalkan lebih dahulu.

## 4. Jam operasional

- Maksimal satu `BusinessHour` per hari untuk setiap tempat sudah dibantu oleh unique constraint.
- Jika `isClosed = true`, `opensAt` dan `closesAt` harus `null`.
- Jika `isClosed = false`, `opensAt` dan `closesAt` wajib terisi dan tidak boleh sama.
- Jam yang melewati tengah malam harus ditangani secara eksplisit oleh service, misalnya `18:00–02:00` berarti tutup pada hari berikutnya.
- Seluruh evaluasi jam buka harus memakai timezone tempat atau timezone aplikasi yang telah disepakati, bukan timezone perangkat client.

## 5. Kategori dan menu

- `MenuCategory.placeId` harus sama dengan `MenuItem.placeId`. Service wajib mengecek kategori menggunakan kombinasi `categoryId` dan `placeId`.
- Nama kategori harus unik secara case-insensitive dalam satu tempat. Normalisasi spasi sebelum validasi.
- Harga menu harus lebih besar atau sama dengan nol dan menggunakan `Decimal`; jangan menggunakan floating-point JavaScript untuk perhitungan uang.
- `sortOrder` tidak boleh negatif.
- Menu yang dihapus, category-nya nonaktif, atau `isAvailable = false` tidak boleh ditambahkan ke keranjang atau dipesan.
- Mengubah harga menu tidak boleh mengubah histori `OrderItem` yang sudah tersimpan.
- Soft delete menu tidak boleh menghapus histori pesanan. Item terkait dalam keranjang aktif harus dibuang atau ditandai tidak valid saat keranjang dibaca.
- OWNER hanya boleh membuat, mengubah, memindahkan kategori, atau menghapus menu di tempat miliknya sendiri.

## 6. Review

- Rating harus berupa integer dalam rentang 1 sampai 5.
- User hanya boleh membuat satu review aktif per tempat dan satu review aktif per menu, sesuai unique constraint saat ini.
- Saat review di-soft-delete lalu user menulis ulang, service harus memulihkan dan memperbarui record lama; membuat record baru akan melanggar unique constraint.
- User hanya boleh mengubah atau menghapus review miliknya sendiri. `SUPER_ADMIN` dapat melakukan moderasi.
- Tempat yang direview harus aktif dan dipublikasikan. Menu yang direview harus berasal dari tempat tersebut dan tidak terhapus.
- Tentukan kebijakan verifikasi pembelian sebelum mewajibkan review hanya dari pembeli. Jika diterapkan, cek adanya `OrderStatus.COMPLETED` yang berisi menu/tempat terkait.
- Nilai rata-rata dan jumlah review hanya menghitung review dengan `deletedAt = null`.
- Jika ringkasan rating disimpan sebagai cache, pembaruan review dan cache harus dilakukan dalam transaksi yang sama atau melalui mekanisme event yang idempotent.

## 7. Keranjang

- Satu keranjang hanya berisi menu dari satu tempat. `Cart.placeId` harus sama dengan `MenuItem.placeId` untuk setiap `CartItem`.
- User hanya boleh membaca dan memodifikasi keranjang miliknya sendiri.
- Quantity harus integer lebih besar dari nol dan sebaiknya memiliki batas maksimum yang ditentukan produk.
- Penambahan item yang sama memperbarui quantity pada `CartItem` yang sudah ada karena kombinasi `cartId` dan `menuItemId` unik.
- Mengubah quantity menjadi nol harus menghapus item, bukan menyimpan quantity nol.
- Harga tidak disimpan pada keranjang; harga terkini dibaca ulang dari `MenuItem` saat keranjang ditampilkan dan saat checkout.
- Keranjang boleh disimpan ketika pemesanan sedang nonaktif, tetapi checkout harus ditolak.
- Setiap pembacaan keranjang harus menandai atau membersihkan menu yang sudah tidak tersedia, terhapus, atau berada pada kategori nonaktif.
- Catatan item harus dibatasi panjangnya dan disanitasi saat ditampilkan.

## 8. Checkout dan pembuatan pesanan

Checkout wajib dilakukan dalam satu transaksi dengan urutan logis berikut:

1. Ambil user aktif dan keranjang miliknya beserta tempat, kategori, dan seluruh menu.
2. Pastikan keranjang tidak kosong dan semua item berasal dari `Cart.placeId`.
3. Pastikan tempat aktif, dipublikasikan, dan `isOrderingEnabled = true`.
4. Pastikan setiap menu tidak terhapus, tersedia, category-nya aktif, dan quantity valid.
5. Hitung ulang `unitPrice`, `lineTotal`, dan `subtotal` di server menggunakan `Decimal`.
6. Buat `orderCode` yang unik dan mudah dibaca. Tangani collision dengan retry terbatas terhadap unique constraint.
7. Buat `Order` dan seluruh `OrderItem`. Salin `itemName`, `itemType`, dan `unitPrice` sebagai snapshot.
8. Tentukan `expiresAt` berdasarkan kebijakan tempat/aplikasi.
9. Kosongkan item keranjang hanya setelah order dan seluruh item berhasil dibuat.

Aturan tambahan:

- `subtotal` harus sama dengan jumlah seluruh `OrderItem.lineTotal`.
- `lineTotal` harus sama dengan `unitPrice × quantity`.
- `customerName` merupakan snapshot dan tidak otomatis berubah ketika profil user diperbarui.
- `tableNumber` wajib untuk `DINE_IN` hanya jika tempat menerapkan nomor meja; untuk `TAKEAWAY` harus dikosongkan.
- Endpoint checkout harus memakai idempotency key agar retry jaringan tidak membuat pesanan ganda.
- Jika tingkat konkurensi tinggi, gunakan isolation level yang sesuai atau optimistic concurrency agar harga/ketersediaan tidak berubah di tengah checkout.

## 9. Lifecycle pesanan

Transisi status yang diperbolehkan:

```text
PENDING   -> CONFIRMED | CANCELLED | EXPIRED
CONFIRMED -> PREPARING | CANCELLED
PREPARING -> READY | CANCELLED
READY     -> COMPLETED | CANCELLED
COMPLETED -> terminal
CANCELLED -> terminal
EXPIRED   -> terminal
```

- User hanya boleh membatalkan pesanan miliknya saat masih `PENDING`, kecuali kebijakan tempat memperluasnya.
- OWNER hanya boleh melihat atau mengubah pesanan milik tempatnya.
- `SUPER_ADMIN` dapat mengubah seluruh pesanan, tetapi tidak boleh melompati aturan transisi tanpa alur override yang tercatat.
- Setiap perubahan status harus memakai update bersyarat terhadap status sebelumnya untuk mencegah race condition.
- Isi timestamp yang sesuai ketika status berubah: `confirmedAt`, `completedAt`, atau `cancelledAt`.
- Pesanan `PENDING` yang melewati `expiresAt` diubah menjadi `EXPIRED` oleh job yang idempotent.
- Order terminal tidak boleh diedit, kecuali metadata administratif yang tidak mengubah nilai transaksi.
- Karena tidak ada payment gateway, jangan menambahkan status pembayaran atau menyatakan order telah dibayar hanya berdasarkan status pesanan.

## 10. Kode, QR, dan link verifikasi

- `orderCode` digunakan untuk komunikasi manusia dan pencarian kasir; jangan jadikan kode pendek sebagai satu-satunya bukti otorisasi.
- QR code sebaiknya berisi URL yang menggunakan `verificationToken`, bukan `Order.id`, `userId`, atau informasi pribadi.
- Endpoint verifikasi token hanya menampilkan data minimum yang dibutuhkan kasir.
- Token harus dibandingkan secara exact, tidak dicatat utuh pada log, dan tidak dikirim ke layanan analitik.
- Kasir/OWNER baru boleh memproses pesanan setelah kepemilikan tempat diverifikasi dari session mereka; kepemilikan QR saja tidak memberikan hak mutasi.
- Terapkan rate limit pada pencarian berdasarkan kode dan token untuk mengurangi brute force.
- Link untuk order `CANCELLED`, `EXPIRED`, atau yang sudah melewati masa retensi harus memberi hasil yang aman dan tidak mengekspos data pribadi.

## 11. Soft delete dan retensi

- Soft-deleted user tidak boleh login, membuat review, mengubah keranjang, atau membuat pesanan.
- Data historis order dipertahankan sesuai kebutuhan audit dan kebijakan privasi.
- Jangan hard-delete `User`, `Place`, atau `MenuItem` yang masih direferensikan histori pesanan tanpa proses retensi khusus.
- Anonimisasi data user harus mempertahankan integritas order sambil menghapus data pribadi yang tidak lagi diperlukan.
- Restore record harus memeriksa kembali konflik email, slug, nama kategori, dan unique constraint lain.

## 12. Error handling dan audit

- Gunakan `400` untuk input tidak valid, `401` untuk token tidak valid, `403` untuk larangan global berbasis role, `404` untuk resource tidak ada/bukan milik tenant, dan `409` untuk konflik state atau unique constraint.
- Jangan mengembalikan stack trace, hash password, verification token, atau detail internal Prisma kepada client.
- Catat aksi sensitif: perubahan role, assignment OWNER, perubahan pengaturan pemesanan, moderasi review, dan perubahan status order.
- Audit log minimal berisi actor, aksi, target, timestamp, serta nilai sebelum/sesudah yang aman. Jangan menyimpan password, token, atau data rahasia.

## 13. Constraint database tambahan yang disarankan

Prisma schema belum mengekspresikan seluruh `CHECK constraint`. Migration SQL manual disarankan untuk:

- `rating BETWEEN 1 AND 5` pada kedua tabel review.
- `price >= 0`, `unit_price >= 0`, `line_total >= 0`, dan `subtotal >= 0`.
- `quantity > 0` pada cart item dan order item.
- `sort_order >= 0`.
- Konsistensi jam operasional antara `is_closed`, `opens_at`, dan `closes_at`.

Validasi service tetap wajib walaupun constraint database tersebut ditambahkan, agar API dapat memberikan pesan error yang jelas.

## 14. Skenario pengujian minimum

- User dibuat bersama role `USER` secara atomik dan role terakhir tidak dapat dihapus.
- OWNER A tidak dapat membaca atau mengubah entity privat maupun pesanan milik OWNER B.
- SUPER_ADMIN dapat mengelola seluruh tempat.
- Kategori dari tempat lain ditolak ketika membuat atau memindahkan menu.
- Menu dari tempat lain ditolak ketika ditambahkan ke keranjang.
- Checkout ditolak saat ordering nonaktif, tempat tidak dipublikasikan, keranjang kosong, atau salah satu menu tidak tersedia.
- Perubahan harga sebelum checkout menghasilkan snapshot harga terbaru, sedangkan order lama tetap tidak berubah.
- Retry checkout dengan idempotency key yang sama hanya menghasilkan satu order.
- Transisi status ilegal dan dua update status bersamaan ditolak dengan benar.
- Token QR valid hanya memberi data minimum dan tidak memberi hak mutasi tanpa session OWNER yang sah.
- Review di luar rating 1–5 ditolak dan review yang dihapus dapat dipulihkan tanpa konflik unique constraint.
