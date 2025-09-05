# Helix Regulatory Intelligence Platform

🚀 **KI-gestützte Regulatory Intelligence für die Medizintechnik-Branche**

## 🎯 Überblick

Helix ist eine umfassende Regulatory Intelligence Plattform, die speziell für die Medizinprodukte-Industrie entwickelt wurde. Sie automatisiert die Sammlung, Analyse und Verteilung von regulatorischen Updates von globalen Behörden und bietet KI-gestützte Content-Approval-Workflows.

## ✨ Hauptfunktionen

- **🤖 KI-gestützte Analyse** - Automatische Verarbeitung regulatorischer Dokumente
- **📊 Real-time Dashboard** - Live-Updates und Statistiken
- **🌍 Globale Abdeckung** - FDA, EMA, BfArM, Swissmedic und weitere Behörden
- **📧 Newsletter-Integration** - Automatische Synchronisation mit MedTech-Newslettern
- **⚖️ Rechtsprechungs-Tracking** - Vollständige Verfolgung medizinrechtlicher Entscheidungen
- **📈 Analytics & Reporting** - Umfassende Berichte und Trend-Analysen

## 🛠 Technischer Stack

### Backend
- **Node.js** mit Express.js
- **TypeScript** (Strict Mode)
- **PostgreSQL** mit Drizzle ORM
- **Anthropic Claude** für KI-Analyse
- **Winston** für Logging

### Frontend
- **React 18** mit TypeScript
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** für State Management
- **Wouter** für Routing
- **Vite** als Build Tool

### Datenbank
- **PostgreSQL** (Neon-hosted)
- **Drizzle ORM** mit TypeScript-Integration
- **Automatische Migrations** via `npm run db:push`

## 🚀 Installation & Setup

### Voraussetzungen
- Node.js 20.x
- PostgreSQL Database
- Environment Variables (siehe .env.example)

### Lokale Entwicklung

```bash
# Repository klonen
git clone https://github.com/yourusername/helix-regulatory-platform
cd helix-regulatory-platform

# Dependencies installieren
npm install

# Environment Setup
cp .env.example .env
# .env-Datei mit Ihren Credentials bearbeiten

# Datenbank Migrations
npm run db:push

# Entwicklungsserver starten
npm run dev
```

### Produktions-Deployment

```bash
# Build erstellen
npm run build

# Produktionsserver starten
npm start
```

## 📊 API Endpoints

### Health & Status
- `GET /api/health` - Server Health Check
- `GET /api/dashboard/stats` - Dashboard Statistiken

### Regulatory Data
- `GET /api/regulatory-updates` - Aktuelle regulatorische Updates
- `GET /api/legal-cases` - Rechtsprechungs-Datenbank
- `GET /api/knowledge-base` - Wissensdatenbank

### Data Collection
- `GET /api/data-sources` - Aktive Datenquellen
- `GET /api/newsletters` - Newsletter-Management

## 🌍 Deployment

### VPS Deployment
Das Projekt ist für Deployment auf VPS-Servern optimiert:

```bash
# Build und Start
npm run build
npm start

# Mit systemd Service
sudo systemctl enable helix
sudo systemctl start helix
```

### Environment Variables
Erforderliche Environment Variables:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host/database
SESSION_SECRET=your-secret-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## 🏢 Architektur

### Multi-Tenant System
- Subscription-basierte Zugriffssteuerung
- Isolierte Tenant-Dashboards
- Verschiedene Abonnement-Stufen (Basic/Professional/Enterprise)

### KI-Integration
- **AegisIntel Services Suite** für regulatorische Analyse
- **ML-basierte Kategorisierung** von Medizinprodukten
- **Automatische Qualitätsbewertung** von Inhalten
- **Duplikat-Erkennung** und Datenbereinigung

### Sicherheit
- Session-basierte Authentifizierung
- Input-Sanitization und Validation
- Rate Limiting
- Security Headers

## 📈 Datenquellen

### Behörden-APIs
- **FDA** - 510(k), PMA, Recalls, Enforcement Actions
- **EMA** - Central Authorisation Updates
- **BfArM** - Deutsche Medizinprodukte-Regulierung
- **Swissmedic** - Schweizer Zulassungen

### Newsletter-Integration
- Medical Design and Outsourcing
- MedTech Dive
- Regulatory Focus
- RAPS Newsletter

### Knowledge Sources
- JAMA Network Medical Publications
- MedTech Case Studies
- WHO GAMD Indicators
- IMDRF Working Groups

## 🔧 Entwicklung

### Code Quality
- **ESLint** mit TypeScript-Regeln
- **Prettier** für Code-Formatierung
- **Strict TypeScript** Mode
- **Drizzle ORM** für Type-Safe Database Access

### Testing
```bash
npm run test        # Unit Tests
npm run test:e2e    # End-to-End Tests
npm run check       # TypeScript Type Checking
```

## 📝 Lizenz

© 2024 DELTAWAYS. Alle Rechte vorbehalten.

## 🤝 Support

Für Support und Fragen kontaktieren Sie uns unter:
- Email: support@deltaways.de
- Website: https://deltaways-helix.de

---

**Entwickelt mit ❤️ von DELTAWAYS für die globale MedTech-Community**