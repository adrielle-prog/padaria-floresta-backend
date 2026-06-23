const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const isPg = !!process.env.DATABASE_URL;
let db;
let pool;

if (isPg) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('Connected to PostgreSQL database in the cloud');
  initializeDatabase();
} else {
  const dbPath = path.join(__dirname, 'sales.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database at:', dbPath);
      initializeDatabase();
    }
  });
}

// Enable foreign keys for SQLite
if (!isPg && db) {
  db.run('PRAGMA foreign_keys = ON;');
}

function convertSql(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

const dbGet = (sql, params = []) => {
  if (isPg) {
    return pool.query(convertSql(sql), params).then(res => res.rows[0]);
  } else {
    return new Promise((resolve, reject) =>
      db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
    );
  }
};

const dbAll = (sql, params = []) => {
  if (isPg) {
    return pool.query(convertSql(sql), params).then(res => res.rows);
  } else {
    return new Promise((resolve, reject) =>
      db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
    );
  }
};

const dbRun = (sql, params = []) => {
  if (isPg) {
    let querySql = convertSql(sql);
    const isInsert = querySql.trim().toUpperCase().startsWith('INSERT');
    if (isInsert && !querySql.toUpperCase().includes('RETURNING')) {
      querySql += ' RETURNING id';
    }
    return pool.query(querySql, params).then(res => ({
      lastID: isInsert && res.rows[0] ? (res.rows[0].id || res.rows[0].lastid) : null,
      changes: res.rowCount
    }));
  } else {
    return new Promise((resolve, reject) =>
      db.run(sql, params, function (err) { err ? reject(err) : resolve(this); })
    );
  }
};

async function runTransaction(fn) {
  if (isPg) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txGet = (sql, params = []) => client.query(convertSql(sql), params).then(res => res.rows[0]);
      const txAll = (sql, params = []) => client.query(convertSql(sql), params).then(res => res.rows);
      const txRun = (sql, params = []) => {
        let querySql = convertSql(sql);
        const isInsert = querySql.trim().toUpperCase().startsWith('INSERT');
        if (isInsert && !querySql.toUpperCase().includes('RETURNING')) {
          querySql += ' RETURNING id';
        }
        return client.query(querySql, params).then(res => ({
          lastID: isInsert && res.rows[0] ? (res.rows[0].id || res.rows[0].lastid) : null,
          changes: res.rowCount
        }));
      };
      const result = await fn({ dbGet: txGet, dbAll: txAll, dbRun: txRun });
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          await dbRun('BEGIN TRANSACTION');
          const result = await fn({ dbGet, dbAll, dbRun });
          await dbRun('COMMIT');
          resolve(result);
        } catch (e) {
          await dbRun('ROLLBACK').catch(() => {});
          reject(e);
        }
      });
    });
  }
}

async function initializeDatabase() {
  try {
    const productsSchema = isPg
      ? `CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          price DOUBLE PRECISION NOT NULL,
          category TEXT NOT NULL,
          barcode TEXT,
          min_stock INTEGER NOT NULL DEFAULT 10,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      : `CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          price REAL NOT NULL,
          category TEXT NOT NULL,
          barcode TEXT,
          min_stock INTEGER NOT NULL DEFAULT 10,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    const salesSchema = isPg
      ? `CREATE TABLE IF NOT EXISTS sales (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL,
          quantity_sold INTEGER NOT NULL,
          unit_price DOUBLE PRECISION NOT NULL,
          total_price DOUBLE PRECISION NOT NULL,
          session_id INTEGER,
          sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`
      : `CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          quantity_sold INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          session_id INTEGER,
          sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`;

    const sessionsSchema = isPg
      ? `CREATE TABLE IF NOT EXISTS sale_sessions (
          id SERIAL PRIMARY KEY,
          total_amount DOUBLE PRECISION NOT NULL,
          payments TEXT NOT NULL,
          amount_paid DOUBLE PRECISION NOT NULL,
          change_amount DOUBLE PRECISION DEFAULT 0,
          items_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      : `CREATE TABLE IF NOT EXISTS sale_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total_amount REAL NOT NULL,
          payments TEXT NOT NULL,
          amount_paid REAL NOT NULL,
          change_amount REAL DEFAULT 0,
          items_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    const usersSchema = isPg
      ? `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('gerente','caixa','estoque')),
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      : `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('gerente','caixa','estoque')),
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    await dbRun(productsSchema);
    try { await dbRun("ALTER TABLE products ADD COLUMN barcode TEXT"); } catch (e) {}
    try { await dbRun("ALTER TABLE products ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 10"); } catch (e) {}

    await dbRun(salesSchema);
    try { await dbRun("ALTER TABLE sales ADD COLUMN session_id INTEGER"); } catch (e) {}

    await dbRun(sessionsSchema);
    await dbRun(usersSchema);

    // Seed initial products if table is empty
    const prodCount = await dbGet("SELECT COUNT(*) as count FROM products");
    if (prodCount && Number(prodCount.count) === 0) {
      const initialProducts = [
        ["Pão Francês",   150, 0.50,  "Pães"],
        ["Bolo de Fubá",   10, 15.00, "Bolos"],
        ["Broa de Milho",  30, 2.50,  "Broas"],
        ["Sonho de Creme", 25, 4.00,  "Doces"]
      ];
      for (const p of initialProducts) {
        await dbRun("INSERT INTO products (name, stock_quantity, price, category) VALUES (?, ?, ?, ?)", p);
      }
      console.log("Inserted initial bakery products!");
    }
  } catch (err) {
    console.error("Error initializing database schema/seeding:", err);
  }
}

