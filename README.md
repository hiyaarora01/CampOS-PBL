# 🏕️ CampOS — Your Ultimate Campus Companion

**CampOS** is a premium, feature-rich campus companion application designed to streamline student life and academic tasks. Built as a high-performance monorepo utilizing **React**, **Express.js**, and **MongoDB**, it provides an elegant, glassmorphic UI alongside state-of-the-art features including AI integration and real-time services.

---

## 🚀 Core Features

### 📊 1. Academic Student Dashboard
* **JPortal Sync**: Securely sync and scrape academic records, class schedules, and grades.
* **Attendance Margins**: Visually track attendance percentages across subjects. Includes a built-in smart calculator that forecasts how many lectures you need to attend or can safely miss to maintain your attendance goal.
* **GPA/CGPA Planner**: Estimate your current semester SGPA or set a target CGPA to calculate the minimum grades required in upcoming semesters.

### 🤖 2. CampAi (Your Personal College Copilot)
* **AI Chat Assistant**: Powered by **Google Gemini**, CampAi acts as a virtual college advisor. Ask questions about your timetable, class timings, or today's mess menu.
* **Smart PDF Flashcards**: Upload study PDFs or notes to have CampAi parse the text and instantly generate custom flashcard decks for quick review.

### 🤝 3. Skill Swap
* **Campus Exchange Board**: A local peer-to-peer sharing marketplace. List technical or creative skills you offer and skills you want to learn.
* **Ongoing Peer Chats**: Tap to chat directly with matches and start collaborative learning sessions.

### 🍔 4. Canteen Order System
* **Interactive Menu**: Browse snacks, desserts, beverages, and meals filtered by categories with dynamic pricing.
* **Cart & Checkout**: Simple cart management with checkout flow, simulated payment gateway integration, and immediate pickup slip generation.
* **Live Pickup Slips**: Sliding popups displaying a unique PIN, order summary, and a live countdown expiration timer.

### 🍱 5. Mess Timetable
* **Meal Schedules**: Get a breakdown of daily menus (Breakfast, Lunch, Dinner) along with timing windows.
* **Weekly Menu Board**: Plan ahead with a structured, responsive weekly layout.

### 📢 6. Notice Feed
* **Urgent Announcements**: Direct campus updates categorized by priority levels (High, Medium, Low) and timestamped for chronological order.

---

## 🛠️ Architecture

```
CampOS/
├── api/                  # Vercel Serverless Function Wrapper
│   ├── index.js          # Entry point — exports Express app
│   └── app.js            # Express app configured for serverless
├── packages/
│   ├── backend/          # Express.js API Server
│   │   ├── src/
│   │   │   ├── config/   # Database connection & seed profiles
│   │   │   ├── controllers/# AI and business logic handlers
│   │   │   ├── middleware/# Auth and error handling
│   │   │   ├── models/   # Mongoose Schemas (User, Notice, SkillGig, Order, etc.)
│   │   │   └── routes/   # REST endpoint definitions
│   └── frontend/         # React (Vite) Single Page Application
│       ├── src/
│       │   ├── components/# Modular Glassmorphic UI Components
│       │   ├── utils/    # Mathematical helper functions & caching layers
│       │   └── App.jsx   # Core application router and state manager
├── vercel.json           # Vercel configuration file
├── package.json          # Workspace root package settings
└── .env.example          # Template environment configuration
```

---

## ⚡ Tech Stack

* **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Phosphor Icons
* **Backend**: Node.js, Express.js, JWT, bcryptjs, Multer, pdf-parse, Google Generative AI SDK
* **Database**: MongoDB (Mongoose ODM)
* **Monorepo Management**: npm Workspaces
* **Hosting**: Vercel (Static hosting for frontend + Serverless Functions for backend API)

---

## 🏁 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **MongoDB** running locally on port `27017` (or a remote Atlas connection URI)

### Setup & Local Development

1. **Clone & Install Dependencies**:
   ```bash
   git clone https://github.com/Vplus1090/CampOS1.git
   cd CampOS1
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` in packages/backend to `.env`:
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   ```
   Add your Google Gemini API Key and configuration details inside `packages/backend/.env`.

3. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   * **Frontend URL**: `http://localhost:5173`
   * **Backend URL**: `http://localhost:5001`

---

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.
