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
# Optional: comma-separated origins for CORS
CLIENT_ORIGIN=http://localhost:5173
```

## Run locally
- Dev (nodemon): `npm run dev`
- Prod mode: `npm start`

## Run with Docker
```bash
docker compose up --build
```
This starts the API on `PORT` (default 5000) and a MongoDB container with a persisted volume.

## API overview
All protected routes require `Authorization: Bearer <token>`.

### Auth
- `POST /api/auth/register` — body: `fname`, `lname`, `email`, `password` (optional `name`)
- `POST /api/auth/login` — body: `email`, `password`
- `GET /api/auth/me` — current user profile

### Categories
- `GET /api/categories?type=income|expense&includeInactive=true` — list categories
- `POST /api/categories` — body: `name`, `type`
- `DELETE /api/categories/:id` — soft-archive (defaults cannot be removed)

### Transactions
- `POST /api/transactions` — body: `type`, `amount`, optional `category` or `categoryId`, `title`, `description`, `status`
- `POST /api/transactions/custom` — same as above plus `date` (required)
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
