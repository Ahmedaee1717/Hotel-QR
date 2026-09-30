-- Room-service menu items can carry a photo (uploaded from the guest-app editor, served by /api/img/*).
-- Additive only. The editor routes leave photos out until this column exists, so apply whenever convenient.
ALTER TABLE alacarte_menu_items ADD COLUMN image_url TEXT;
