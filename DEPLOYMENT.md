# IGNITRON 2K26 — PRODUCTION DEPLOYMENT GUIDE

Comprehensive deployment, containerization, and configuration documentation for **IGNITRON 2K26 — CODING COLLAB**.

---

## 1. System Architecture Overview

The platform uses a decoupled, high-performance architecture:

```
┌──────────────────────────────────────────────┐
│                  FRONTEND                    │
│   Vite + React 18 + Tailwind CSS             │
│   Hosted on: Vercel                          │
│   Domain: https://your-app.vercel.app        │
└───────────────────────┬──────────────────────┘
                        │ HTTPS / REST API
                        │ Credentials: true (HttpOnly Cookie)
┌───────────────────────▼──────────────────────┐
│                  BACKEND                     │
│   NestJS 10 + Node 20 LTS                    │
│   Containerized on: Render (Web Service)     │
│   Domain: https://your-backend.onrender.com  │
└──────────────┬───────────────────┬───────────┘
               │ Prisma ORM (TLS)  │ HTTP Sandbox
┌──────────────▼─────────────┐   ┌─▼───────────────┐
│          DATABASE          │   │  JUDGE0 ENGINE  │
│   MySQL 8.0 Community      │   │  Self-Hosted /  │
│   Render / PlanetScale /   │   │  RapidAPI CE    │
│   Aiven / AWS RDS          │   │  Docker Sandbox │
└────────────────────────────┘   └─────────────────┘
```

---

## 2. Platform Prerequisites & Requirements

| Service | Target Platform | Runtime / Version | Ports |
|---|---|---|---|
| **Frontend** | Vercel | Node 20.x (Vite SPA) | 443 (HTTPS) |
| **Backend** | Render | Docker (`node:20-slim`) | `$PORT` (10000 default on Render) |
| **Database** | MySQL | MySQL 8.0+ | 3306 (TLS Recommended) |
| **Sandbox** | Judge0 CE | Docker Engine (Linux) | 2358 |

---

## 3. Step 1: Database Setup (MySQL 8.0+)

The platform requires a MySQL 8.0+ database configured with UTF-8 character encoding.

### Recommended Providers
- **Aiven for MySQL** (Free/Starter plans with full SSL support)
- **PlanetScale** / **Railway MySQL** / **AWS RDS MySQL**
- **Render Managed PostgreSQL + MySQL** or self-hosted MySQL

### Database Character Set Configuration
Ensure your database is created with UTF8MB4:
```sql
CREATE DATABASE ignitron_2k26
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### Connection URL Syntax
```
mysql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?sslaccept=strict
```
> **Security Note:** Never include real database passwords or connection strings in GitHub repositories. Always inject `DATABASE_URL` via environment variables.

---

### Database Migration & Initialization

Choose one of the following two methods:

#### Method A: Automated Prisma CLI Migration (Recommended)
From your terminal with `DATABASE_URL` set in `.env`:
```bash
# Apply all Prisma migrations to target database
npm run db:deploy

# Seed official competition rounds and initial data
npm run db:seed
```

#### Method B: Direct SQL Script Import
If deploying to a managed database provider without Node.js CLI access:
```bash
# 1. Create tables, enums, indexes, and foreign keys
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/schema.sql

# 2. Insert global competition state, rounds 1-3, and initial accounts
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed.sql
```

---

## 4. Step 2: Backend Deployment on Render

### Method A: One-Click Render Blueprint (Using `render.yaml`)
1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Blueprint**.
3. Select your repository (`Karunpoojari7/IGNITRON---CODING-COLLAB`).
4. Render will parse `render.yaml` and configure the Web Service automatically.
5. In the prompts, provide the non-synced variables:
   - `DATABASE_URL`: Your production MySQL connection string.
   - `ADMIN_PASSWORD`: Secure initial password for tournament administration.
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g. `https://your-app.vercel.app`).

---

### Method B: Manual Render Web Service Setup
1. In Render, select **New +** > **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name:** `ignitron-backend`
   - **Region:** Choose closest to your database (e.g., `Oregon`, `Frankfurt`).
   - **Environment:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Docker Build Context:** `.`
   - **Health Check Path:** `/api/health`
4. Under **Environment Variables**, add the required keys:

| Environment Variable | Description | Example / Default |
|---|---|---|
| `NODE_ENV` | Production execution mode | `production` |
| `API_PREFIX` | Global route prefix | `api` |
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db?sslaccept=strict` |
| `JWT_SECRET` | 256-bit cryptographically random key | *(Use Render "Generate" button)* |
| `JWT_EXPIRES_IN` | Token duration | `24h` |
| `ADMIN_EMAIL` | Tournament super administrator | `admin@ignitron.local` |
| `ADMIN_PASSWORD` | Administrator initial password | `SecureAdminSecret2026!` |
| `ADMIN_FULL_NAME` | Display name for system admin | `IGNITRON Tournament Director` |
| `FRONTEND_URL` | Deployed Vercel URL | `https://your-app.vercel.app` |
| `JUDGE0_API_URL` | Code execution sandbox endpoint | `http://localhost:2358` *(or cloud host)* |
| `JUDGE0_AUTH_TOKEN` | Optional auth token for Judge0 | *(Leave empty if unauthenticated)* |

