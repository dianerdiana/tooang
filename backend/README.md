# Tooang Backend

REST API for the Tooang frontend, built with [NestJS](https://nestjs.com/) and TypeScript. The application provides the server-side foundation for authentication, user management, and the project's food-menu, cart, review, and ordering features.

> This README includes placeholders marked with `TODO`. Replace them as the project and deployment workflow evolve.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Usage](#api-usage)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

This backend exposes a versioned REST API consumed by the Tooang frontend. It follows a modular-monolith architecture in which each feature is organized as a NestJS module using the following flow:

```text
HTTP request -> Controller -> Service -> Repository -> Prisma -> PostgreSQL
```

All API routes use the `/api/v1` prefix. The server listens on port `3000` by default.

## Features

Currently implemented:

- User registration, login, token refresh, and logout
- JWT-based authentication with access and refresh tokens
- Role-based access control
- Current-user profile management
- Administrative user and role management
- Zod request validation
- Consistent HTTP response and error handling
- Winston application logging
- PostgreSQL persistence through Prisma ORM

The database model also provides a foundation for places, digital menus, reviews, carts, and orders. See [Architecture](ARCHITECTURE.md) for the planned module boundaries and implementation order.

## Technology Stack

- [Node.js](https://nodejs.org/) and [TypeScript](https://www.typescriptlang.org/)
- [NestJS](https://nestjs.com/) 11
- [PostgreSQL](https://www.postgresql.org/)
- [Prisma ORM](https://www.prisma.io/) 7
- [Zod](https://zod.dev/) for input validation
- [Jest](https://jestjs.io/) and Supertest for testing
- ESLint and Prettier for code quality
- Winston for logging

## Project Structure

```text
backend/
|-- docs/                    # Application rules and API specifications
|-- prisma/                  # Prisma schema, migrations, and seed script
|-- src/
|   |-- common/              # Shared auth, decorators, filters, guards, and pipes
|   |-- config/              # Application and environment configuration
|   |-- lib/                 # Infrastructure services such as Prisma and logging
|   |-- modules/             # Feature modules (auth, users, and future modules)
|   |-- app.module.ts        # Root application module
|   `-- main.ts              # Application entry point
|-- test/                    # End-to-end tests
|-- ARCHITECTURE.md          # Architecture conventions and module boundaries
`-- package.json             # Dependencies and npm scripts
```

## Prerequisites

Install the following before setting up the project:

- Node.js: `TODO: specify the supported version` (Node.js 20 LTS or newer is recommended for NestJS 11)
- npm: `TODO: specify the supported version`
- PostgreSQL: `TODO: specify the supported version`
- Git

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd tooang/backend
   ```

2. Install dependencies from the lockfile:

   ```bash
   npm ci
   ```

   Use `npm install` instead when intentionally updating dependencies.

3. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

   If `.env.example` has not been added yet, create `.env` manually using the variables in the next section.

4. Create a PostgreSQL database and update `DATABASE_URL` in `.env`.

5. Generate the Prisma client and apply database migrations:

   ```bash
   npx prisma generate --config prisma7.config.ts
   npx prisma migrate dev --config prisma7.config.ts
   ```

6. Optionally seed or promote a super-administrator account:

   ```bash
   npm run prisma:seed
   ```

7. Start the development server:

   ```bash
   npm run start:dev
   ```

## Environment Variables

Create a `.env` file in the `backend` directory. Never commit real credentials or secrets.

```dotenv
# Application
NODE_ENV=development
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/<database>?schema=public

# JWT secrets and lifetimes
JWT_ACCESS_TOKEN=<replace-with-a-long-random-secret>
JWT_REFRESH_TOKEN=<replace-with-a-different-long-random-secret>
JWT_ACCESS_TOKEN_EXPIRE=15m
JWT_REFRESH_TOKEN_EXPIRE=30d
JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE=90d
BCRYPT_ROUNDS=12

# Optional seed account
SEED_SUPER_ADMIN_EMAIL=<admin@example.com>
SEED_SUPER_ADMIN_PASSWORD=<replace-with-a-secure-password>
SEED_SUPER_ADMIN_FULL_NAME=Super Administrator

# Reserved for integrations/caching; configure when the related feature is enabled
GEMINI_API_KEY=<optional-api-key>
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
CACHE_REDIS_URL=redis://localhost:6379
CACHE_TTL=60
```

| Variable                     | Required | Default                 | Description                                                                             |
| ---------------------------- | -------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `NODE_ENV`                   | No       | `development`           | Application environment.                                                                |
| `PORT`                       | No       | `3000`                  | HTTP server port.                                                                       |
| `DATABASE_URL`               | Yes      | None                    | PostgreSQL connection string used by Prisma.                                            |
| `JWT_ACCESS_TOKEN`           | Yes      | None                    | Secret used to sign access tokens.                                                      |
| `JWT_REFRESH_TOKEN`          | Yes      | None                    | Secret used to sign refresh tokens. Use a different value from the access-token secret. |
| `JWT_ACCESS_TOKEN_EXPIRE`    | No       | `15m`                   | Access-token lifetime.                                                                  |
| `JWT_REFRESH_TOKEN_EXPIRE`   | No       | `30d`                   | Standard refresh-session lifetime.                                                      |
| `JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE` | No | `90d`              | Remember-me refresh-session lifetime.                                                   |
| `BCRYPT_ROUNDS`              | No       | `12`                    | Bcrypt work factor applied after SHA-256 password pre-hashing.                          |
| `SEED_SUPER_ADMIN_EMAIL`     | No       | None                    | Email for an optional seeded super administrator.                                       |
| `SEED_SUPER_ADMIN_PASSWORD`  | No       | None                    | Password for the optional seed account; must contain at least 8 bytes.                  |
| `SEED_SUPER_ADMIN_FULL_NAME` | No       | `Super Administrator`   | Display name for the optional seed account.                                             |
| `GEMINI_API_KEY`             | No       | None                    | Reserved Gemini integration API key.                                                    |
| `GEMINI_MODEL`               | No       | `gemini-3.5-flash`      | Reserved primary Gemini model name.                                                     |
| `GEMINI_FALLBACK_MODEL`      | No       | `gemini-3.1-flash-lite` | Reserved fallback Gemini model name.                                                    |
| `CACHE_REDIS_URL`            | No       | None                    | Reserved Redis connection URL.                                                          |
| `CACHE_TTL`                  | No       | `60`                    | Reserved cache lifetime in seconds.                                                     |

For a production environment, store secrets in the deployment platform's secret manager instead of an environment file.

## Database Setup

Generate the Prisma client after changing `prisma/schema.prisma`:

```bash
npx prisma generate --config prisma7.config.ts
```

Create and apply a development migration:

```bash
npx prisma migrate dev --name <migration-name> --config prisma7.config.ts
```

Apply existing migrations in production:

```bash
npx prisma migrate deploy --config prisma7.config.ts
```

Seed the database:

```bash
npm run prisma:seed
```

The seed script creates or promotes a super-administrator only when both `SEED_SUPER_ADMIN_EMAIL` and `SEED_SUPER_ADMIN_PASSWORD` are configured.

## Running the Application

Development with automatic reload:

```bash
npm run start:dev
```

Standard development start:

```bash
npm run start
```

Debug mode with automatic reload:

```bash
npm run start:debug
```

Production build and start:

```bash
npm run build
npm run start:prod
```

After startup, the API is available at:

```text
http://localhost:3000/api/v1
```

Replace `3000` with the configured `PORT` value when necessary.

## API Usage

Requests containing JSON must include `Content-Type: application/json`. Protected endpoints require an access token in the following header:

```http
Authorization: Bearer <access-token>
```

Example registration request:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Example User",
    "email": "user@example.com",
    "password": "replace-with-a-secure-password"
  }'
```

Example login request:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "replace-with-a-secure-password"
  }'
```

Example authenticated request:

```bash
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer <access-token>"
```

Core implemented endpoints include:

| Method   | Endpoint                            | Authentication | Description                                     |
| -------- | ----------------------------------- | -------------- | ----------------------------------------------- |
| `GET`    | `/api/v1`                           | Public         | Basic application response.                     |
| `POST`   | `/api/v1/auth/register`             | Public         | Register a user.                                |
| `POST`   | `/api/v1/auth/login`                | Public         | Log in; return access token and set refresh cookie. |
| `POST`   | `/api/v1/auth/refresh`              | Refresh cookie | Rotate refresh cookie and obtain a new access token. |
| `POST`   | `/api/v1/auth/logout`               | Refresh cookie | Revoke a refresh session and clear its cookie.  |
| `GET`    | `/api/v1/me`                        | Bearer token   | Get the current user's profile.                 |
| `PATCH`  | `/api/v1/me`                        | Bearer token   | Update the current user's profile.              |
| `POST`   | `/api/v1/me/account-deletion-requests` | Bearer token | Request account deletion.                       |
| `GET`    | `/api/v1/users`                     | ADMIN/SUPER_ADMIN | List active users.                           |
| `GET`    | `/api/v1/users/:userId`             | ADMIN/SUPER_ADMIN | Get an active user.                          |
| `PUT`    | `/api/v1/users/:userId/platform-role` | SUPER_ADMIN | Set a platform role.                            |
| `DELETE` | `/api/v1/users/:userId`             | ADMIN/SUPER_ADMIN | Deactivate an eligible user.                 |

Detailed request and response contracts are available in the [API specification](docs/api-specification/).

## Available Scripts

| Command               | Description                                         |
| --------------------- | --------------------------------------------------- |
| `npm run build`       | Compile the application into `dist/`.               |
| `npm run start`       | Start the application.                              |
| `npm run start:dev`   | Start in watch mode.                                |
| `npm run start:debug` | Start in debug and watch mode.                      |
| `npm run start:prod`  | Run the compiled production build.                  |
| `npm run lint`        | Run ESLint and automatically apply supported fixes. |
| `npm run format`      | Format source and test files with Prettier.         |
| `npm test`            | Run unit tests.                                     |
| `npm run test:watch`  | Run unit tests in watch mode.                       |
| `npm run test:cov`    | Run unit tests and produce a coverage report.       |
| `npm run test:e2e`    | Run end-to-end tests.                               |
| `npm run test:debug`  | Run Jest in Node.js debug mode.                     |
| `npm run prisma:seed` | Seed or promote the optional super-administrator.   |

## Testing

Run unit tests:

```bash
npm test
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Generate a coverage report:

```bash
npm run test:cov
```

> TODO: Document the dedicated test database setup and required test environment variables.

## Code Quality

Run the linter:

```bash
npm run lint
```

Format the codebase:

```bash
npm run format
```

Run the relevant checks before opening a pull request.

## Deployment

The application can be deployed anywhere that supports Node.js and PostgreSQL.

General production workflow:

1. Configure production environment variables and secrets.
2. Install locked production dependencies.
3. Generate the Prisma client.
4. Build the NestJS application.
5. Apply migrations with `prisma migrate deploy`.
6. Start the compiled application with `npm run start:prod`.
7. Configure HTTPS, health checks, logging, and process supervision on the hosting platform.

```bash
npm ci
npx prisma generate --config prisma7.config.ts
npm run build
npx prisma migrate deploy --config prisma7.config.ts
npm run start:prod
```

> TODO: Add platform-specific deployment instructions, the production API URL, health-check path, CORS policy, and CI/CD workflow.

## Documentation

- [Architecture and module conventions](ARCHITECTURE.md)
- [Application rules](docs/application-rules.md)
- [Authentication API specification](docs/api-specification/auth.md)
- [Users API specification](docs/api-specification/users.md)

> TODO: Add generated OpenAPI/Swagger documentation when available.

## Contributing

1. Create a branch from the project's default branch.
2. Make a focused change and add or update tests.
3. Run linting, formatting, and the relevant test suites.
4. Commit the change using the project's commit convention.
5. Open a pull request describing the change and how it was verified.

> TODO: Add the branch naming, commit message, code review, and release conventions used by the team.

## License

This package is currently marked as `UNLICENSED` and is private. Add a license file and update this section if the distribution policy changes.

## Contact

- Maintainer: `TODO: name or team`
- Email: `TODO: contact email`
- Project repository: `TODO: repository URL`
