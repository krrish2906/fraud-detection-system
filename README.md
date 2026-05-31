# 🛡️ FraudGuard: Self-Service Transaction Fraud Prediction Platform

FraudGuard is an advanced, full-stack, machine-learning-powered transaction fraud classification system. The platform integrates a high-performance XGBoost prediction pipeline, resilient dual-dialect persistence, in-memory caching, local Explainable AI (XAI) feature attributions, asynchronous background batch processing, and a premium modern modular dashboard with isolated JWT-based user spaces.

---

## 🏗️ Platform Architecture & Features

### 1. Robust Database & User Isolation Layer (`backend/src/db.py`)
*   **Dual-Dialect Connection Pool**: Integrates seamlessly with serverless PostgreSQL (**NeonDB**) via psycopg2 connection pooling for production.
*   **SQLite Fallback**: Automatically activates a local SQLite database (`sqlite:///./fraud_detection.db`) on startup if NeonDB is unconfigured or offline, ensuring zero interruptions in local development.
*   **Relational Database Schemas**:
    *   `users`: Stores securely salted password hashes and usernames.
    *   `transactions`: Logs RAW PCA features, transaction amounts, predicted risk probability, and model class output mapped strictly to the creator's `user_id`.
    *   `batch_jobs`: Binds asynchronous process progress variables to the job owner's `user_id`.
*   **Dynamic Startup Migrations**: Automatically runs safe `ALTER TABLE` routine checks on service startup to dynamically inject foreign key boundaries for seamless backward compatibility.

### 2. Secure JWT Authentication Pipeline (`backend/src/auth.py`)
*   **PBKDF2 Password Hashing**: Implements standard salt-based password cryptography using 100,000 hashing rounds for optimal system portability.
*   **JSON Web Tokens (JWT)**: Signs and verifies client session authorization payloads, ensuring that database queries are strictly isolated to the authenticated user's dashboard.
*   **FastAPI Dependency Injection**: Authenticates routes on all downstream prediction and history queries, returning a `401 Unauthorized` block on token expirations.

### 3. High-Speed Prediction Caching (`backend/src/cache.py`)
*   **Thread-Safe Caching**: Employs an in-memory LRU (Least Recently Used) cache (`max_size=1000`) protecting the XGBoost classifier from redundant computations on identical vector features.
*   **Key Hashing**: PCA features are hashed dynamically using SHA-256 for instant cache indexing.

### 4. Local Explainable AI (XAI) Attributions (`backend/src/explain.py`)
*   **Perturbation Analysis**: Calculates local feature attributions using the LOCO (Leave-One-Covariate-Out) technique.
*   **Mathematical Driver Isolation**: Substitutes each of the 29 raw vector inputs sequentially with its imputer average to isolate positive drivers (pushed risk up) and negative drivers (pushed risk down), rendering them as interactive charts.

### 5. Concurrent Background Batch Process (`backend/main.py`)
*   **Immediate Client Handshake**: Uploaded CSV sheets are parsed and delegated to FastAPI's concurrent `BackgroundTasks` queue, returning a `task_id` instantly to avoid connection timeouts.
*   **Progress Tracking**: Exposes dynamic percentage tracking (`/batch/status/{id}`) and exports classifications to a downloadable CSV sheet (`/batch/download/{id}`).

### 6. Premium Responsive Workspace (`frontend/`)
*   **Modular Component Architecture**: Extracted all business logic, states, and hooks into isolated modular child files:
    *   `Login.jsx` & `Register.jsx`: Sleek light-themed glassmorphic credentials forms with animated currency watermark backgrounds and show/hide password buttons.
    *   `Sidebar.jsx`: Fully responsive overlay layouts, active tabs, and online user indicators.
    *   `NewPrediction.jsx`: Fully encapsulates manual prediction inputs, autofills, and classification calls.
    *   `BatchProcess.jsx`: Handles drag-and-drop CSV uploads, parsing progress cards, and background status pollers.
    *   `ReviewQueue.jsx`: Operates prediction search queries, amount ranges, and transaction page metrics.
    *   `AnalyticsDashboard.jsx`: Pulls individual timelines, pie charts, and global XGBoost importances dynamically.
*   **Globally Persistent Tabs**: Saves tab indices dynamically inside `sessionStorage` (`fg_active_tab`) so that browser refreshes do not disrupt client context.
*   **Purely Model-Driven**: Renders 100% database-driven predictions and Recharts metrics, completely free of generic hardcoded mock parameters.

---

## 🛠️ Tech Stack & Dependencies

*   **Frontend**: React (Vite), Vanilla CSS, Recharts, Lucide-React, Axios
*   **Backend**: Python, FastAPI, Uvicorn, SQLite3, psycopg2-binary, PyJWT, Scikit-Learn, Pandas, XGBoost

---

## 🚀 Installation & Local Setup

### 1. Backend Service Setup
Navigate to the `backend` directory, initialize a python virtual environment, and install dependencies:
```bash
cd backend
python -m venv venv

# Windows Command Prompt
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

To boot the FastAPI server locally:
```bash
uvicorn main:app --reload
```
The REST API endpoints will start listening at `http://localhost:8000`.

### 2. Frontend Client Setup
In a secondary terminal window, navigate to the `frontend` folder and start the Vite client:
```bash
cd frontend
npm install
npm run dev
```
Open the provided localhost address (typically `http://localhost:5173`) in your web browser.

---

## 🧪 Pipeline Validation & Testing
You can verify the end-to-end inference, explainability, and caching pipeline by running the test harness script inside the activated backend virtual environment:
```powershell
python test.py
```
This script draws a real vector from the local dataset and returns the predicted probability class along with positive XAI attribution coefficients.
