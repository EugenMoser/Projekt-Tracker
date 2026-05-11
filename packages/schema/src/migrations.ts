export type Migration = { version: number; sql: string }

export const migrations: Migration[] = [
  {
    version: 1,
    sql: `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'pro',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_types (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  digit INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS order_types_user_idx ON order_types(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS order_types_user_digit_uq ON order_types(user_id, digit);
CREATE UNIQUE INDEX IF NOT EXISTS order_types_user_name_uq ON order_types(user_id, name);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  customer_number TEXT NOT NULL,
  order_type_id TEXT NOT NULL REFERENCES order_types(id),
  name TEXT NOT NULL,
  street TEXT,
  zip TEXT,
  city TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS customers_user_idx ON customers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_number_uq ON customers(user_id, customer_number);
CREATE INDEX IF NOT EXISTS customers_numbering_idx ON customers(user_id, order_type_id, created_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  pricing_mode TEXT NOT NULL,
  hourly_rate_cents INTEGER,
  fixed_price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS projects_user_status_updated_idx ON projects(user_id, status, updated_at);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_description_uq ON tasks(user_id, description);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS tags_user_idx ON tags(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS tags_user_title_uq ON tags(user_id, title);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (task_id, tag_id)
);
CREATE INDEX IF NOT EXISTS task_tags_user_idx ON task_tags(user_id);

CREATE TABLE IF NOT EXISTS project_tasks (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (project_id, task_id)
);
CREATE INDEX IF NOT EXISTS project_tasks_user_idx ON project_tasks(user_id);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  rate_snapshot_cents INTEGER,
  pricing_mode_snapshot TEXT NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS time_entries_user_started_idx ON time_entries(user_id, started_at);
CREATE INDEX IF NOT EXISTS time_entries_user_project_idx ON time_entries(user_id, project_id, started_at);
CREATE INDEX IF NOT EXISTS time_entries_user_updated_idx ON time_entries(user_id, updated_at);

CREATE TABLE IF NOT EXISTS timers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  started_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS timers_user_uq ON timers(user_id);

CREATE TABLE IF NOT EXISTS app_settings (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id),
  pin_hash TEXT,
  biometric_enabled INTEGER NOT NULL DEFAULT 0,
  last_export_period TEXT,
  updated_at INTEGER NOT NULL
);
    `,
  },
]
