-- Unifica selo antigo em image_url (campo único para home e carrosséis)
UPDATE categories
SET image_url = seal_image_url
WHERE image_url IS NULL AND seal_image_url IS NOT NULL;
