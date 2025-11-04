# 🏆 Simpaskor Platform

**Platform Kompetisi Terdepan Indonesia** - Full-stack application untuk mengelola kompetisi, penilaian, dan pelatihan secara terintegrasi.

![Tech Stack](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Express](https://img.shields.io/badge/Express.js-4.21-green?style=for-the-badge&logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-24.11_LTS-green?style=for-the-badge&logo=node.js)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)

## 🌟 Overview

Simpaskor Platform adalah aplikasi web full-stack yang dirancang khusus untuk mengelola kompetisi olahraga, penilaian, dan program pelatihan. Platform ini mendukung multi-role management dengan dashboard yang disesuaikan untuk setiap peran pengguna.

### ✨ Key Features

- 🎯 **Multi-Role Dashboard**: SuperAdmin, Panitia, Juri, Peserta, dan Pelatih
- 🔐 **Advanced Authentication**: JWT-based dengan role-based access control
- 📊 **Real-time Analytics**: Dashboard statistics dan monitoring
- 🏅 **Event Management**: Complete event lifecycle management
- 👥 **User Management**: Comprehensive user and profile management
- 📱 **Responsive Design**: Mobile-first dengan Tailwind CSS

## 🏗️ Architecture

```
simpaskor-platform/
├── 🎨 frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Role-based pages
│   │   │   ├── admin/         # 🔴 SuperAdmin dashboard
│   │   │   ├── panitia/       # 🟣 Panitia event management
│   │   │   ├── peserta/       # 🟡 Peserta event discovery
│   │   │   ├── juri/          # 🔵 Juri evaluation system
│   │   │   └── pelatih/       # 🟢 Pelatih student management
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # API utilities & helpers
│   │   └── components/        # Shared components
│   └── package.json
├── ⚙️ backend/                # Express.js + TypeScript
│   ├── src/
│   │   ├── routes/            # API endpoint routes
│   │   ├── middleware/        # Auth & validation middleware
│   │   ├── utils/             # Helper functions
│   │   ├── lib/               # Database connections
│   │   └── server.ts          # Main server application
│   ├── prisma/                # Database schema & migrations
│   │   ├── schema.prisma      # Database schema definition
│   │   └── migrations/        # Database migration files
│   └── package.json
├── 🗄️ database/              # PostgreSQL setup
│   └── init.sql               # Initial database setup
├── 🐳 docker-compose.yml     # Development environment
└── 📚 docs/                  # Documentation
```

## 🚀 Quick Start

### Prerequisites

Make sure you have installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker** & **Docker Compose** ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/simpaskor-platform.git
cd simpaskor-platform
```

### 2️⃣ Environment Setup

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit backend/.env with your configuration
nano backend/.env
```

**Required Environment Variables:**

```env
DATABASE_URL="postgresql://simpaskor_user:simpaskor_password@localhost:5432/simpaskor_db"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

### 3️⃣ Development with Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**🌐 Access Points:**

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **pgAdmin**: http://localhost:5050 (admin@admin.com / admin)
- **PostgreSQL**: localhost:5432

### 4️⃣ Manual Development Setup

#### Backend Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🔑 Default Login Credentials

| Role          | Email                    | Password    | Dashboard            |
| ------------- | ------------------------ | ----------- | -------------------- |
| 🔴 SuperAdmin | superadmin@simpaskor.com | Admin123!   | `/admin/dashboard`   |
| 🟣 Panitia    | panitia@simpaskor.com    | Panitia123! | `/panitia/dashboard` |
| 🔵 Juri       | juri@simpaskor.com       | Juri123!    | `/juri/dashboard`    |
| 🟡 Peserta    | demo@simpaskor.com       | password123 | `/peserta/dashboard` |
| 🟢 Pelatih    | pelatih@simpaskor.com    | Pelatih123! | `/pelatih/dashboard` |

## 🎯 Role-Based Features

### 🔴 SuperAdmin Dashboard

- **System Overview**: Complete system monitoring
- **User Management**: CRUD operations untuk semua users
- **Event Oversight**: Monitor semua events dan activities
- **Analytics**: System-wide statistics dan reports
- **Settings**: System configuration management

### 🟣 Panitia Dashboard

- **Event Creation**: Comprehensive event creation form
- **Event Management**: Edit, monitor, dan manage events
- **Participant Management**: Track registrations dan participants
- **Event Analytics**: Event-specific statistics
- **Juri Assignment**: Assign juri ke events

### 🔵 Juri Dashboard

- **Assigned Events**: View events yang di-assign
- **Judging Tasks**: Manage penilaian tasks dengan priority
- **Evaluation Tools**: Interface untuk scoring dan evaluation
- **Performance Tracking**: Track judging history dan ratings
- **Event Calendar**: Schedule dan deadlines

### 🟡 Peserta Dashboard

- **Event Discovery**: Search dan filter available events
- **Event Registration**: Easy registration process
- **My Events**: Track registered events dan status
- **Profile Management**: Update personal information
- **Achievement Tracking**: View accomplishments

### 🟢 Pelatih Dashboard

- **Student Management**: Manage student profiles dan progress
- **Training Programs**: Create dan monitor training programs
- **Event Monitoring**: Track student participation in events
- **Progress Analytics**: Monitor student development
- **Schedule Management**: Training schedules dan calendars

## 📚 API Documentation

### Authentication Endpoints

```http
POST /api/auth/login      # User login
POST /api/auth/register   # User registration
GET  /api/auth/me         # Get current user profile
POST /api/auth/logout     # User logout
GET  /api/health          # Health check endpoint
```

### User Management (Protected)

```http
GET    /api/users         # Get all users (admin only)
GET    /api/users/:id     # Get user by ID
PUT    /api/users/:id     # Update user profile
DELETE /api/users/:id     # Delete user (admin only)
```

### Request Headers

```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Example API Usage

```bash
# Health check
curl http://localhost:3001/api/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@simpaskor.com","password":"password123"}'

# Get current user (dengan token)
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Run all tests
npm run test:all
```

### Manual Testing

```bash
# Test backend API
npm run test:api

# Test frontend components
npm run test:components

# Integration testing
npm run test:integration
```

## 🔧 Development Commands

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Reset database (development only)
npx prisma db reset

# Open Prisma Studio
npx prisma studio --port 5555

# Create new migration
npx prisma migrate dev --name your-migration-name
```

### Docker Commands

```bash
# Build and start all services
docker-compose up --build

# Start specific service
docker-compose up backend

# View service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart service
docker-compose restart backend

# Clean up containers and volumes
docker-compose down -v
```

### Development Utilities

```bash
# Install new package to backend
cd backend && npm install package-name

# Install new package to frontend
cd frontend && npm install package-name

# Update all dependencies
npm run update:deps

# Check for security vulnerabilities
npm audit
```

## 🚦 Production Deployment

### Build for Production

```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd backend && npm run build

# Build Docker images for production
docker-compose -f docker-compose.prod.yml build
```

### Production Environment Variables

```env
NODE_ENV=production
DATABASE_URL=your-production-database-url
JWT_SECRET=your-production-jwt-secret-min-32-chars
FRONTEND_URL=https://your-domain.com
PORT=3001
```

### Deploy with Docker

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Health check
curl https://your-domain.com/api/health
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commits
- Ensure all CI checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** - Amazing frontend framework
- **Express.js** - Fast, unopinionated web framework
- **Prisma** - Next-generation ORM
- **Tailwind CSS** - Utility-first CSS framework
- **PostgreSQL** - Advanced open source database
- **Docker** - Containerization platform

## 📞 Support & Community

- 🐛 **Bug Reports**: [Create an Issue](https://github.com/yourusername/simpaskor-platform/issues)
- 💡 **Feature Requests**: [Submit Feature Request](https://github.com/yourusername/simpaskor-platform/issues)
- 💬 **Discussions**: [Join Community Discussions](https://github.com/yourusername/simpaskor-platform/discussions)
- 📧 **Email**: support@simpaskor.com

## 🗺️ Roadmap

- [ ] **v2.0**: Real-time notifications
- [ ] **v2.1**: Mobile applications (React Native)
- [ ] **v2.2**: Advanced analytics dashboard
- [ ] **v2.3**: Multi-language support
- [ ] **v2.4**: Event live streaming integration
- [ ] **v3.0**: AI-powered recommendations

---

<div align="center">

**Made with ❤️ by Simpaskor Development Team**

[⭐ Star this repo](https://github.com/yourusername/simpaskor-platform) | [🍴 Fork](https://github.com/yourusername/simpaskor-platform/fork) | [📖 Docs](https://docs.simpaskor.com)

</div>
