# Blipzo API — NestJS Modular Refactor

This branch converts the Express codebase into a NestJS modular monolith while keeping the main branch API response contracts as the source of truth.

## Route contract

Public API routes remain versioned:

```txt
/api/v1/*
/api/v1.1/*
```

Internal admin routes are intentionally unversioned and moved to:

```txt
/internal/admin/*
```

## Response contract alignment

The NestJS response layer is route-aware:

```txt
/api/v1/*                         legacy raw response format
/api/v1.1 inherited v1 routes     legacy raw response format
/api/v1.1 new routes              { success, message, data }
/internal/admin/*                 { success, message, data, meta }
```

Errors are also route-aware:

```txt
/api/v1/*                         { message, errors?, stack? }
/api/v1.1/*                       { success: false, error: { code, message, details } }
/internal/admin/*                 { success: false, message, meta, errors? }
```

## Admin modules

Admin functionality is split into submodules:

```txt
src/modules/admin/auth
src/modules/admin/users
src/modules/admin/categories
src/modules/admin/currencies
src/modules/admin/dashboard
src/modules/admin/system
src/modules/admin/audit
```

Admin HTTP controllers live under:

```txt
src/interfaces/http/admin
```

## Public API version modules

Public versioned controllers live under:

```txt
src/interfaces/http/public/v1
src/interfaces/http/public/v1_1
src/interfaces/http/public/v2
```

Business logic is shared through:

```txt
src/modules/*
```

## Quality gates

Included:

- TypeScript strict mode
- ESLint
- Prettier
- lint-staged
- Husky pre-commit hook
- Unit test structure
- Integration test structure with mongodb-memory-server
- E2E test structure with Supertest/Nest test app
- MongoDB data/index migrations
- Seeders

## Main commands

```bash
npm install
npm run lint
npm run format:check
npm run test
npm run test:e2e
npm run build
npm run migration:up
```

## Migration rule

MongoDB migrations are used for production-safe document/index changes. Seeders are separate and only for default startup data.

```txt
migrations = versioned data/index/schema changes
seeders    = default data bootstrap
```

## Runtime scripts

Use these scripts for local development, debugger sessions, and production/live release runs:

```bash
npm run start:dev            # local development, watch mode, debug-level structured logs
npm run start:debug          # local development with Node inspector on 0.0.0.0:9229
npm run release              # lint + format check + tests + build
npm run live:release         # build and run dist/main.js with NODE_ENV=production
npm run live:debug           # build and run dist/main.js with inspector + debug logs
npm run start:release        # run already-built dist/main.js
npm run start:release:debug  # run already-built dist/main.js with inspector
```

`LOG_LEVEL=debug` enables request start/finish logs. Request bodies are redacted and are not logged unless `DEBUG_LOG_BODY=true`; even then, sensitive fields such as passwords, tokens, cookies, and OTPs are redacted.

## Express 5 query sanitization fix

The previous Nest bootstrap used `express-mongo-sanitize` as global middleware. With Express 5, `req.query` is getter-only, so middleware that assigns back to `req.query` can fail with:

```txt
Cannot set property query of #<IncomingMessage> which has only a getter
```

This branch replaces that middleware with `src/common/middleware/no-sql-sanitization.middleware.ts`, which safely sanitizes `body`, `params`, and `query` without using the incompatible middleware behavior. Because the old middleware was global, the issue could affect more than only login; login was simply the endpoint where it surfaced first.

## Package lock note

The uploaded branch contained a stale Express-era `package-lock.json` that did not include the NestJS dependencies. It was removed so installs do not use the wrong dependency graph. Run `npm install` once after pulling this branch and commit the newly generated `package-lock.json` from your environment if you want deterministic `npm ci` builds.
