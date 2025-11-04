# 🐳 Docker Troubleshooting Guide

## ✅ Fixed: Docker Containers Not Starting

### Problem

After running `docker compose up -d`, the application containers (backend/frontend) were in `Exited` status.

### Root Cause

1. **Prisma Client Not Generated**: Docker containers were using old images without Prisma v6 client
2. **Missing Dependencies**: TypeScript compilation failed due to missing Prisma types
3. **Obsolete docker-compose.yml**: Had deprecated `version` field

### Solution Applied

#### 1. Updated `docker-compose.yml`

```yaml
# ✅ Removed obsolete version field
# ✅ Added healthcheck for database
# ✅ Added proper depends_on with condition
# ✅ Added command to generate Prisma client on startup

backend:
  command: sh -c "npx prisma generate && npx prisma db push && npm run dev"
  depends_on:
    database:
      condition: service_healthy
```

#### 2. Updated `backend/Dockerfile`

```dockerfile
# ✅ Added openssl for Prisma
# ✅ Optimized for development
# ✅ Proper layer caching

FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]
```

## 🚀 How to Start Application

### Quick Start

```bash
# Clean start (recommended after updates)
docker compose down -v
docker compose build --no-cache
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step-by-Step

```bash
# 1. Stop all containers
docker compose down

# 2. Clean rebuild
docker compose build --no-cache

# 3. Start services
docker compose up -d

# 4. Verify all running
docker compose ps

# Expected output:
# NAME                 STATUS
# simpaskor_backend    Up (healthy)
# simpaskor_frontend   Up
# simpaskor_database   Up (healthy)
# simpaskor_pgadmin    Up
```

## 🔍 Common Issues & Solutions

### Issue 1: Backend Container Exits Immediately

**Symptoms:**

```bash
docker compose ps
# backend shows "Exited (1)"
```

**Solution:**

```bash
# Check logs
docker compose logs backend --tail=50

# Common causes:
# - Prisma client not generated
# - Database not ready
# - Missing environment variables

# Fix:
docker compose down
docker compose up -d database  # Start DB first
sleep 5                        # Wait for DB
docker compose up -d backend   # Then backend
```

### Issue 2: Frontend Build Errors

**Symptoms:**

```bash
docker compose logs frontend
# Shows TypeScript or build errors
```

**Solution:**

```bash
# Rebuild with no cache
docker compose build frontend --no-cache

# Or rebuild everything
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Issue 3: Database Connection Refused

**Symptoms:**

```
Error: connect ECONNREFUSED
```

**Solution:**

```bash
# Check database is running
docker compose ps database

# Check database health
docker compose logs database --tail=20

# Restart database
docker compose restart database

# Wait for healthy status
docker compose ps  # Should show "healthy"
```

### Issue 4: Port Already in Use

**Symptoms:**

```
Error: bind: address already in use
```

**Solution:**

```bash
# Find what's using the port
sudo lsof -i :3001  # Backend
sudo lsof -i :5173  # Frontend
sudo lsof -i :5432  # Database

# Kill the process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3002:3001"  # Use different host port
```

### Issue 5: Volumes Permission Issues

**Symptoms:**

```
EACCES: permission denied
```

**Solution:**

```bash
# Fix permissions
sudo chown -R $USER:$USER ./backend
sudo chown -R $USER:$USER ./frontend

# Or use root in container (not recommended)
user: root
```

## 🛠️ Useful Docker Commands

### Container Management

```bash
# View all containers
docker compose ps -a

# Start specific service
docker compose up -d backend

# Stop specific service
docker compose stop frontend

# Restart service
docker compose restart backend

# Remove containers
docker compose down

# Remove containers + volumes
docker compose down -v
```

### Logs & Debugging

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs backend -f

# Last 50 lines
docker compose logs backend --tail=50

# Logs since timestamp
docker compose logs --since 2024-10-30T10:00:00
```

### Exec into Container

```bash
# Backend shell
docker compose exec backend sh

# Frontend shell
docker compose exec frontend sh

# Database psql
docker compose exec database psql -U simpaskor_user -d simpaskor_db

# Run command in container
docker compose exec backend npx prisma studio
```

### Image Management

```bash
# Rebuild specific service
docker compose build backend

# Rebuild all without cache
docker compose build --no-cache

# Pull latest base images
docker compose pull

# Remove unused images
docker image prune -a
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect simpaskor_platform_postgres_data

# Remove volume
docker volume rm simpaskor_platform_postgres_data

# Remove all unused volumes
docker volume prune
```

## 📊 Health Checks

### Check All Services

```bash
# Backend API
curl http://localhost:3001/api/health

# Frontend (should load HTML)
curl http://localhost:5173

# Database (from host)
psql postgresql://simpaskor_user:simpaskor_password@localhost:5432/simpaskor_db -c "SELECT 1"

# pgAdmin
curl http://localhost:5050
```

### Monitor Resources

```bash
# Container stats
docker stats

# Specific container
docker stats simpaskor_backend

# Disk usage
docker system df
```

## 🔄 Clean Restart Procedure

When things go wrong, follow this clean restart:

```bash
# 1. Stop everything
docker compose down -v

# 2. Clean Docker cache
docker system prune -af --volumes

# 3. Remove node_modules (optional but recommended)
rm -rf backend/node_modules frontend/node_modules

# 4. Rebuild from scratch
docker compose build --no-cache

# 5. Start services
docker compose up -d

# 6. Watch logs
docker compose logs -f

# 7. Verify health
curl http://localhost:3001/api/health
curl http://localhost:5173
```

## 🎯 Production Considerations

### Environment Variables

```bash
# Never commit .env files
# Use docker secrets in production
# Rotate JWT_SECRET regularly
```

### Database Backup

```bash
# Backup database
docker compose exec database pg_dump -U simpaskor_user simpaskor_db > backup.sql

# Restore database
docker compose exec -T database psql -U simpaskor_user simpaskor_db < backup.sql
```

### Monitoring

```bash
# Use docker compose logs with log aggregation
# Set up health check endpoints
# Monitor container restart counts
```

## 📞 Still Having Issues?

1. **Check logs**: `docker compose logs -f`
2. **Check status**: `docker compose ps -a`
3. **Verify network**: `docker network inspect simpaskor_platform_simpaskor-network`
4. **Check resources**: `docker stats`
5. **Review env vars**: `docker compose config`

## 🎉 Success Indicators

Application is working correctly when:

✅ All containers show "Up" status
✅ Backend responds to health check
✅ Frontend loads at http://localhost:5173
✅ Database shows "healthy" status
✅ No error logs in `docker compose logs`

```bash
# Quick verification
docker compose ps  # All "Up"
curl http://localhost:3001/api/health  # Returns {"status":"OK"}
curl -I http://localhost:5173  # Returns 200 OK
```

---

**Last Updated:** October 30, 2025  
**Node.js Version:** 24.11.0 LTS  
**Docker Compose Version:** 2.x+
