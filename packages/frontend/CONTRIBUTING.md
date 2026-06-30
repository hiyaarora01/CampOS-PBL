# Frontend Onboarding & Module Guide

Welcome to the **CampOS Frontend Development Guide**! This document provides an overview of the frontend design patterns, state management architecture, and layout conventions, with a focus on the three primary modules: **Study Materials (Study Shelf)**, **Academic Calendar**, and **AI Flashcards**.

---

## 🎨 Design System & Styling Conventions

CampOS utilizes a premium, glassmorphic design system matching the Google Material 3 (M3) specifications. 

### **Design Tokens**
- **Primary Color:** `--m3-primary` (accent brand color, e.g. active states and key visual highlights).
- **Background Layering:** Uses nested surface card layouts (`m3-surface-card`) sitting on top of frosted containers.
- **Micro-Animations:** Driven by `framer-motion` (e.g. spring transitions for active selection chips, slide-ins, and 3D perspectives).
- **Icons:** Powered exclusively by `@phosphor-icons/react` using standard sizing (e.g. `16` for badges, `20` for headers, `24` for action triggers).

---

## 📁 Core Frontend Modules

### 📖 1. Study Shelf (`StudyMaterials.jsx`)
The Study Shelf enables students to browse, search, and access academic documents (Notes, Tutorials, PYQs, and Books).

- **Search & Filtering:**
  - Implements a case-insensitive name and code search bar (`searchQuery` state) along with select-dropdown branch/semester parameters.
  - Returns dynamically filtered collections using React `useMemo` for optimal performance.
- **Dynamic Calendar Countdown:**
  - Fetches upcoming schedules from `/api/calendar`.
  - Calculates the remaining time in `days / hours / minutes / seconds` until the nearest exam target is met.
  - Provides a close handle (✕) which persists dismiss state inside the browser's `localStorage` (via key `campos_dismissed_exam_countdown`).

### 📅 2. Academic Calendar (`AcademicCalendar.jsx`)
The Academic Calendar shows a timeline of semester deadlines, exams, council sessions, and holiday events.

- **Segmented Categories:**
  - Uses filter chips to switch between *All*, *Exams*, *Deadlines*, and *Academic* classifications.
  - Matches the category strings or associated event tag arrays to group data dynamically.
- **Admin Management:**
  - Super admins and admins have floating action buttons (FABs) to post, update (`PUT`), and delete (`DELETE`) calendar events.

### 🧠 3. AI Flashcards (`CampAi.jsx`)
The Flashcards tab inside CampAi leverages Gemini-parsed PDF documents to generate responsive study card interfaces.

- **3D Card Flip Animation:**
  - Implements CSS card-flipping structures (`perspective-card` and `preserve-3d` wrappers) animated via `framer-motion` on click.
- **Mastery Tracker:**
  - Allows marking cards as "Mastered" (stored in `localStorage` under `campos_mastered_cards` keyed by `${deckId}_${cardIndex}`).
  - Computes and displays an active progress bar with percentages matching deck completion.

---

## 🛠️ Onboarding Setup

To edit these components locally:
1. Run `npm run dev` at the root monorepo directory to boot both client and API workspaces.
2. Edit styles inside `packages/frontend/src/App.css` or component files inside `packages/frontend/src/components/`.
3. Check and format your files prior to committing by executing the workspace linting:
   ```bash
   npm run lint
   ```
