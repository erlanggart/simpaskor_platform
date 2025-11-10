# Docker Setup Instructions

## Initial Setup or After Adding New Dependencies

When you add new npm packages (like `axios` or `react-google-recaptcha-v3`), you need to rebuild the Docker containers to install these dependencies.

### Option 1: Quick Rebuild (Recommended for Development)

Stop and remove containers, then rebuild:

```bash
# Stop and remove all containers
docker-compose down

# Rebuild and start containers
docker-compose up --build
```

### Option 2: Complete Clean Rebuild

If you encounter persistent issues, do a complete clean rebuild:

```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove all unused Docker images
docker image prune -a

# Rebuild from scratch
docker-compose up --build
```

### Option 3: Rebuild Specific Service

To rebuild only one service (e.g., backend or frontend):

```bash
# Rebuild backend only
docker-compose up --build backend

# Rebuild frontend only
docker-compose up --build frontend
```

## reCAPTCHA Configuration for Docker

### 1. Create .env file in root directory

```bash
# Copy the example file
cp .env.example .env
```

### 2. Edit .env file

For **development/testing**, the default test keys are already set:

```bash
# These are Google's test keys (always return success)
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

For **production**, get your own keys:

1. Go to https://www.google.com/recaptcha/admin
2. Create a new reCAPTCHA v3 site
3. Replace the keys in `.env`

### 3. Start Docker Containers

```bash
# Start all services
docker-compose up
```

The environment variables from `.env` will be automatically loaded by docker-compose.

## Verifying Installation

### Check Backend Dependencies

```bash
# Enter backend container
docker exec -it simpaskor_backend sh

# Check if axios is installed
npm list axios

# Exit container
exit
```

Expected output:

```
simpaskor-backend@1.0.0 /app
└── axios@1.13.2
```

### Check Frontend Dependencies

```bash
# Enter frontend container
docker exec -it simpaskor_frontend sh

# Check if react-google-recaptcha-v3 is installed
npm list react-google-recaptcha-v3

# Exit container
exit
```

Expected output:

```
simpaskor-frontend@0.0.0 /app
└── react-google-recaptcha-v3@1.11.0
```

### Check Environment Variables

```bash
# Check backend environment
docker exec simpaskor_backend env | grep RECAPTCHA

# Check frontend environment
docker exec simpaskor_frontend env | grep RECAPTCHA
```

Expected output:

```
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

## Common Issues and Solutions

### Issue: Dependencies not installed in Docker

**Symptom:** Import errors for `axios` or `react-google-recaptcha-v3`

**Solution:**

```bash
docker-compose down
docker-compose up --build
```

### Issue: Environment variables not available

**Symptom:** "RECAPTCHA_SECRET_KEY is not configured" error

**Solution:**

1. Ensure `.env` file exists in root directory
2. Check that docker-compose.yml references the variables
3. Restart containers:

```bash
docker-compose down
docker-compose up
```

### Issue: Old code running in container

**Symptom:** Changes to code not reflected

**Solution:**
The volumes are mounted, so code changes should reflect automatically. If not:

```bash
# Restart the specific service
docker-compose restart backend
# or
docker-compose restart frontend
```

### Issue: Port already in use

**Symptom:** "Error: bind: address already in use"

**Solution:**

```bash
# Check what's using the port (e.g., 3001)
sudo lsof -i :3001

# Kill the process or change the port in docker-compose.yml
```

## Development Workflow

### Starting Development

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Or view specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stopping Development

```bash
# Stop all services (keeps volumes)
docker-compose down

# Stop and remove volumes (database data will be lost)
docker-compose down -v
```

### Making Code Changes

Code changes are automatically reflected because of volume mounting:

- Backend: `./backend:/app`
- Frontend: `./frontend:/app`

No rebuild needed for code changes, only for:

- New npm packages
- Dockerfile changes
- docker-compose.yml changes

## Testing reCAPTCHA in Docker

1. Access the application:

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

2. Navigate to registration: http://localhost:5173/register

3. Fill in the form and submit

4. Check backend logs for reCAPTCHA verification:

```bash
docker-compose logs backend | grep reCAPTCHA
```

Expected output:

```
reCAPTCHA verified successfully - Score: 0.9, Action: register, IP: 172.18.0.1
```

## Production Deployment

For production, you'll need to:

1. **Update .env with real reCAPTCHA keys**
2. **Change JWT_SECRET in docker-compose.yml**
3. **Update FRONTEND_URL and VITE_API_URL**
4. **Build for production:**

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

Note: You may need to create a separate `docker-compose.prod.yml` for production configuration.

## Useful Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Enter a container shell
docker exec -it simpaskor_backend sh
docker exec -it simpaskor_frontend sh

# View container logs
docker logs simpaskor_backend
docker logs simpaskor_frontend

# Restart a specific service
docker-compose restart backend

# Remove all stopped containers
docker container prune

# Remove all unused images
docker image prune -a

# View Docker disk usage
docker system df
```

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         Docker Compose Network              │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   Frontend   │  │   Backend    │        │
│  │  Container   │──│  Container   │        │
│  │  :5173       │  │  :3001       │        │
│  │              │  │              │        │
│  │ + react-     │  │ + axios      │        │
│  │   google-    │  │ + express-   │        │
│  │   recaptcha  │  │   rate-limit │        │
│  └──────────────┘  └──────┬───────┘        │
│                            │                │
│                    ┌───────▼────────┐       │
│                    │   PostgreSQL   │       │
│                    │   Container    │       │
│                    │   :5432        │       │
│                    └────────────────┘       │
│                                             │
└─────────────────────────────────────────────┘
```

---

**Need Help?**

- Check logs: `docker-compose logs -f`
- Restart services: `docker-compose restart`
- Full rebuild: `docker-compose down && docker-compose up --build`
