# IGNITRON 2K26 — Production Deployment Runbook

## Architecture Overview
The IGNITRON 2K26 Coding Collab platform is a monorepo featuring:
- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons, hosted on **Vercel**.
- **Backend**: Node.js, Express, Prisma ORM, Socket.IO, hosted on **Render**.
- **Database**: Managed MySQL (MySQL 8.0+).
- **Judge Engine**: Judge0 CE instance for real-time sandboxed code execution.

---

## 1. Vercel Deployment (Frontend)
### Project Configuration
- **Root Directory**: `./` (repository root)
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build -w @ignitron/shared && npm run build -w @ignitron/frontend`
- **Output Directory**: `apps/frontend/dist`

### Environment Variables on Vercel
| Variable | Value / Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Production backend API URL (Render) | `https://ignitron-backend.onrender.com/api` |

---

## 2. Render Deployment (Backend Service)
### Environment Configuration
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build -w @ignitron/shared && npm run build -w @ignitron/backend`
- **Start Command**: `npm run start -w @ignitron/backend`

### Environment Variables on Render
| Variable | Description |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` (or Render default) |
| `DATABASE_URL` | Production MySQL connection string |
| `JWT_SECRET` | 256-bit secure secret key |
| `FRONTEND_URL` | Vercel production frontend domain |
| `JUDGE0_API_URL` | Judge0 service endpoint |
| `ADMIN_EMAIL` | Initial super admin email |
| `ADMIN_PASSWORD` | Initial super admin password |
| `ADMIN_FULL_NAME` | Tournament director name |

---

## 3. Database Migration
Run database migrations during deploy pipeline:
```bash
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```