const dbHelpers = {
  // ── Products ──────────────────────────────────────────────
  getProducts: () => dbAll("SELECT * FROM products ORDER BY category, name"),

  getProductById: (id) => dbGet("SELECT * FROM products WHERE id = ?", [id]),

  // Search by barcode (exact) or name (partial)
  searchProducts: async (query) => {
    const trimmed = query.trim();
    // Try exact barcode match first
    const byBarcode = await dbGet(
      "SELECT * FROM products WHERE barcode = ?", [trimmed]
    );
    if (byBarcode) return { products: [byBarcode], exactMatch: true };

    // Fall back to name search
    const byName = await dbAll(
      "SELECT * FROM products WHERE name LIKE ? ORDER BY name LIMIT 10",
      [`%${trimmed}%`]
    );
    return { products: byName, exactMatch: false };
  },

  createProduct: (name, stock_quantity, price, category, barcode = null, min_stock = 10) =>
    dbRun(
      "INSERT INTO products (name, stock_quantity, price, category, barcode, min_stock) VALUES (?, ?, ?, ?, ?, ?)",
      [name, stock_quantity, price, category, barcode || null, Number(min_stock) || 10]
    ).then(function (result) {
      return { id: result.lastID, name, stock_quantity, price, category, barcode, min_stock };
    }),

  updateProduct: (id, name, price, category, barcode = null, min_stock = 10) =>
    dbRun(
      "UPDATE products SET name=?, price=?, category=?, barcode=?, min_stock=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
      [name, price, category, barcode || null, Number(min_stock) || 10, id]
    ).then(r => ({ changes: r.changes })),

  // Add units to stock (restock action)
  restockProduct: (id, qty) => {
    if (!qty || qty <= 0) return Promise.reject(new Error('Quantidade deve ser maior que zero.'));
    return runTransaction(async (tx) => {
      const product = await tx.dbGet('SELECT id, name, stock_quantity FROM products WHERE id=?', [id]);
      if (!product) throw new Error('Produto não encontrado.');
      const newStock = product.stock_quantity + Number(qty);
      await tx.dbRun('UPDATE products SET stock_quantity=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [newStock, id]);
      return { id, name: product.name, previousStock: product.stock_quantity, addedQty: qty, newStock };
    });
  },

  // ── Single sale (legacy endpoint) ─────────────────────────
  executeSale: (productId, quantitySold) => {
    return runTransaction(async (tx) => {
      const product = await tx.dbGet("SELECT stock_quantity, price FROM products WHERE id = ?", [productId]);
      if (!product) throw new Error("Produto não encontrado.");
      if (product.stock_quantity < quantitySold) throw new Error("Estoque insuficiente para a venda.");
      const newStock = product.stock_quantity - quantitySold;
      const totalPrice = product.price * quantitySold;
      await tx.dbRun("UPDATE products SET stock_quantity=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [newStock, productId]);
      const res = await tx.dbRun("INSERT INTO sales (product_id, quantity_sold, unit_price, total_price) VALUES (?,?,?,?)", [productId, quantitySold, product.price, totalPrice]);
      return { saleId: res.lastID, productId, quantitySold, unitPrice: product.price, totalPrice, newStock };
    });
  },

  // ── PDV Checkout (full cart) ───────────────────────────────
  checkout: async (cartItems, payments, totalAmount, amountPaid, changeAmount) => {
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    if (totalPaid < totalAmount - 0.01) {
      throw new Error('Valor pago insuficiente para cobrir o total da venda.');
    }

    const productData = await Promise.all(
      cartItems.map(item => dbGet("SELECT * FROM products WHERE id=?", [item.productId]))
    );

    for (let i = 0; i < cartItems.length; i++) {
      const prod = productData[i];
      const item = cartItems[i];
      if (!prod) throw new Error(`Produto ID ${item.productId} não encontrado.`);
      if (prod.stock_quantity < item.quantity) {
        throw new Error(`Estoque insuficiente para "${prod.name}". Disponível: ${prod.stock_quantity} un.`);
      }
    }

    return runTransaction(async (tx) => {
      const resSession = await tx.dbRun(
        "INSERT INTO sale_sessions (total_amount, payments, amount_paid, change_amount, items_count) VALUES (?,?,?,?,?)",
        [totalAmount, JSON.stringify(payments), amountPaid, changeAmount, cartItems.length]
      );
      const sessionId = resSession.lastID;

      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        const prod = productData[i];
        const newStock = prod.stock_quantity - item.quantity;
        const subtotal = prod.price * item.quantity;

        await tx.dbRun("UPDATE products SET stock_quantity=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [newStock, item.productId]);
        await tx.dbRun(
          "INSERT INTO sales (product_id, quantity_sold, unit_price, total_price, session_id) VALUES (?,?,?,?,?)",
          [item.productId, item.quantity, prod.price, subtotal, sessionId]
        );
      }

      return { sessionId, totalAmount, amountPaid, changeAmount, productData };
    });
  },

  // ── History ───────────────────────────────────────────────
  getSales: () => dbAll(`
    SELECT sales.*, products.name AS product_name, products.category AS product_category
    FROM sales JOIN products ON sales.product_id = products.id
    ORDER BY sales.sale_date DESC
  `),

  getSessions: () => dbAll(
    "SELECT * FROM sale_sessions ORDER BY created_at DESC LIMIT 50"
  ),

  // ── Users ─────────────────────────────────────────────────
  getUserByUsername: (username) =>
    dbGet("SELECT * FROM users WHERE username=? AND is_active=1", [username]),

  getAllUsers: () =>
    dbAll("SELECT id, name, username, role, is_active, created_at FROM users ORDER BY name"),

  createUser: async (name, username, password, role) => {
    const hash = await bcrypt.hash(password, 10);
    return dbRun(
      "INSERT INTO users (name, username, password_hash, role) VALUES (?,?,?,?)",
      [name, username, hash, role]
    ).then(r => ({ id: r.lastID, name, username, role, is_active: 1 }));
  },

  updateUser: async (id, name, username, role, password) => {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      return dbRun(
        "UPDATE users SET name=?, username=?, password_hash=?, role=? WHERE id=?",
        [name, username, hash, role, id]
      );
    }
    return dbRun(
      "UPDATE users SET name=?, username=?, role=? WHERE id=?",
      [name, username, role, id]
    );
  },

  toggleUserActive: (id) =>
    dbGet("SELECT is_active FROM users WHERE id=?", [id]).then(u =>
      dbRun("UPDATE users SET is_active=? WHERE id=?", [u.is_active ? 0 : 1, id])
    ),

  // ── Reports ───────────────────────────────────────────────
  reportSummary: async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const weekAgo  = new Date(Date.now() - 7  * 86400000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const [today, week, month, allTime] = await Promise.all([
      dbGet("SELECT COALESCE(SUM(total_price),0) AS revenue, COUNT(*) AS count FROM sales WHERE DATE(sale_date)=?", [todayStr]),
      dbGet("SELECT COALESCE(SUM(total_price),0) AS revenue, COUNT(*) AS count FROM sales WHERE DATE(sale_date)>=?", [weekAgo]),
      dbGet("SELECT COALESCE(SUM(total_price),0) AS revenue, COUNT(*) AS count FROM sales WHERE DATE(sale_date)>=?", [monthAgo]),
      dbGet("SELECT COALESCE(SUM(total_price),0) AS revenue, COUNT(*) AS count FROM sales"),
    ]);
    return { today, week, month, allTime };
  },

  reportByPeriod: (from, to) => dbAll(`
    SELECT DATE(sale_date) AS day,
           COALESCE(SUM(total_price),0) AS revenue,
           COUNT(*) AS sales_count,
           COALESCE(SUM(quantity_sold),0) AS items_sold
    FROM sales
    WHERE DATE(sale_date) BETWEEN ? AND ?
    GROUP BY day ORDER BY day ASC
  `, [from, to]),

  reportTopProducts: (from, to, limit = 10) => dbAll(`
    SELECT p.name, p.category,
           SUM(s.quantity_sold) AS total_qty,
           SUM(s.total_price)   AS total_revenue
    FROM sales s JOIN products p ON s.product_id = p.id
    WHERE DATE(s.sale_date) BETWEEN ? AND ?
    GROUP BY p.id ORDER BY total_revenue DESC LIMIT ?
  `, [from, to, limit]),

  reportByCategory: (from, to) => dbAll(`
    SELECT p.category,
           SUM(s.quantity_sold) AS total_qty,
           SUM(s.total_price)   AS total_revenue
    FROM sales s JOIN products p ON s.product_id = p.id
    WHERE DATE(s.sale_date) BETWEEN ? AND ?
    GROUP BY p.category ORDER BY total_revenue DESC
  `, [from, to]),

  reportDetailedSales: (from, to) => dbAll(`
    SELECT s.id, s.sale_date, s.quantity_sold, s.unit_price, s.total_price,
           p.name AS product_name, p.category
    FROM sales s JOIN products p ON s.product_id = p.id
    WHERE DATE(s.sale_date) BETWEEN ? AND ?
    ORDER BY s.sale_date DESC
  `, [from, to]),
};

module.exports = dbHelpers;
