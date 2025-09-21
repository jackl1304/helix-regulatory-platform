# Helix Regulatory Intelligence Platform

> **Modern, Scalable, and Secure Regulatory Intelligence Platform for Medical Devices**

A comprehensive platform for regulatory intelligence, compliance monitoring, and data analysis in the medical device industry. Built with modern technologies and best practices for enterprise-grade applications.

## 🚀 Features

### Core Intelligence
- **🤖 AI-Powered Analysis** - Advanced natural language processing for regulatory document analysis
- **📊 Real-time Dashboard** - Live monitoring of regulatory changes and compliance status
- **🌍 Global Coverage** - FDA, EMA, BfArM, Swissmedic, and other international regulatory bodies
- **📧 Newsletter Integration** - Automated processing of industry newsletters and updates
- **⚖️ Legal Case Tracking** - Comprehensive monitoring of medical device litigation

### Modern Architecture
- **🔒 Enterprise Security** - Rate limiting, input sanitization, CSRF protection, and comprehensive security headers
- **⚡ Performance Optimized** - Virtual scrolling, lazy loading, intelligent caching, and bundle optimization
- **📱 Responsive Design** - Mobile-first design with responsive layouts
- **🔄 Offline Support** - Background sync and offline-first data architecture
- **🎯 Multi-Tenant** - Isolated customer portals with custom branding

### Developer Experience
- **🛠️ Modern Tooling** - TypeScript, ESLint, Prettier, Jest, and comprehensive testing
- **📈 Monitoring** - Health checks, performance monitoring, and error tracking
- **🔧 DevOps Ready** - CI/CD pipelines, automated testing, and deployment workflows
- **📝 Documentation** - Comprehensive API documentation and developer guides

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Tailwind CSS** + shadcn/ui components
- **TanStack Query** for server state management
- **Wouter** for routing
- **Vite** for build tooling

### Backend Stack
- **Node.js** with Express.js
- **TypeScript** (strict mode)
- **PostgreSQL** with Drizzle ORM
- **Anthropic Claude** for AI analysis
- **Winston** for logging

### Infrastructure
- **PostgreSQL** (Neon-hosted)
- **Automated migrations** via Drizzle
- **Health monitoring** and alerting
- **Performance tracking** and optimization

## 📋 Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 15.0
- **Git** for version control

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/jackl1304/helix-regulatory-platform.git
cd helix-regulatory-platform
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Configure your environment variables
# DATABASE_URL=postgresql://username:password@localhost:5432/helix_db
# ANTHROPIC_API_KEY=your_anthropic_key
# NODE_ENV=development
```

### 3. Database Setup

```bash
# Run database migrations
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 4. Development Server

```bash
# Start development server
npm run dev

# Server will be available at http://localhost:3000
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run check        # TypeScript type checking

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:ci      # Run tests for CI

# Database
npm run db:push      # Apply schema changes
npm run db:studio    # Open Drizzle Studio
npm run db:generate  # Generate migrations
```

### Project Structure

```
helix-regulatory-platform/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── lib/           # Core libraries
├── server/                # Backend Node.js application
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic
│   ├── routes/           # API routes
│   └── validators/       # Input validation
├── shared/               # Shared types and utilities
│   ├── types/           # TypeScript type definitions
│   └── schema.ts        # Database schema
├── tests/               # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/           # End-to-end tests
├── .github/            # GitHub workflows
└── docs/              # Documentation
```

## 🧪 Testing

### Test Coverage Goals
- **Unit Tests**: >90% coverage
- **Integration Tests**: Critical API endpoints
- **E2E Tests**: Key user workflows

### Running Tests

```bash
# Unit tests
npm run test

# With coverage
npm run test:coverage

# Integration tests
npm run test:integration

# E2E tests (requires running application)
npm run test:e2e
```

### Test Structure
- `tests/unit/` - Unit tests for individual functions/components
- `tests/integration/` - API endpoint and database integration tests
- `tests/e2e/` - Full user workflow tests with Playwright

## 🔒 Security

### Security Features
- **Rate Limiting** - Configurable rate limits per endpoint
- **Input Sanitization** - XSS protection and data validation
- **CSRF Protection** - Cross-site request forgery prevention
- **Security Headers** - Comprehensive security headers (HSTS, CSP, etc.)
- **SQL Injection Prevention** - Parameterized queries with Drizzle ORM

### Security Headers Applied
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [Comprehensive CSP rules]
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## ⚡ Performance

### Performance Features
- **Code Splitting** - Lazy loading of route components
- **Bundle Optimization** - Tree shaking and minification
- **Image Optimization** - Responsive images with lazy loading
- **Caching Strategy** - Intelligent caching for API responses
- **Virtual Scrolling** - Efficient rendering of large datasets

### Performance Monitoring
- **Web Vitals** - Core Web Vitals tracking
- **Performance Metrics** - Response time and throughput monitoring
- **Memory Monitoring** - Memory leak detection and alerting
- **Error Tracking** - Comprehensive error monitoring

### Performance Targets
- **Lighthouse Score**: >90 for all metrics
- **First Contentful Paint**: <1.8s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms

## 🚀 Deployment

### Environment Setup

#### Development
```bash
npm run dev
```

#### Staging
```bash
NODE_ENV=staging npm run build
NODE_ENV=staging npm start
```

#### Production
```bash
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

### Docker Deployment

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:port/db
ANTHROPIC_API_KEY=your_anthropic_key

# Optional
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Security
ENABLE_RATE_LIMITING=true
ENABLE_SECURITY_HEADERS=true
ENABLE_CSRF_PROTECTION=true

# Performance
ENABLE_CACHING=true
CACHE_TTL=300
```

## 📊 API Documentation

### Health Check
```http
GET /api/health
```
Returns system health status, uptime, and performance metrics.

### Dashboard Stats
```http
GET /api/dashboard/stats
```
Returns dashboard statistics and key metrics.

### Regulatory Updates
```http
GET /api/regulatory-updates
POST /api/regulatory-updates
PUT /api/regulatory-updates/:id
DELETE /api/regulatory-updates/:id
```

### Legal Cases
```http
GET /api/legal-cases
GET /api/legal-cases/:id
POST /api/legal-cases
```

### Data Quality
```http
GET /api/data-quality/metrics
POST /api/data-quality/validate
```

### Response Format
All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_12345"
}
```

## 🔧 Configuration

### Database Configuration
Configure your PostgreSQL connection in the environment variables or use the `.env` file.

### AI Configuration
Set up your Anthropic API key for AI-powered analysis features.

### Performance Configuration
Adjust caching, rate limiting, and other performance settings via environment variables.

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- Follow TypeScript strict mode
- Use Prettier for formatting
- Write comprehensive tests
- Follow semantic commit messages
- Update documentation for API changes

## 📈 Monitoring

### Health Monitoring
The application includes comprehensive health monitoring:
- System resource usage (CPU, memory, disk)
- Database connection health
- Service availability checks
- Performance metrics tracking
- Automated alerting for issues

### Metrics Available
- Request/response metrics
- Error rates and types
- Database query performance
- Cache hit/miss ratios
- User activity patterns

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Development Setup](docs/development.md)
- [Security Guide](docs/security.md)

### Getting Help
- Create an [issue](https://github.com/jackl1304/helix-regulatory-platform/issues) for bugs
- Start a [discussion](https://github.com/jackl1304/helix-regulatory-platform/discussions) for questions
- Email: support@helix-regulatory.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Inspired by regulatory intelligence needs in the medical device industry
- Thanks to the open source community for excellent tools and libraries

---

**Made with ❤️ for the regulatory intelligence community**