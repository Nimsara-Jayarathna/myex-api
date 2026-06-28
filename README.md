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
