# 🛡️ Fraud Detection Application

A full-stack, machine-learning-powered web application built to identify fraudulent credit card transactions. 

## Features
- **Real-Time Single Prediction**: Manually enter continuous transaction data to get an instant fraud probability.
- **Batch Processing Mode**: Upload large `.csv` datasets (e.g. `credit_data.csv` exported from banking systems) and effortlessly run predictions across all transactions continuously.
- **Client Persistence**: Batch data successfully persists via IndexedDB so large datasets won't wipe natively on page refresh or browser reload.
- **CSV Export**: Instantly download your batch prediction results containing `fraud_probability` and `prediction`.
- **Modern UI**: Polished, dark-themed responsive React interface built from the ground up without UI libraries.

## Tech Stack
- **Frontend**: React (Vite), Vanilla CSS, IndexedDB
- **Backend**: Python, FastAPI, Uvicorn, Scikit-Learn
- **Dev Env**: Node.js & Pip

## Installation & Setup

### 1. Backend (FastAPI + Machine Learning)
Navigate to the backend directory, initialize a python virtual environment, and install all ML application requirements.
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
```
To run the server:
```bash
uvicorn main:app --reload
```
The server API endpoints will be continuously listening at `http://127.0.0.1:8000`.

### 2. Frontend (React + Vite)
In a secondary terminal tab, spin up the user interface.
```bash
cd frontend
npm install
npm run dev
```
The web app will start locally. Open the provided localhost URL in your browser.

## Batch Interface Guidelines
1. Select "UPLOAD CSV" and provide a standard transaction payload `.csv`. It must exactly include the numerical columns `Amount` and PCA features `V1` through `V28`.
2. The application will acknowledge the payload and transparently switch to **Batch Processing Mode**.
3. Strike the **Run Batch Prediction** button.
4. When finished modeling, capture your mapped statistics securely by downloading via the provided export mechanism.
