CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS users_active_username_idx ON users (LOWER(username)) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS catalog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL DEFAULT 'series' CHECK (media_type IN ('series', 'movie')),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO catalog_categories (name, media_type, is_enabled)
VALUES ('Crunchyroll', 'series', TRUE), ('Funimation Now', 'series', TRUE)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_iptv_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  encrypted_playlist_url BYTEA NOT NULL,
  playlist_url_iv BYTEA NOT NULL,
  playlist_url_auth_tag BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES catalog_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  encrypted_stream_url BYTEA NOT NULL,
  stream_url_iv BYTEA NOT NULL,
  stream_url_auth_tag BYTEA NOT NULL,
  logo_url TEXT,
  tvg_id TEXT,
  tvg_name TEXT,
  source_item_key TEXT NOT NULL,
  group_title TEXT,
  media_type TEXT NOT NULL DEFAULT 'series' CHECK (media_type IN ('series', 'movie')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, source_item_key)
);
CREATE INDEX IF NOT EXISTS user_catalog_items_user_category_idx ON user_catalog_items (user_id, category_id, title);
CREATE INDEX IF NOT EXISTS user_catalog_items_available_idx ON user_catalog_items (user_id, is_available) WHERE is_available = TRUE;

-- No public registration. Admins provision accounts with bcrypt hashes only.


CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_key_hash TEXT NOT NULL,
  device_label TEXT NOT NULL DEFAULT 'Dispositivo',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, device_key_hash)
);
CREATE INDEX IF NOT EXISTS user_devices_user_last_seen_idx ON user_devices (user_id, last_seen_at DESC);
