require('dotenv').config();

const express = require('express');
const cors = require('cors');
const os = require('os');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');
const { sendPasswordResetEmail } = require('./email');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'padaria-secret-2024-do-not-expose';
const JWT_EXPIRES = '24h';

app.use(cors());
app.use(express.json());

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces))
    for (const iface of interfaces[name])
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
  return 'localhost';
}

// ── Auth Middleware ────────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token não fornecido.' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({ error: 'Acesso não autorizado para este perfil.' });
    next();
  };
}

// ── Auth Routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  try {
    const user = await db.getUserByUsername(username.trim());
    if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    const token = jwt.sign(
      { id: user.id, name: user.name, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, role: user.role, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao autenticar.' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await db.getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      email: user.email
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

app.put('/api/auth/update-profile', authenticate, async (req, res) => {
  const { name, username, email } = req.body;
  const userId = req.user.id;
  if (!name?.trim() || !username?.trim())
    return res.status(400).json({ error: 'Nome e usuário são obrigatórios.' });
  try {
    // Verificar se o username já está em uso por outro usuário
    const existingUser = await db.getUserByUsername(username.trim());
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: 'Nome de usuário já está em uso.' });
    }
    if (email?.trim()) {
      const existingEmail = await db.getUserByEmail(email.trim());
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ error: 'E-mail já está associado a outra conta.' });
      }
    }
    await db.updateUserProfile(userId, name.trim(), username.trim().toLowerCase(), email?.trim() || null);
    res.json({ message: 'Perfil atualizado com sucesso!' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

app.put('/api/auth/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  try {
    const user = await db.getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Senha atual incorreta.' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.updateUserPassword(userId, newHash);
    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao alterar a senha.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email?.trim())
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  try {
    const user = await db.getUserByEmail(email.trim());
    if (!user) {
      // Retornar sucesso genérico por motivos de segurança
      return res.json({ message: 'Se o e-mail estiver cadastrado, um link de recuperação será enviado.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora
    await db.createResetToken(user.id, token, expiresAt);
    const origin = req.get('origin') || process.env.APP_URL || 'http://localhost:5173';
    await sendPasswordResetEmail(email.trim(), token, origin);
    res.json({ message: 'Se o e-mail estiver cadastrado, um link de recuperação será enviado.' });
  } catch (e) {
    console.error('Erro forgot password:', e);
    res.status(500).json({ error: 'Erro ao processar solicitação.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  try {
    const tokenRow = await db.validateResetToken(token);
    if (!tokenRow) {
      return res.status(400).json({ error: 'Token de recuperação inválido ou expirado.' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await db.updateUserPassword(tokenRow.user_id, hash);
    await db.markTokenAsUsed(token);
    res.json({ message: 'Senha redefinida com sucesso! Faça login com a nova senha.' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao redefinir a senha.' });
  }
});

// ── User Management (gerente only) ────────────────────────────────────────────

app.get('/api/users', authenticate, authorize('gerente'), async (req, res) => {
  try { res.json(await db.getAllUsers()); }
  catch { res.status(500).json({ error: 'Erro ao buscar usuários.' }); }
});

app.post('/api/users', authenticate, authorize('gerente'), async (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name?.trim() || !username?.trim() || !password || !role)
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  if (!['gerente', 'caixa', 'estoque'].includes(role))
    return res.status(400).json({ error: 'Perfil inválido.' });
  try {
    const user = await db.createUser(name.trim(), username.trim(), password, role);
    res.status(201).json(user);
  } catch (e) {
    const msg = e.message?.includes('UNIQUE') ? 'Nome de usuário já existe.' : 'Erro ao criar usuário.';
    res.status(400).json({ error: msg });
  }
});

app.put('/api/users/:id', authenticate, authorize('gerente'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, username, role, password } = req.body;
  if (!name?.trim() || !username?.trim() || !role)
    return res.status(400).json({ error: 'Nome, usuário e perfil são obrigatórios.' });
  if (!['gerente', 'caixa', 'estoque'].includes(role))
    return res.status(400).json({ error: 'Perfil inválido.' });
  try {
    await db.updateUser(id, name.trim(), username.trim(), role, password || null);
    res.json({ message: 'Usuário atualizado.' });
  } catch (e) {
    const msg = e.message?.includes('UNIQUE') ? 'Nome de usuário já existe.' : 'Erro ao atualizar usuário.';
    res.status(400).json({ error: msg });
  }
});

app.put('/api/users/:id/toggle', authenticate, authorize('gerente'), async (req, res) => {
  try {
    await db.toggleUserActive(Number(req.params.id));
    res.json({ message: 'Status do usuário alterado.' });
  } catch { res.status(500).json({ error: 'Erro ao alterar status.' }); }
});

// ── Products ──────────────────────────────────────────────────────────────────

app.get('/api/products', authenticate, async (req, res) => {
  try { res.json(await db.getProducts()); }
  catch { res.status(500).json({ error: 'Erro ao buscar produtos.' }); }
});

app.get('/api/products/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'Parâmetro de busca obrigatório.' });
  try { res.json(await db.searchProducts(q)); }
  catch { res.status(500).json({ error: 'Erro ao buscar produto.' }); }
});

app.post('/api/products', authenticate, authorize('gerente', 'estoque'), async (req, res) => {
  const { name, stock_quantity, price, category, barcode, min_stock } = req.body;
  if (!name?.trim())         return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (stock_quantity < 0)   return res.status(400).json({ error: 'Quantidade não pode ser negativa.' });
  if (!price || price <= 0) return res.status(400).json({ error: 'Preço deve ser maior que zero.' });
  if (!category?.trim())    return res.status(400).json({ error: 'Categoria é obrigatória.' });
  try {
    const p = await db.createProduct(name.trim(), Number(stock_quantity), Number(price), category.trim(), barcode?.trim() || null, Number(min_stock) || 10);
    res.status(201).json(p);
  } catch { res.status(500).json({ error: 'Erro ao cadastrar produto.' }); }
});

app.put('/api/products/:id', authenticate, authorize('gerente', 'estoque'), async (req, res) => {
  const { name, price, category, barcode, min_stock } = req.body;
  const id = Number(req.params.id);
  if (!name?.trim())         return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (!price || price <= 0) return res.status(400).json({ error: 'Preço deve ser maior que zero.' });
  if (!category?.trim())    return res.status(400).json({ error: 'Categoria é obrigatória.' });
  try {
    const r = await db.updateProduct(id, name.trim(), Number(price), category.trim(), barcode?.trim() || null, Number(min_stock) || 10);
    if (r.changes === 0) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json(await db.getProductById(id));
  } catch { res.status(500).json({ error: 'Erro ao atualizar produto.' }); }
});

app.post('/api/products/:id/restock', authenticate, authorize('gerente', 'estoque'), async (req, res) => {
  const id = Number(req.params.id);
  const { qty } = req.body;
  if (!qty || Number(qty) <= 0) return res.status(400).json({ error: 'Quantidade deve ser maior que zero.' });
  try {
    const result = await db.restockProduct(id, Number(qty));
    res.json({ message: 'Estoque atualizado com sucesso!', ...result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Sales ─────────────────────────────────────────────────────────────────────

app.post('/api/sales', authenticate, authorize('gerente', 'caixa'), async (req, res) => {
  const { product_id, quantity_sold } = req.body;
  if (!product_id) return res.status(400).json({ error: 'ID do produto obrigatório.' });
  if (!quantity_sold || quantity_sold <= 0) return res.status(400).json({ error: 'Quantidade deve ser maior que zero.' });
  try {
    const result = await db.executeSale(Number(product_id), Number(quantity_sold));
    res.status(201).json({ message: 'Venda realizada com sucesso!', ...result });
  } catch (e) {
    const isUser = ['Produto não encontrado.', 'Estoque insuficiente para a venda.'].includes(e.message);
    res.status(isUser ? 400 : 500).json({ error: e.message });
  }
});

app.get('/api/sales', authenticate, async (req, res) => {
  try { res.json(await db.getSales()); }
  catch { res.status(500).json({ error: 'Erro ao obter histórico.' }); }
});

// ── PDV Checkout ──────────────────────────────────────────────────────────────

app.post('/api/checkout', authenticate, authorize('gerente', 'caixa'), async (req, res) => {
  const { items, payments, totalAmount, amountPaid, changeAmount } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Carrinho está vazio.' });
  if (!Array.isArray(payments) || payments.length === 0)
    return res.status(400).json({ error: 'Informe ao menos uma forma de pagamento.' });
  if (typeof totalAmount !== 'number' || totalAmount <= 0)
    return res.status(400).json({ error: 'Total da venda inválido.' });
  try {
    const result = await db.checkout(items, payments, totalAmount, Number(amountPaid), Number(changeAmount));
    res.status(201).json({ message: 'Venda finalizada com sucesso!', ...result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/sessions', authenticate, async (req, res) => {
  try { res.json(await db.getSessions()); }
  catch { res.status(500).json({ error: 'Erro ao buscar sessões.' }); }
});

// ── Reports ───────────────────────────────────────────────────────────────────

app.get('/api/reports/summary', authenticate, authorize('gerente', 'estoque'), async (req, res) => {
  try { res.json(await db.reportSummary()); }
  catch { res.status(500).json({ error: 'Erro ao gerar resumo.' }); }
});

app.get('/api/reports/period', authenticate, authorize('gerente', 'estoque'), async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Parâmetros from e to são obrigatórios.' });
  try { res.json(await db.reportByPeriod(from, to)); }
  catch { res.status(500).json({ error: 'Erro ao gerar relatório de período.' }); }
});

app.get('/api/reports/top-products', authenticate, authorize('gerente', 'estoque'), async (req, res) => {
  const { from, to, limit } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Parâmetros from e to são obrigatórios.' });
  try { res.json(await db.reportTopProducts(from, to, Number(limit) || 10)); }
  catch { res.status(500).json({ error: 'Erro ao gerar top produtos.' }); }
});

app.get('/api/reports/categories', authenticate, authorize('gerente', 'estoque'), async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Parâmetros from e to são obrigatórios.' });
  try { res.json(await db.reportByCategory(from, to)); }
  catch { res.status(500).json({ error: 'Erro ao gerar relatório por categoria.' }); }
});

app.get('/api/reports/export', authenticate, authorize('gerente', 'estoque'), async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Parâmetros from e to são obrigatórios.' });
  try {
    const rows = await db.reportDetailedSales(from, to);
    const header = 'ID,Data,Produto,Categoria,Qtd,Preço Unit.,Total\n';
    const csv = rows.map(r =>
      `${r.id},"${r.sale_date}","${r.product_name}","${r.category}",${r.quantity_sold},${r.unit_price.toFixed(2)},${r.total_price.toFixed(2)}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vendas_${from}_${to}.csv"`);
    res.send('\uFEFF' + header + csv); // BOM for Excel UTF-8
  } catch { res.status(500).json({ error: 'Erro ao exportar.' }); }
});

// ── Utility ───────────────────────────────────────────────────────────────────

app.get('/api/network-ip', (req, res) => {
  res.json({ ip: getLocalIp(), port: PORT });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Mobile access:  http://${getLocalIp()}:${PORT}`);
});
