-- Store: products, orders, order items

CREATE TABLE IF NOT EXISTS store_products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL,
  description TEXT,
  upc         TEXT,
  sizes       TEXT    NOT NULL DEFAULT '[]',
  colors      TEXT    NOT NULL DEFAULT '[]',
  price_cents INTEGER NOT NULL DEFAULT 0,
  cost_cents  INTEGER NOT NULL DEFAULT 0,
  inventory   INTEGER NOT NULL DEFAULT 0,
  weight_oz   REAL    NOT NULL DEFAULT 0,
  image_url   TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS store_orders (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number          TEXT    NOT NULL UNIQUE,
  participant_id        INTEGER,
  status                TEXT    NOT NULL DEFAULT 'pending',
  fulfillment           TEXT    NOT NULL DEFAULT 'pickup',
  name                  TEXT    NOT NULL,
  email                 TEXT    NOT NULL,
  phone                 TEXT,
  address               TEXT,
  tracking_number       TEXT,
  subtotal_cents        INTEGER NOT NULL DEFAULT 0,
  shipping_cents        INTEGER NOT NULL DEFAULT 0,
  total_cents           INTEGER NOT NULL DEFAULT 0,
  stripe_payment_intent TEXT,
  payment_method        TEXT    NOT NULL DEFAULT 'cash',
  notes                 TEXT,
  created_at            TEXT    DEFAULT (datetime('now')),
  updated_at            TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS store_order_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL,
  product_id      INTEGER NOT NULL,
  product_name    TEXT    NOT NULL,
  product_upc     TEXT,
  size            TEXT,
  color           TEXT,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  unit_cost_cents  INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES store_orders(id)
);
