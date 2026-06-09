# Intellecta — Professional IQ Assessment App
## Developer Handoff Guide

---

## Project Overview
Intellecta is a complete IQ assessment platform with:
- Free test (10 questions) + Paid test (40 questions) — ₹99
- 4 age groups: Kids (6-12), Teens (13-17), Adults (18-40), Seniors (40+)
- 3 languages: English, Hindi, Tamil
- Certificate generator (nature scene for kids, parchment for adults)
- Global leaderboard
- Social sharing
- Admin dashboard
- PWA (installable on Android/iPhone)
- Payment via Razorpay (UPI, Card, Net Banking, Wallets)

---

## Project Structure
```
intellecta-project/
├── frontend/
│   └── index.html          ← Complete app (self-contained)
├── pwa/
│   ├── manifest.json       ← PWA manifest
│   └── sw.js               ← Service worker
├── backend/
│   ├── server.js           ← Node.js + Express API
│   ├── schema.sql          ← PostgreSQL database
│   ├── package.json        ← Dependencies
│   └── .env.example        ← Environment variables
├── docs/
│   └── README.md           ← This file
├── render.yaml             ← Render.com deployment
├── vercel.json             ← Vercel deployment
└── .gitignore
```

---

## YOUR 5 TASKS

### Task 1 — Deploy Frontend to Vercel (2 hours)
1. Login to Vercel → Team: Intellecta1
2. Click "Add New Project"
3. Upload the frontend folder OR connect GitHub repo
4. Deploy — get URL like intellecta.vercel.app
5. Connect custom domain: intellecta.co.in

### Task 2 — Deploy Backend to Render.com (2 hours)
1. Login to Render.com
2. New → Web Service
3. Connect GitHub repo (backend folder)
4. Set environment variables from .env.example
5. Add Razorpay keys in environment variables
6. Deploy

### Task 3 — Set up PostgreSQL Database (1 hour)
1. On Render.com → New → PostgreSQL
2. Create database named: intellecta
3. Run schema.sql to create all tables
4. Copy DATABASE_URL and add to backend environment variables

### Task 4 — Connect Razorpay (2 hours)
1. Add Razorpay TEST keys to backend environment variables:
   - RAZORPAY_KEY_ID = rzp_test_XXXXXXXXXX
   - RAZORPAY_KEY_SECRET = XXXXXXXXXXXXXXXXXX
2. Update frontend index.html — find processPayment() function
3. Add Razorpay checkout SDK
4. Test a payment in test mode

### Task 5 — Testing & Handover (1 hour)
1. Test all 4 age groups
2. Test free test and paid test
3. Test payment flow
4. Test certificate generation
5. Test admin dashboard — login: admin / admin123
6. Change admin password
7. Share live URL with client

---

## DOMAIN SETUP
- Domain: intellecta.co.in (GoDaddy)
- Point domain to Vercel:
  1. Login to GoDaddy
  2. Go to DNS settings for intellecta.co.in
  3. Add CNAME record: www → cname.vercel-dns.com
  4. Add A record: @ → 76.76.21.21
  5. In Vercel → Project Settings → Domains → Add intellecta.co.in

---

## IMPORTANT NOTES
- Frontend is 100% complete — do NOT modify the UI
- Backend code is ready — just needs environment variables
- Database schema is ready — just run schema.sql
- Admin dashboard login: admin / admin123 — CHANGE AFTER DEPLOYMENT
- Use TEST keys first, switch to LIVE keys after testing

---

## TECH STACK
- Frontend: Vanilla HTML/CSS/JS (no framework needed)
- Backend: Node.js + Express
- Database: PostgreSQL
- Payments: Razorpay
- Frontend hosting: Vercel (free)
- Backend hosting: Render.com (free)
- Domain: intellecta.co.in (GoDaddy)

---

## SUPPORT
Client: Joseph Kumar
Domain: intellecta.co.in
Admin: admin / admin123
