# NexaBank — Deployment Guide

A full-stack banking SPA with **Vercel** hosting + **Vercel Postgres (Neon)** database.

---

## Project Structure

```
nexabank/
├── api/
│   ├── auth/
│   │   ├── register.js      POST /api/auth/register
│   │   ├── login.js         POST /api/auth/login
│   │   └── me.js            GET  /api/auth/me
│   ├── accounts/
│   │   ├── index.js         GET  /api/accounts
│   │   └── open.js          POST /api/accounts/open
│   └── transactions/
│       ├── index.js         GET  /api/transactions
│       ├── transfer.js      POST /api/transactions/transfer
│       └── pay.js           POST /api/transactions/pay
├── lib/
│   ├── db.js                Shared auth + DB helpers
│   └── migrate.js           Database schema migration
├── public/
│   └── index.html           The complete SPA frontend
├── vercel.json              Vercel routing config
├── package.json
└── README.md
```

---

## Step 1 — Prerequisites

- A [Vercel account](https://vercel.com) (free tier works)
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- [Node.js 18+](https://nodejs.org)
- Git installed

---

## Step 2 — Create a Vercel Postgres Database

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Storage** in the left sidebar
3. Click **Create Database** → select **Postgres (Neon)**
4. Name it `nexabank-db` → click **Create**
5. Once created, click **Connect to Project** — or copy the env variables manually

This gives you these environment variables (copy them):
```
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=
```

---

## Step 3 — Set Environment Variables

You also need a JWT secret. Add all these to your Vercel project:

```bash
# In Vercel Dashboard → Project → Settings → Environment Variables
JWT_SECRET=your-super-secret-key-change-this-to-something-random-32-chars
POSTGRES_URL=<from step 2>
POSTGRES_PRISMA_URL=<from step 2>
POSTGRES_URL_NON_POOLING=<from step 2>
POSTGRES_USER=<from step 2>
POSTGRES_HOST=<from step 2>
POSTGRES_PASSWORD=<from step 2>
POSTGRES_DATABASE=<from step 2>
```

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 4 — Deploy to Vercel

```bash
# Clone / enter your project folder
cd nexabank

# Install dependencies
npm install

# Login to Vercel
vercel login

# Deploy (follow the prompts — link to your project)
vercel --prod
```

Vercel will:
1. Install dependencies
2. Run `node lib/migrate.js` (creates all DB tables)
3. Deploy the API functions
4. Serve `public/index.html` as the SPA

---

## Step 5 — Run Database Migration Manually (if needed)

If the build command didn't run automatically:

```bash
# Set env vars locally first
export POSTGRES_URL="your-connection-string"
export JWT_SECRET="your-secret"

node lib/migrate.js
```

---

## Step 6 — Test Locally with Vercel Dev

```bash
# Create .env.local with your variables
cat > .env.local << EOF
POSTGRES_URL=your_connection_string
POSTGRES_URL_NON_POOLING=your_non_pooling_url
JWT_SECRET=your_secret
EOF

# Start local dev server
vercel dev
```

Then open: `http://localhost:3000`

---

## Database Schema (auto-created by migrate.js)

| Table | Purpose |
|-------|---------|
| `users` | User accounts, credentials, personal info |
| `accounts` | Bank accounts (current, savings, investment) |
| `transactions` | All transactions with full audit trail |
| `cards` | Card details and limits |
| `standing_orders` | Recurring payment schedules |
| `savings_goals` | User saving goals with progress |

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user + open first account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET  | `/api/auth/me` | Get current user + accounts |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List all user accounts |
| POST | `/api/accounts/open` | Open a new account |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (filter by accountId, type, search) |
| POST | `/api/transactions/transfer` | Transfer between accounts or to external |
| POST | `/api/transactions/pay` | Pay a bill |

---

## OTP Verification (Anti-Bot)

The registration flow uses an **on-screen OTP** approach:
- A random 6-digit code is **displayed prominently** on the page
- The user must type exactly that code into the input box below
- The code changes if the user clicks "Generate new code"
- This proves the user is a real human reading the screen
- No email/SMS infrastructure required

---

## Security Notes

- Passwords hashed with **bcryptjs** (cost factor 12)
- Auth via **JWT** (7-day expiry)
- All API routes validate the bearer token
- Input validation on all endpoints
- SQL injection prevented by parameterized queries (`@vercel/postgres` tagged templates)
- CORS headers set for all API routes

---

## Customisation

- Change bank name: search `NexaBank` in `public/index.html`
- Change brand colour: update `--or` CSS variable (currently `#FF6200`)
- Add more API routes: create files in `api/` following the existing pattern
- Extend the schema: add migrations to `lib/migrate.js`
