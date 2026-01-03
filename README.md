# Blipzo API

RESTful backend for blipzo that handles authentication, categories, transactions, and spending insights using Node.js, Express, MongoDB, and JWT.

## Features
- JWT auth with register, login, and profile endpoints
- Income/expense categories with limits, defaults, and soft-archive
- Transactions with custom dates, status, and summaries (weekly/monthly/yearly)
- Health check and basic error handling middleware

## Prerequisites
- Node.js 20+
- npm
- MongoDB (local or remote)

## Setup
1) Install dependencies
```bash
npm ci
```
2) Create `.env` in the project root:
```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/blipzo
MONGO_DB_NAME=blipzo
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

## API overview

Detailed documentation for API v1 endpoints can be found in [src/api/v1/README.md](src/api/v1/README.md).

Protected routes read access tokens from HttpOnly cookies (CORS credentials enabled).

### Misc
- `GET /` — ping
- `GET /health` — uptime/status

## Release Notes
Detailed release notes for each version can be found in the [docs/releases](docs/releases/) directory.
- Latest Release: [v1.0.0](docs/releases/v1.0.0.md)

## Deployment notes
GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys:
- `dev` branch → staging 
- `main` branch → production 

