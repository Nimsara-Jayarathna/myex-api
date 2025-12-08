# MyEx API

RESTful backend for MyEx that handles authentication, categories, transactions, and spending insights using Node.js, Express, MongoDB, and JWT.

## Features
- JWT auth with register, login, and profile endpoints
- Income/expense categories with limits, defaults, and soft-archive
- Transactions with custom dates, status, and summaries (weekly/monthly/yearly)
- Health check and basic error handling middleware
- Docker + Docker Compose for local/dev parity

## Prerequisites
- Node.js 20+
- npm
- MongoDB (local or remote) or Docker for `docker-compose`

## Setup
1) Install dependencies
```bash
npm ci
```
2) Create `.env` in the project root:
```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/myex
MONGO_DB_NAME=myex
JWT_SECRET=replace_me
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
# Auth tokens/cookies
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_SAMESITE=lax   # or none for cross-site HTTPS
COOKIE_SECURE=true    # set false only for local HTTP
COOKIE_DOMAIN=localhost # set to your API domain in prod (e.g., api.example.com)
# Optional: comma-separated origins for CORS (enables credentials)
CLIENT_ORIGIN=http://localhost:5173
```

Frontend should call the API using the same host as the cookie domain and listed CORS origin (e.g., `http://localhost:5000` with `CLIENT_ORIGIN=http://localhost:5173`). If you use `127.0.0.1` or a custom domain, set `COOKIE_DOMAIN` and `CLIENT_ORIGIN` to match and restart the API.

Local dev (same-site localhost): use `COOKIE_SAMESITE=lax`, `COOKIE_SECURE=false`, `COOKIE_DOMAIN=localhost`, and call API at `http://localhost:5000` from `http://localhost:5173` with credentials included.

Prod cross-site (different subdomains): use `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`, `COOKIE_DOMAIN=your-api-host` (e.g., `api.example.com`), `CLIENT_ORIGIN` set to your frontend origin, and call the API over HTTPS with credentials.

## Run locally
- Dev (nodemon): `npm run dev`
- Prod mode: `npm start`

## Run with Docker
```bash
docker compose up --build
```
This starts the API on `PORT` (default 5000) and a MongoDB container with a persisted volume.

## API overview
Protected routes read access tokens from HttpOnly cookies (CORS credentials enabled).

### Auth
- `POST /api/auth/register` — body: `fname`, `lname`, `email`, `password` (optional `name`)
- `POST /api/auth/login` — body: `email`, `password`
- `GET /api/auth/me` — current user profile
- `GET /api/auth/session` — validate access cookie and return `{ user }`
- `POST /api/auth/refresh` — rotate access/refresh cookies or 401/419
- `POST /api/auth/logout` — clear auth cookies

### Categories
- `GET /api/categories?type=income|expense&includeInactive=true` — list categories
- `POST /api/categories` — body: `name`, `type`
- `PATCH /api/categories/:id` — body: `isDefault=true` to set the default category for that type (also updates user defaults)
- `DELETE /api/categories/:id` — soft-archive (defaults cannot be removed)

### Transactions
- `POST /api/transactions` — body: `type`, `amount`, optional `category` or `categoryId`, `title`, `description`, `status`, optional `date` (uses provided date and marks `isCustomDate=true`)
- `POST /api/transactions/custom` — same as above with `date` required
- `GET /api/transactions?status=active|undone` — list for user
- `GET /api/transactions/summary` — income/expense totals + weekly/monthly/yearly breakdowns
- `PUT /api/transactions/:id` — update fields (type/category/date/etc.)
- `DELETE /api/transactions/:id` — delete

### Misc
- `GET /` — ping
- `GET /health` — uptime/status

## Deployment notes
GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys:
- `dev` branch → staging 
- `main` branch → production 
