require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(express.static('../frontend'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

let db;
let razorpay;

try {
  if (process.env.DATABASE_URL) {
    db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'Intellecta' }));

app.post('/api/order', async (req, res) => {
  try {
    if (razorpay) {
      const order = await razorpay.orders.create({
        amount: 9900,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: { product: 'Intellecta Full Test' }
      });
      res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } else {
      res.json({ orderId: `order_${Date.now()}`, amount: 9900, currency: 'INR' });
    }
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

app.post('/api/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (razorpay && process.env.RAZORPAY_KEY_SECRET) {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
      if (expected !== razorpay_signature) return res.status(400).json({ error: 'Payment verification failed' });
    }
    
    if (db) {
      await db.query(`INSERT INTO payments (order_id, payment_id, amount, status, created_at) VALUES ($1, $2, 99, 'success', NOW())`, [razorpay_order_id, razorpay_payment_id]);
    }
    
    res.json({ success: true, paymentId: razorpay_payment_id });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

app.post('/api/result', async (req, res) => {
  const { name, iqScore, ageGroup, percentile, isPaid, paymentId } = req.body;
  const certId = `IQ-${uuidv4().substring(0,8).toUpperCase()}`;
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

app.get('/api/leaderboard', async (req, res) => {
  try {
    const { ageGroup, limit = 20 } = req.query;
    if (db) {
      let query = `SELECT name, iq_score, age_group, percentile, created_at FROM results WHERE is_paid = true`;
      const params = [];
      if (ageGroup) { query += ` AND age_group = $1`; params.push(ageGroup); }
      query += ` ORDER BY iq_score DESC LIMIT ${parseInt(limit)}`;
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

app.get('/api/certificate/:certId', async (req, res) => {
  try {
    if (db) {
      const { rows } = await db.query(`SELECT name, iq_score, age_group, percentile, cert_id, created_at FROM results WHERE cert_id = $1`, [req.params.certId]);
      if (!rows.length) return res.status(404).json({ error: 'Certificate not found' });
      res.json(rows[0]);
    } else {
      res.json({ 
        name: 'Test User', 
        iq_score: 120, 
        age_group: 'adults', 
        percentile: 90, 
        cert_id: req.params.certId, 
        created_at: new Date().toISOString() 
      });
    }
  } catch (err) {
    console.error('Certificate error:', err);
    res.status(404).json({ error: 'Certificate not found' });
  }
});

app.listen(PORT, () => console.log(`Intellecta server running on port ${PORT}`));
