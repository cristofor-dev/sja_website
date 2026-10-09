-- Who may sign in (besides the owners listed in the ADMIN_EMAILS variable).
CREATE TABLE users (
  email      TEXT PRIMARY KEY,
  role       TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pages (/p/<slug>) and blog posts (/blog/<slug>). `body` is a TipTap/ProseMirror
-- JSON document; it is rendered to HTML on the server, never stored as HTML.
CREATE TABLE content (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL CHECK (type IN ('page', 'post')),
  slug         TEXT NOT NULL,
  title        TEXT NOT NULL,
  excerpt      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  cover        TEXT,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  show_in_menu INTEGER NOT NULL DEFAULT 0,
  menu_label   TEXT,
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by   TEXT,
  UNIQUE (type, slug)
);

CREATE INDEX content_list ON content (type, status, published_at DESC);
