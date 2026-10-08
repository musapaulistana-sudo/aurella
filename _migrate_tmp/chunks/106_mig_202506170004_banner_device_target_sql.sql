-- Destino do banner: ambos os dispositivos, só desktop ou só mobile
ALTER TABLE home_banners
  ADD COLUMN IF NOT EXISTS device_target VARCHAR(20) NOT NULL DEFAULT 'both';

ALTER TABLE home_banners DROP CONSTRAINT IF EXISTS home_banners_device_target_check;
ALTER TABLE home_banners
  ADD CONSTRAINT home_banners_device_target_check
  CHECK (device_target IN ('both', 'desktop', 'mobile'));
