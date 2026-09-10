-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "id_user" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_id_user_key" ON "users"("id_user");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
