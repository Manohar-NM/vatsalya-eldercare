<div align="center">

<img src="https://img.shields.io/badge/💙-VATSALYA-0066cc?style=for-the-badge&labelColor=001a33&color=0066cc" height="40"/>

# Vatsalya — Elder Care, Reimagined

### *Real-time caregiver-driven health monitoring for elderly loved ones*

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-vatsalya--eldercare.vercel.app-0066cc?style=for-the-badge)](https://vatsalya-eldercare.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Manohar--NM%2Fvatsalya--eldercare-181717?style=for-the-badge&logo=github)](https://github.com/Manohar-NM/vatsalya-eldercare)
[![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=for-the-badge&logo=socket.io)](https://socket.io)

</div>

---

## 🧭 The Problem We're Solving

India has over **140 million elderly citizens**. Many live alone or with family who work long hours. Falls, cardiac events, and medication lapses go undetected for hours — sometimes days. Existing solutions demand too much from the elderly themselves: app logins, complex UIs, constant interaction.

**Vatsalya flips the model.** The child (caregiver) takes ownership. The parent does almost nothing — and yet is fully monitored, protected, and connected.

---

## What is Vatsalya?

**Vatsalya** (Sanskrit: *वात्सल्य*, meaning unconditional parental love) is a full-stack, real-time healthcare monitoring platform built for families with elderly members.

It follows a **child-controlled architecture**: caregivers register, manage parent profiles, track health vitals, and receive instant SOS alerts — all without requiring the elderly person to navigate a smartphone app.

>  **Live at:** [vatsalya-eldercare.vercel.app](https://vatsalya-eldercare.vercel.app/)

---

##  Key Features

| Feature | Description |
|---|---|
|  **Real-time SOS Alerts** | One-tap emergency trigger with voice confirmation. Socket.io pushes the alert to the caregiver instantly with a 30-second countdown modal. |
|  **Health Dashboard** | Live tracking of heart rate, step count, and activity levels. Visual cards update in real time. |
|  **Parent Profile Management** | Caregivers create and manage parent profiles with unique codes for secure linking. |
|  **Voice Confirmation Panel** | SOS requires voice/manual confirmation to prevent false alerts. |
|  **Healthcare Services** | Medicine ordering, appointment booking, and an AI health assistant — all in one tab. |
|  **Activity Timeline** | Chronological log of parent activity and health events for pattern detection. |
|  **JWT Authentication** | Secure token-based auth with bcrypt password hashing and protected route guards. |
|  **Fully Responsive** | Optimized across mobile, tablet, and desktop with adaptive layouts. |
|  **Settings & Emergency Contacts** | Caregivers can configure notification preferences, emergency contacts, and security options. |

---

##  Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT (React 18)                        │
│   Landing → Auth → Dashboard → Parent Mode → Services        │
│                  Axios + Socket.io client                     │
└───────────────────────┬──────────────────────────────────────┘
                        │  HTTP / WebSocket
┌───────────────────────▼──────────────────────────────────────┐
│               BACKEND (Node.js + Express 5)                  │
│  Routes: /users  /parents  /health  /sos  /services          │
│  Middleware: JWT Auth Guard + CORS                            │
│  Real-time: Socket.io server                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │  Mongoose ODM
┌───────────────────────▼──────────────────────────────────────┐
│                  MongoDB Atlas                                │
│  Collections: Users · Parents · HealthRecords · SOSAlerts    │
└──────────────────────────────────────────────────────────────┘
```

### SOS Real-Time Flow

```
User clicks SOS → Voice Panel confirms → POST /sos/trigger
    → Backend processes → Socket.io emits 'sosAlert' to child
        → SOSAlert Modal appears → 30s countdown
            → Dismiss or Dispatch Emergency Services
```

---

##  Tech Stack

### Frontend
- **React 18** — UI framework with functional components and hooks
- **React Router v6** — Client-side navigation with `PrivateRoute` guards
- **Axios** — HTTP client for REST API calls
- **Socket.io-client** — Real-time bidirectional communication
- **React Icons** — Icon library
- **CSS3** — Custom responsive styling with utility classes

### Backend
- **Node.js + Express 5** — REST API server
- **MongoDB + Mongoose 9** — Database and ODM
- **Socket.io 4** — Real-time event broadcasting
- **JSON Web Tokens (JWT)** — Stateless authentication
- **bcryptjs** — Secure password hashing
- **dotenv** — Environment configuration

### Deployment
- **Frontend:** Vercel
- **Backend:** Vercel Serverless / Node.js hosting
- **Database:** MongoDB Atlas

---

##  Project Structure

```
vatsalya-eldercare/
├── server.js                  # Express + Socket.io entry point
├── package.json
├── .env.example               # Environment variable template
│
├── config/                    # DB connection
├── controllers/               # Route handlers (users, parents, health, SOS)
├── middleware/                 # JWT auth middleware
├── models/                    # Mongoose schemas
├── routes/                    # Express route definitions
├── utils/                     # Helper utilities
├── public/                    # Static assets
│
└── frontend/                  # React application
    ├── src/
    │   ├── components/        # Reusable components (Navbar, HealthCard, etc.)
    │   ├── pages/             # Page components (Dashboard, ParentMode, etc.)
    │   └── utils/             # API utilities and config
    └── public/
```

---

##  Data Models

```js
// User
{ name, age, email, password (hashed), role: "child" | "parent" }

// Parent
{ name, age, location, uniqueCode, child: userId }

// HealthRecord
{ parent: parentId, heartRate, steps, activity, timestamp }

// SOSAlert
{ parent: parentId, message, severity: "NORMAL"|"HIGH"|"CRITICAL",
  channel: "ONLINE"|"OFFLINE", status: "ACTIVE"|"RESOLVED" }
```

---

##  Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account
- npm or yarn

### 1. Clone the repository

```bash
git clone https://github.com/Manohar-NM/vatsalya-eldercare.git
cd vatsalya-eldercare
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=your-long-random-secret-here
CLIENT_URL=http://localhost:5173
PORT=5000
```

### 3. Install backend dependencies & start server

```bash
npm install
npm run dev       # Starts with nodemon on PORT 5000
```

### 4. Install frontend dependencies & start client

```bash
cd frontend
npm install
npm run dev       # Starts Vite dev server on PORT 5173
```

### 5. Open in browser

```
http://localhost:5173
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/parents` | Get all parents for logged-in user | ✅ |
| `POST` | `/parents` | Create a parent profile | ✅ |
| `GET` | `/health/:parentId` | Get health records for a parent | ✅ |
| `POST` | `/health` | Log a new health record | ✅ |
| `POST` | `/sos/trigger` | Trigger an SOS alert (Socket.io) | ✅ |
| `GET` | `/sos/:parentId` | Get SOS alert history | ✅ |

---

##  Pages Overview

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing Page | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/dashboard` | Caregiver Dashboard |  Protected |
| `/parent-mode` | Parent Mode & Profile Manager |  Protected |
| `/services` | Healthcare Services (Meds, Appointments, AI) |  Protected |
| `/settings` | Account, Notifications, Emergency Contacts |  Protected |

---

##  Project Stats

```
React Components:   33 total  (13 reusable)
Pages:              7
CSS Files:          14
Lines of Code:      4,000+
Real-time Events:   SOS Alert broadcasting
API Integrations:   5 route groups
Responsive Breaks:  3 (Mobile / Tablet / Desktop)
```

---

##  Roadmap

- [ ] Push notifications (PWA / Firebase)
- [ ] Wearable device integration (BLE health sensors)
- [ ] Offline-first SOS via SMS fallback
- [ ] AI-powered health anomaly detection
- [ ] Multi-language support (Hindi, Kannada, Tamil)
- [ ] Doctor video consultation module

---

##  Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

```bash
# Fork → Clone → Create branch → Commit → Push → PR
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

---


<div align="center">

Built with 💙 for elderly safety and family peace of mind.

**[🌐 Try it live](https://vatsalya-eldercare.vercel.app/) · [📁 View Source](https://github.com/Manohar-NM/vatsalya-eldercare)**

*"Because every parent deserves to feel safe, and every child deserves peace of mind."*

</div>
