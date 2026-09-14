CREATE INDEX "places_city_is_published_deleted_at_idx"
ON "places"("city", "is_published", "deleted_at");