5. Click **Create Web Service**. Render will execute the multi-stage `Dockerfile` and expose the service on port `$PORT`.

---

## 5. Step 3: Frontend Deployment on Vercel

### 1. Connect Repository
1. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** > **Project**.
2. Import `Karunpoojari7/IGNITRON---CODING-COLLAB`.

### 2. Configure Monorepo Build Settings
Vercel automatically detects the root `vercel.json`. Verify the settings:
- **Framework Preset:** `Vite`
- **Root Directory:** `./` *(or `apps/frontend`)*
- **Build Command:** `npm run build -w @ignitron/shared && npm run build -w @ignitron/frontend`
- **Output Directory:** `apps/frontend/dist`

### 3. Configure Environment Variables
In Vercel Project Settings > **Environment Variables**:

| Variable Name | Value | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `https://<your-backend>.onrender.com/api` | Points frontend API client to Render backend |

> **Crucial:** Do not include a trailing slash in `VITE_API_BASE_URL`.

### 4. Deploy
Click **Deploy**. Vercel will compile the shared package, build the frontend Vite bundle, and deploy to your `.vercel.app` domain.

---

## 6. Production Security & Cross-Origin Configuration

### Single Page Application (SPA) Routing
`vercel.json` provides an explicit rewrite rule:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
This ensures refreshing pages on client-side routes (e.g. `/admin/login`, `/team/arena`, `/team/dashboard`) resolves to the React application rather than returning a 404.

### Cross-Site Authentication (Vercel + Render)
When the frontend (`*.vercel.app`) and backend (`*.onrender.com`) are on different domains:
1. **CORS:** The NestJS backend dynamically permits all `*.vercel.app` origins and the specific `FRONTEND_URL` specified in environment variables with `credentials: true`.
2. **HttpOnly Cookie:** In production (`NODE_ENV=production`), the backend sets `sameSite: 'none'` and `secure: true` on the authentication session cookie. This allows the browser to send authentication credentials safely in cross-origin fetch requests.

---

## 7. Local Development with Docker Compose

To run the entire full-stack system locally with MySQL, backend, and frontend:

```bash
# 1. Clone repository & configure environment
cp .env.example .env

# 2. Launch full stack (MySQL, Backend, Frontend)
docker-compose up -d

# 3. View service status & logs
docker-compose ps
docker-compose logs -f backend

# 4. Access applications
# - Frontend:  http://localhost:5173
# - Backend:   http://localhost:4000/api
# - Health:    http://localhost:4000/api/health
# - MySQL:     localhost:3306

# 5. Stop containers (preserves database in named volume)
docker-compose down
```

---

## 8. Post-Deployment Verification Checklist

After deploying to Render and Vercel, verify all systems:

- [ ] **Backend Health Probe:** Visit `https://your-backend.onrender.com/api/health`. Expected output: `{"status":"ok", ...}`.
- [ ] **Frontend Routing:** Visit `https://your-frontend.vercel.app` and refresh the page.
- [ ] **Admin Authentication:** Navigate to `/admin/login`. Login with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Verify successful redirection to `/admin/dashboard`.
- [ ] **Contestant Registration / Login:** Test team registration or login at `/team/login` using `IGN-4DD6` / `CodeHunters@2026`.
- [ ] **Automated Test Suites:** Run regression test suites from your local environment against the codebase:
  ```bash
  node scripts/test-phase2-competition-control.cjs
  node scripts/test-phase2-access-control.cjs
  ```


## Production Service Checklist & Health Probes

### Frontend Deployment (Vercel)
- **Framework:** Vite React SPA
- **Root Directory:** `apps/frontend`
- **Build Command:** `npm run build -w @ignitron/shared && npm run build -w @ignitron/frontend`
- **Output Directory:** `dist`
- **Environment Variables:** `VITE_API_URL` pointing to active Render backend.

### Backend Deployment (Render)
- **Runtime:** Node.js 20+
- **Root Directory:** Repository root
- **Build Command:** `npm run build:shared && npm run build -w @ignitron/backend`
- **Start Command:** `node apps/backend/dist/index.js`
- **Health Check Endpoint:** `/health`
- **TiDB Cloud Database:** Requires SSL verification `ssl={"rejectUnauthorized":true}`.
