require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Disabled helmet for local testing to avoid CSP issues with inline scripts
// app.use(helmet()); 

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

// Avoid stale app shell/service worker caching during active development.
app.use((req, res, next) => {
  if (
    req.path === '/' ||
    req.path.endsWith('.html') ||
    req.path === '/sw.js' ||
    req.path === '/manifest.json'
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));
// Serve PWA static files
app.use(express.static(path.join(__dirname, '../pwa')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

let db;
let razorpay;

const SCORE_BUCKETS = ['<80', '80-89', '90-99', '100-109', '110-119', '120-129', '130+'];
const AGE_GROUP_ORDER = ['kids', 'teens', 'adults', 'seniors'];

try {
  if (process.env.DATABASE_URL) {
    const shouldUseSsl = process.env.DATABASE_SSL === 'false'
      ? false
      : !/localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL);
    db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false
    });
    console.log('Database connection configured');
  }
} catch (err) {
  console.warn('Database not configured, using mock mode');
}

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('Razorpay configured');
  }
} catch (err) {
  console.warn('Razorpay not configured, using mock mode');
}

async function ensureDatabaseSchema() {
  if (!db) return;
  await db.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`);
}

if (db) {
  ensureDatabaseSchema()
    .then(() => console.log('Database schema checked'))
    .catch((err) => console.warn('Database schema check failed:', err.message));
}

function emptyAdminDashboard() {
  return {
    overview: {
      totalUsers: 0,
      totalTests: 0,
      totalRevenue: 0,
      certificatesIssued: 0,
      conversionRate: null,
      averageRating: null
    },
    revenue: {
      thisWeek: 0,
      thisMonth: 0,
      averageOrderValue: 0,
      paidTestsThisMonth: 0
    },
    analytics: {
      averageIqScore: null,
      completionRate: null,
      averageTimeMinutes: null,
      retakesPerUser: null
    },
    charts: {
      testsLast7Days: [],
      revenueLast7Days: [],
      scoreDistribution: SCORE_BUCKETS.map((label) => ({ label, value: 0 })),
      iqByAge: []
    },
    breakdowns: {
      ageGroups: [],
      paymentMethods: []
    },
    recentUsers: [],
    recentTransactions: [],
    alerts: []
  };
}

function recentDayLabels(days = 7) {
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  const values = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const iso = date.toISOString().slice(0, 10);
    values.push({ key: iso, label: formatter.format(date) });
  }
  return values;
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'Intellecta' }));

app.post('/api/order', async (req, res) => {
  try {
    // #region debug-point B:order-entry
    fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'razorpay-checkout-bug',runId:'pre-fix',hypothesisId:'B',location:'backend/server.js:/api/order',msg:'[DEBUG] /api/order entered',data:{hasRazorpay:!!razorpay,hasKeyId:!!process.env.RAZORPAY_KEY_ID,hasKeySecret:!!process.env.RAZORPAY_KEY_SECRET},ts:Date.now()})}).catch(()=>{});
    // #endregion
    if (razorpay) {
      const order = await razorpay.orders.create({
        amount: 9900,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: { product: 'Intellecta Full Test' }
      });
      // #region debug-point C:order-created
      fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'razorpay-checkout-bug',runId:'pre-fix',hypothesisId:'C',location:'backend/server.js:/api/order:create',msg:'[DEBUG] Razorpay order created',data:{orderId:order.id,amount:order.amount,currency:order.currency,keyId:process.env.RAZORPAY_KEY_ID||null},ts:Date.now()})}).catch(()=>{});
      // #endregion
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentMode: 'razorpay'
      });
    } else {
      // #region debug-point C:order-mock
      fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'razorpay-checkout-bug',runId:'post-fix',hypothesisId:'C',location:'backend/server.js:/api/order:unconfigured',msg:'[DEBUG] Razorpay is not configured on the backend',data:{reason:'missing key id or secret'},ts:Date.now()})}).catch(()=>{});
      // #endregion
      return res.status(503).json({ error: 'Payment gateway is not configured on the server' });
    }
  } catch (err) {
    // #region debug-point C:order-error
    fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'razorpay-checkout-bug',runId:'pre-fix',hypothesisId:'C',location:'backend/server.js:/api/order:catch',msg:'[DEBUG] /api/order threw',data:{error:err&&err.message?err.message:String(err)},ts:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

app.post('/api/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;
    // #region debug-point E:verify-entry
    fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'razorpay-checkout-bug',runId:'pre-fix',hypothesisId:'E',location:'backend/server.js:/api/verify',msg:'[DEBUG] /api/verify entered',data:{hasRazorpay:!!razorpay,hasSignature:!!razorpay_signature,orderId:razorpay_order_id||null,paymentId:razorpay_payment_id||null},ts:Date.now()})}).catch(()=>{});
    // #endregion
    
    if (razorpay && process.env.RAZORPAY_KEY_SECRET) {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
      // #region debug-point E:verify-compare
      fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'razorpay-checkout-bug',runId:'pre-fix',hypothesisId:'E',location:'backend/server.js:/api/verify:compare',msg:'[DEBUG] signature comparison complete',data:{matches:expected===razorpay_signature},ts:Date.now()})}).catch(()=>{});
      // #endregion
      if (expected !== razorpay_signature) return res.status(400).json({ error: 'Payment verification failed' });
    }
    
    if (db) {
      await ensureDatabaseSchema();
      await db.query(
        `INSERT INTO payments (order_id, payment_id, amount, payment_method, status, created_at)
         VALUES ($1, $2, 99, $3, 'success', NOW())`,
        [razorpay_order_id, razorpay_payment_id, method || 'Unknown']
      );
    }
    
    res.json({ success: true, paymentId: razorpay_payment_id });
  } catch (err) {
    // #region debug-point E:verify-error
    fetch('http://127.0.0.1:7777/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'razorpay-checkout-bug',runId:'pre-fix',hypothesisId:'E',location:'backend/server.js:/api/verify:catch',msg:'[DEBUG] /api/verify threw',data:{error:err&&err.message?err.message:String(err)},ts:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

app.post('/api/result', async (req, res) => {
  const { name, iqScore, ageGroup, percentile, isPaid, paymentId } = req.body;
  const certId = isPaid ? `IQ-${uuidv4().substring(0,8).toUpperCase()}` : null;
  try {
    if (db) {
      const result = await db.query(
        `INSERT INTO results (name, iq_score, age_group, percentile, is_paid, payment_id, cert_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING id`,
        [name, iqScore, ageGroup, percentile, isPaid, paymentId || null, certId]
      );
      res.json({ success: true, certId, resultId: result.rows[0].id });
    } else {
      res.json({ success: true, certId, resultId: Date.now() });
    }
  } catch (err) {
    console.error('Save result error:', err);
    res.status(500).json({ error: 'Could not save result' });
  }
});

app.patch('/api/result/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    if (!db) return res.json({ success: true, updated: false });

    const result = await db.query(
      `UPDATE results SET name = $1 WHERE id = $2 RETURNING id, name`,
      [name.trim(), req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Result not found' });
    res.json({ success: true, result: result.rows[0] });
  } catch (err) {
    console.error('Update result error:', err);
    res.status(500).json({ error: 'Could not update result' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const { ageGroup, period = 'all', limit = 20 } = req.query;
    if (db) {
      let query = `SELECT id, COALESCE(NULLIF(BTRIM(name), ''), 'Anonymous User') AS name, iq_score, age_group, percentile, created_at FROM results WHERE is_paid = true`;
      const params = [];
      let paramIndex = 1;
      if (ageGroup) {
        query += ` AND age_group = $${paramIndex++}`;
        params.push(ageGroup);
      }
      if (period === 'week') {
        query += ` AND created_at >= NOW() - INTERVAL '7 days'`;
      }
      query += ` ORDER BY iq_score DESC, created_at ASC LIMIT ${Math.max(1, Math.min(parseInt(limit, 10) || 20, 100))}`;
      const { rows } = await db.query(query, params);
      res.json(rows);
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.json([]);
  }
});

app.get('/api/admin/dashboard', async (req, res) => {
  if (!db) return res.json(emptyAdminDashboard());

  try {
    await ensureDatabaseSchema();

    const [
      distinctUsersResult,
      overviewResult,
      revenueStatsResult,
      testsByDayResult,
      revenueByDayResult,
      scoreDistributionResult,
      iqByAgeResult,
      ageGroupsResult,
      paymentMethodsResult,
      recentUsersResult,
      recentTransactionsResult
    ] = await Promise.all([
      db.query(`
        SELECT COUNT(*) AS total_users
        FROM (
          SELECT CASE
            WHEN name IS NULL OR BTRIM(name) = '' OR LOWER(BTRIM(name)) IN ('anonymous user', 'paid user')
              THEN CONCAT('result-', id)
            ELSE LOWER(BTRIM(name))
          END AS user_key
          FROM results
        ) AS user_keys
      `),
      db.query(`
        SELECT
          COUNT(*) AS total_tests,
          COUNT(*) FILTER (WHERE is_paid = true) AS paid_tests,
          COUNT(*) FILTER (WHERE is_paid = true AND cert_id IS NOT NULL) AS certificates_issued,
          ROUND(AVG(iq_score)::numeric, 1) AS average_iq_score,
          ROUND((COUNT(*) FILTER (WHERE is_paid = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS conversion_rate
        FROM results
      `),
      db.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS total_revenue,
          COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND created_at >= date_trunc('week', NOW())), 0) AS this_week,
          COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND created_at >= date_trunc('month', NOW())), 0) AS this_month,
          COALESCE(ROUND(AVG(amount) FILTER (WHERE status = 'success')), 0) AS average_order_value,
          COUNT(*) FILTER (WHERE status = 'success' AND created_at >= date_trunc('month', NOW())) AS paid_tests_this_month
        FROM payments
      `),
      db.query(`
        SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day_key, COUNT(*)::int AS value
        FROM results
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY 1
        ORDER BY 1
      `),
      db.query(`
        SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day_key, COALESCE(SUM(amount), 0)::int AS value
        FROM payments
        WHERE status = 'success' AND created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY 1
        ORDER BY 1
      `),
      db.query(`
        SELECT
          CASE
            WHEN iq_score < 80 THEN '<80'
            WHEN iq_score BETWEEN 80 AND 89 THEN '80-89'
            WHEN iq_score BETWEEN 90 AND 99 THEN '90-99'
            WHEN iq_score BETWEEN 100 AND 109 THEN '100-109'
            WHEN iq_score BETWEEN 110 AND 119 THEN '110-119'
            WHEN iq_score BETWEEN 120 AND 129 THEN '120-129'
            ELSE '130+'
          END AS bucket,
          COUNT(*)::int AS value
        FROM results
        GROUP BY 1
      `),
      db.query(`
        SELECT age_group, ROUND(AVG(iq_score)::numeric, 1) AS avg_iq, COUNT(*)::int AS total
        FROM results
        GROUP BY age_group
      `),
      db.query(`
        SELECT age_group, COUNT(*)::int AS total
        FROM results
        GROUP BY age_group
      `),
      db.query(`
        SELECT COALESCE(NULLIF(BTRIM(payment_method), ''), 'Unknown') AS method, COUNT(*)::int AS total
        FROM payments
        WHERE status = 'success'
        GROUP BY 1
        ORDER BY total DESC, method ASC
      `),
      db.query(`
        SELECT
          id,
          COALESCE(NULLIF(BTRIM(name), ''), 'Anonymous User') AS name,
          age_group,
          iq_score,
          is_paid,
          created_at
        FROM results
        ORDER BY created_at DESC
        LIMIT 20
      `),
      db.query(`
        SELECT
          p.payment_id,
          p.order_id,
          COALESCE(NULLIF(BTRIM(r.name), ''), 'Anonymous User') AS name,
          p.amount,
          COALESCE(NULLIF(BTRIM(p.payment_method), ''), 'Unknown') AS payment_method,
          p.status,
          p.created_at
        FROM payments p
        LEFT JOIN results r ON r.payment_id = p.payment_id
        ORDER BY p.created_at DESC
        LIMIT 20
      `)
    ]);

    const daySeries = recentDayLabels(7);
    const testsByDayMap = new Map(testsByDayResult.rows.map((row) => [row.day_key, toNumber(row.value)]));
    const revenueByDayMap = new Map(revenueByDayResult.rows.map((row) => [row.day_key, toNumber(row.value)]));
    const scoreDistributionMap = new Map(scoreDistributionResult.rows.map((row) => [row.bucket, toNumber(row.value)]));
    const iqByAgeMap = new Map(iqByAgeResult.rows.map((row) => [row.age_group, row]));
    const ageGroupsMap = new Map(ageGroupsResult.rows.map((row) => [row.age_group, toNumber(row.total)]));

    const overview = overviewResult.rows[0] || {};
    const revenue = revenueStatsResult.rows[0] || {};
    const totalUsers = toNumber(distinctUsersResult.rows[0] && distinctUsersResult.rows[0].total_users);
    const totalTests = toNumber(overview.total_tests);

    res.json({
      overview: {
        totalUsers,
        totalTests,
        totalRevenue: toNumber(revenue.total_revenue),
        certificatesIssued: toNumber(overview.certificates_issued),
        conversionRate: overview.conversion_rate === null ? null : toNumber(overview.conversion_rate),
        averageRating: null
      },
      revenue: {
        thisWeek: toNumber(revenue.this_week),
        thisMonth: toNumber(revenue.this_month),
        averageOrderValue: toNumber(revenue.average_order_value),
        paidTestsThisMonth: toNumber(revenue.paid_tests_this_month)
      },
      analytics: {
        averageIqScore: overview.average_iq_score === null ? null : toNumber(overview.average_iq_score),
        completionRate: null,
        averageTimeMinutes: null,
        retakesPerUser: totalUsers > 0 ? Number((totalTests / totalUsers).toFixed(2)) : null
      },
      charts: {
        testsLast7Days: daySeries.map((day) => ({ label: day.label, value: testsByDayMap.get(day.key) || 0 })),
        revenueLast7Days: daySeries.map((day) => ({ label: day.label, value: revenueByDayMap.get(day.key) || 0 })),
        scoreDistribution: SCORE_BUCKETS.map((label) => ({ label, value: scoreDistributionMap.get(label) || 0 })),
        iqByAge: AGE_GROUP_ORDER
          .filter((group) => iqByAgeMap.has(group))
          .map((group) => ({
            key: group,
            averageIq: toNumber(iqByAgeMap.get(group).avg_iq),
            total: toNumber(iqByAgeMap.get(group).total)
          }))
      },
      breakdowns: {
        ageGroups: AGE_GROUP_ORDER
          .filter((group) => ageGroupsMap.has(group))
          .map((group) => ({ key: group, total: ageGroupsMap.get(group) || 0 })),
        paymentMethods: paymentMethodsResult.rows.map((row) => ({
          label: row.method,
          total: toNumber(row.total)
        }))
      },
      recentUsers: recentUsersResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        ageGroup: row.age_group,
        iqScore: row.iq_score,
        testType: row.is_paid ? 'Paid' : 'Free',
        createdAt: row.created_at
      })),
      recentTransactions: recentTransactionsResult.rows.map((row) => ({
        transactionId: row.payment_id || row.order_id,
        user: row.name,
        amount: toNumber(row.amount),
        method: row.payment_method,
        status: row.status,
        createdAt: row.created_at
      })),
      alerts: []
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.json(emptyAdminDashboard());
  }
});

app.get('/api/certificate/:certId', async (req, res) => {
  try {
    if (db) {
      const { rows } = await db.query(`SELECT name, iq_score, age_group, percentile, cert_id, created_at FROM results WHERE cert_id = $1`, [req.params.certId]);
      if (!rows.length) return res.status(404).json({ error: 'Certificate not found' });
      res.json(rows[0]);
    } else {
      res.status(503).json({ error: 'Database is not configured' });
    }
  } catch (err) {
    console.error('Certificate error:', err);
    res.status(404).json({ error: 'Certificate not found' });
  }
});

app.listen(PORT, () => console.log(`Intellecta server running on port ${PORT}`));
