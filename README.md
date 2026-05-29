# 🛡️ FraudGuard: Enterprise Transaction Fraud Detection Platform (V2.0)

FraudGuard is an enterprise-grade, full-stack, machine-learning-powered transaction fraud detection system. The platform integrates a high-performance XGBoost prediction pipeline, resilient dual-dialect persistence, in-memory caching, explainable AI (XAI) feature attributions, asynchronous background batch processing, and a premium modern light-themed analyst dashboard.

---

## 🏗️ Platform Architecture & Features

### 1. Robust Storage Layer (`backend/src/db.py`)
- **Dual-Dialect Connection Pool**: Integrates seamlessly with serverless PostgreSQL (**NeonDB**) via psycopg2 connection pooling for production.
- **SQLite Fallback**: Automatically activates a local SQLite database (`sqlite:///./fraud_detection.db`) on startup if NeonDB is unconfigured or offline, ensuring zero interruptions in local development.
- **Relational Tables**: Automatically migrates schemas on startup:
  - `transactions`: Logs RAW PCA features, amount, predicted risk, and analyst review status.
  - `audit_logs`: Records a detailed audit trail of status changes (e.g. *"Approved by System Analyst"*).
  - `batch_jobs`: Tracks asynchronous progress parameters.

### 2. High-Speed Prediction Caching (`backend/src/cache.py`)
- **Thread-Safe Caching**: Employs an in-memory LRU (Least Recently Used) cache (`max_size=1000`) protecting the XGBoost classifier from redundant computations.
- **Key Hashing**: Features are hashed (SHA-256) to index cache records instantly.
- **Pluggable Redis**: Designed to seamlessly bind to a Redis cache layer if environment connection variables are supplied.

### 3. Local Explainable AI (XAI) Pipeline (`backend/src/explain.py`)
- **Perturbation Attribution**: Calculates local feature attributions using the LOCO (Leave-One-Covariate-Out) perturbation technique.
- **Mathematical Driver Isolation**: Substitutes each of the 29 raw features sequentially with its population mean (from the imputer training weights) to isolate positive drivers (pushed risk up) and negative drivers (pushed risk down).

### 4. Asynchronous Batch Scanner (`backend/main.py`)
- **Concurrent Task Queue**: Uploaded CSV transaction sheets are processed asynchronously via FastAPI's concurrent `BackgroundTasks` queue.
- **Immediate Handshake**: Returns a `task_id` instantly to the client, preventing browser gateway timeouts on huge CSV sheets.
- **Progress Polling**: Exposes dynamic percentage tracking (`/batch/status/{id}`) and exports results to a downloadable CSV (`/batch/download/{id}`).

### 5. Premium Analyst Workspace (`frontend/`)
- **Stationary Coordinate Sidebar**: Stationary coordinate layout locks navigation in place on page scroll, with fluid margin offsets to ensure elegant content spacing.
- **Modular JSX Components**: Separated template components for manual inference (`NewPrediction`), batch uploading (`BatchProcess`), incident tables (`ReviewQueue`), metrics widgets (`AnalyticsDashboard`), and slider panels (`TransactionInspector`).
- **Standardized Visual Icons**: Unified sidebar navigation icons using consistent Lucide configurations (`size={18}`, `strokeWidth={2}`).
- **Subtle Watermark Decorations**: Embedded floating banknote and coin watermarks inside the main canvas margins (`z-index: 1`), layered beneath positioned opaque active elements (`z-index: 2`).
- **Sleek Input Fields**: Inverted browser-native input spinners using CSS filters to render them in clean white.
- **Purely Database-Driven**: Serves 100% realistic database records and XGBoost models, completely free of hardcoded mock statistics or static fallbacks.

---

## 🛠️ Tech Stack & Dependencies

*   **Frontend**: React (Vite), Vanilla CSS, Recharts, Lucide-React, Axios
*   **Backend**: Python, FastAPI, Uvicorn, SQLite3, psycopg2-binary, Scikit-Learn, Pandas, XGBoost

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
