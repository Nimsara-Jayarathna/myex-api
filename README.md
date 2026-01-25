# Blipzo API

REST API for Blipzo. Provides authentication, categories, transactions, currency preferences, and reporting via Node.js, Express, and MongoDB.

## Quickstart
```bash
npm ci
cp .env.example .env
npm run dev
```
Health check:
```bash
curl http://localhost:5000/health
```

## Features
- JWT auth with register, login, refresh, and profile endpoints
- Income/expense categories with limits, defaults, and soft-archive
- Transactions with custom dates, status, and summaries (weekly/monthly/yearly)
- Currency selection (v1.1) and standardized error responses
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

### Environment variables
| Name | Required | Example | Notes |
| --- | --- | --- | --- |
| PORT | Yes | 5000 | API port |
| MONGO_URI | Yes | mongodb://localhost:27017/blipzo | Mongo connection |
| MONGO_DB_NAME | Yes | blipzo | Database name |
| JWT_SECRET | Yes | replace_me | Signing key |
| JWT_EXPIRES_IN | Yes | 7d | Access token TTL |
| BCRYPT_ROUNDS | Yes | 10 | Password hashing cost |
| ACCESS_TOKEN_EXPIRES_IN | Yes | 15m | Cookie auth access token TTL |
| REFRESH_TOKEN_EXPIRES_IN | Yes | 7d | Refresh token TTL |
| COOKIE_SAMESITE | Yes | lax | Use `none` for cross-site HTTPS |
| COOKIE_SECURE | Yes | true | Use `false` for local HTTP |
| COOKIE_DOMAIN | Yes | localhost | Match API host |
| CLIENT_ORIGIN | No | http://localhost:5173 | CORS origin (credentials) |

Frontend should call the API using the same host as the cookie domain and listed CORS origin (e.g., `http://localhost:5000` with `CLIENT_ORIGIN=http://localhost:5173`). If you use `127.0.0.1` or a custom domain, set `COOKIE_DOMAIN` and `CLIENT_ORIGIN` to match and restart the API.

Local dev (same-site localhost): use `COOKIE_SAMESITE=lax`, `COOKIE_SECURE=false`, `COOKIE_DOMAIN=localhost`, and call API at `http://localhost:5000` from `http://localhost:5173` with credentials included.

Prod cross-site (different subdomains): use `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`, `COOKIE_DOMAIN=your-api-host` (e.g., `api.example.com`), `CLIENT_ORIGIN` set to your frontend origin, and call the API over HTTPS with credentials.

## Run locally
- Dev (nodemon): `npm run dev`
- Prod mode: `npm start`

## Scripts
- `npm run dev` - start with nodemon
- `npm start` - start in production mode
- `npm run lint` - run ESLint
- `npm test` - run tests

## Documentation

Brief overview of what is available:

API docs:
- `docs/api/api-overview.md` - concise summary across versions
- `docs/api/v1.1.0.md` - current API, full request/response details
- `docs/api/v1.0.0.md` - legacy API, full request/response details

Release notes:
- `docs/releases/v1.1.0.md` - latest release notes
- `docs/releases/v1.0.0.md` - previous release notes

## API overview

Protected routes read access tokens from HTTP-only cookies (CORS credentials enabled).

API versioning is documented in `docs/api/api-overview.md`. Error format details are in `docs/api/v1.1.0.md`.

### Misc
- `GET /` - ping
- `GET /health` - uptime/status

## Release Notes
Detailed release notes for each version can be found in `docs/releases/`.
- Latest Release: [v1.1.0](docs/releases/v1.1.0.md)
- Previous Releases: [v1.0.0](docs/releases/v1.0.0.md)

## Deployment notes
GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys:
- `dev` branch -> staging
- `main` branch -> production

## Project structure
- `src/` - application source
- `docs/` - API docs and release notes
- `tests/` - automated tests

## Troubleshooting
- Cookie/CORS mismatch: ensure `COOKIE_DOMAIN` matches the API host you call, and `CLIENT_ORIGIN` matches the frontend origin.
- Local dev: prefer `localhost` over `127.0.0.1` unless you update both `COOKIE_DOMAIN` and `CLIENT_ORIGIN`.
