# Blipzo API — NestJS Modular Monolith

This is the updated NestJS codebase based on the original Express/Mongo API.

## Routing decision

- Public API is versioned:
  - `/api/v1/*`
  - `/api/v1.1/*`
  - future placeholder: `/api/v2/*`
- Internal admin API is not public-versioned:
  - `/internal/admin/*`

## Admin modules

Admin is separated into modular domains:

- `admin/auth`
- `admin/users`
- `admin/categories`
- `admin/currencies`
- `admin/dashboard`
- `admin/system`
- `admin/audit`

## Quality gates

The project includes:

- TypeScript strict mode
- ESLint
- Prettier
- lint-staged
- Husky pre-commit hook
- Jest unit tests
- MongoDB integration test structure
- Supertest e2e test structure
- MongoDB data/index migrations
- Seeders for admin and currencies

## Common commands

```bash
npm install
npm run start:dev
npm run lint
npm run format:check
npm run test
npm run test:e2e
npm run migration:up
npm run seed:admin
npm run seed:currencies
```
