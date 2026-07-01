# 🎨 Chamora Frontend: React Dashboard & SRE Operations Portal

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Radix_UI](https://img.shields.io/badge/Radix_UI-Primitives-black?logo=radixui&logoColor=white)](https://radix-ui.com)
[![Recharts](https://img.shields.io/badge/Recharts-Visualizations-22b5bf)](https://recharts.org)

The **Chamora Frontend** is a modern React web portal that serves as the command center for the Chamora anomaly detection and reliability testing platform. Built with React 18, TypeScript, Vite, and styled with Tailwind CSS v4, it provides site reliability engineers (SREs) with real-time dashboards, threshold configuration editors, load-test triggers, regression charts, and an interactive AI co-pilot chat workspace.

---

## 🚀 Key Pages & Dashboards

The application is structured around a series of operations-focused views:

### 1. 📊 User & Application Dashboards
*   **User Dashboard (`/dashboard`)**: Displays a high-level catalog of all monitored applications, active anomaly counts, connection states, and quick-access cards.
*   **Application Dashboard (`/application/:appId`)**: Focuses on a single application. Renders real-time telemetry graphs, health indicators, database connections, and recent activity logs.

### 2. 🛡️ Anomaly Detection Configurations (`/anomaly-detection/:appId`)
*   Provides granular threshold-tuning forms for specific application container endpoints.
*   Supports setting limits for:
    *   Response Latency (p95)
    *   Error Rate (HTTP/TCP status ratios)
    *   Consecutive Failure Streaks (probe timeouts)
    *   CPU and Memory utilization thresholds
    *   Host node metrics (Disk I/O and Memory pressure limits)
*   Allows toggling active metric scraping, and turning ML-based early warning inference ON or OFF.

### 3. 🚨 Anomaly Flags Log (`/anomaly-flags/:appId/:configId`)
*   Displays a list of ML-detected **WARNING** and **CRITICAL** anomaly flags.
*   Includes detailed evidence tables listing the averages of all 12 metric features at the time of detection.
*   Shows correlated root causes such as `CPU_INDUCED_LATENCY`, `MEMORY_EXHAUSTION_OR_LEAK`, and `CRASH_LOOP_DETECTED`.

### 4. 🧠 Root Cause Analysis & AI Chatbot
*   **RCA Diagnostic Panel (`/anomaly-flags/:appId/:configId/:anomalyId/root-cause`)**: Generates an automated diagnostic report by passing the anomaly evidence to a local fine-tuned LLM.
*   **Interactive SRE Chatbot (`/chatbot/:appId`)**: Side-by-side terminal interface where engineers chat with an SRE AI assistant. Uses RAG (Retrieval-Augmented Generation) to search through uploaded architecture diagrams, logs, and system maps.

### 5. ⚡ Automated Load Testing (`/automated-testing/:appId`)
*   Upload and register k6 load-testing scripts to Supabase storage.
*   Trigger load test cycles directly from the web panel, configuring virtual users (VUs) and duration.
*   Streams real-time console outputs, statuses, and performance metrics as the k6 worker runs.

### 6. 📉 Test Cycle Comparison Portal (`/test-cycle-comparison/:appId`)
*   Compare two distinct test runs (e.g. baseline vs. load test run).
*   Overlays metrics charts showing latencies, CPU usage, and memory pressure side-by-side.
*   Highlights regressions, degradation points, and threshold breaches to verify build reliability.

### 7. 🗺️ Setup & Onboarding Assistant (`/onboarding`)
*   Interactive guide helping teams register new applications.
*   Guides configurations for Prometheus metrics exporters, container names, VictoriaMetrics scraping targets, and alert rules.

---

## 📂 Project Structure

```
Chamora_frontend/
├── index.html                  # HTML entrypoint containing target root div element
├── vite.config.ts              # Vite configurations (alias paths, plugins, and proxy setups)
├── package.json                # Project dependencies, build targets, and metadata
├── tsconfig.json               # TypeScript compiler rules
├── default_shadcn_theme.css    # Shared CSS tokens for themed components
├── public/                     # Static assets (images, icons, vectors)
└── src/
    ├── main.tsx                # React virtual DOM mounter and bootstrap script
    ├── styles/                 # Global styling, fonts, and animation custom style sheets
    ├── imports/                # Centralized asset imports and asset libraries
    └── src/app/
        ├── App.tsx             # Application wrapper mounting routing providers
        ├── api.ts              # Endpoint URL builder and base address config utilities
        ├── routes.tsx          # Router tree mapping all paths to Page Components
        ├── components/         # Reusable widgets (charts, chat layouts, inputs, alerts)
        │   ├── ChatbotPage.tsx # Chat interface components
        │   └── OnboardingPage.tsx # Onboarding stepper pages
        └── pages/              # Primary Page layout components (Dashboard, RCA, k6 testing)
```

---

## 🛠️ Local Development & Installation

### Prerequisites
*   **Node.js** (v18.x or higher recommended)
*   **npm** or **pnpm** package manager

### Step 1: Install Dependencies
Navigate into the frontend folder and pull package requirements:
```bash
cd Chamora_frontend
npm install
```

### Step 2: Configure Environment Variables
Vite reads `.env` variables prefixed with `VITE_`.
Create a `.env` file in the root of the `Chamora_frontend` folder:
```properties
VITE_API_BASE_URL=http://localhost:8000
VITE_RCA_API_BASE_URL=http://localhost:8020
```
*   `VITE_API_BASE_URL`: Base address of the main FastAPI backend.
*   `VITE_RCA_API_BASE_URL`: Base address of the RCA LLM orchestrator.

### Step 3: Launch Dev Server
Start the local Vite development server:
```bash
npm run dev
```
*   The application will boot and be accessible at: `http://localhost:5173/`

### Step 4: Build for Production
Create an optimized production bundle:
```bash
npm run build
```
*   The output builds into the `dist/` directory, ready to be served by Nginx or static file hosts.

---

## 🔄 Vite Dev Server Proxy Setup

To bypass CORS constraints during local development, the Vite server uses built-in proxies configured in `vite.config.ts`. It maps the following relative pathways directly to target backends:

1.  **`/api` & `/retriever`**: Routed to the main backend server (defaults to `http://localhost:8000`).
2.  **`/compare-service`**: Rewritten and routed to the Test Comparison microservice (defaults to `http://localhost:8030`).
3.  **`/recommendation-service`**: Rewritten and routed to the Recommendation module (defaults to `http://localhost:8010`).