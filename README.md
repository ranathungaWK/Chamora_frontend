# 🛡️ Chamora Frontend (React + Vite + TypeScript)

This is the web user interface for the Chamora platform. It allows users to register applications, monitor system-wide alerts, trigger load test cycles, view ML-detected anomaly flags, and run AI-based Root Cause Analysis (RCA).

---

## 🚀 Quick Start Guide

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm or pnpm

### Getting Started

1. Navigate to the `Chamora-frontend` directory:
   ```bash
   cd Chamora-frontend
   ```

2. Install the package dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (if any):
   Vite reads `.env` variables prefixed with `VITE_`. Make sure your API base URLs are set:
   *   `VITE_API_BASE_URL`: Base API endpoint of the FastAPI backend (defaults to Vite proxy forwarding).

4. Start the local development server:
   ```bash
   npm run dev
   ```

5. Access the application in your browser:
   *   Local development server runs at: `http://localhost:5173/`

---

## 📂 Project Structure

*   `src/app/pages/`: Page components representing application views (e.g. Dashboard, Anomaly Flags, Root Cause Analysis Page, Setup Testing Environment Page).
*   `src/components/`: Reusable interface components and layout elements.
*   `src/app/api.ts`: API endpoint configurations, routing helpers, and backend bindings.
*   `vite.config.ts`: Configuration file defining proxies to route API calls directly to the backend.