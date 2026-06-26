import os
import json
import uuid
import csv
import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from src.predictor import predict
from src.db import init_db, execute_read, execute_write
from src.auth import get_current_user

# App metadata
app = FastAPI(
    title="Fraud Detection Enterprise API",
    description="ML-powered API with persistence, caching, XAI, and queue management",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB Migration initialization
@app.on_event("startup")
def startup_event():
    init_db()
    # Create directory for batch exports
    os.makedirs("batch_exports", exist_ok=True)
    
    # Warm-up the ML prediction pipeline to initialize the XGBoost C++ engine/thread pool
    try:
        print("[MODEL] Warming up prediction pipeline...")
        dummy_input = {
            "Amount": 100.0,
            **{f"V{i}": 0.0 for i in range(1, 29)}
        }
        predict(dummy_input, skip_cache=True)
        print("[MODEL] Prediction pipeline warmed up successfully.")
    except Exception as e:
        print(f"[MODEL WARNING] Warm-up failed: {e}")


class Transaction(BaseModel):
    Amount: float
    V1: float
    V2: float
    V3: float
    V4: float
    V5: float
    V6: float
    V7: float
    V8: float
    V9: float
    V10: float
    V11: float
    V12: float
    V13: float
    V14: float
    V15: float
    V16: float
    V17: float
    V18: float
    V19: float
    V20: float
    V21: float
    V22: float
    V23: float
    V24: float
    V25: float
    V26: float
    V27: float
    V28: float


class ExplanationDriver(BaseModel):
    feature: str
    score: float


class ExplanationResponse(BaseModel):
    positive_drivers: List[ExplanationDriver]
    negative_drivers: List[ExplanationDriver]


class PredictionResponse(BaseModel):
    id: Optional[int] = None
    amount: Optional[float] = None
    features: Optional[dict] = None
    fraud_probability: float
    prediction: str
    status: Optional[str] = None
    explanation: Optional[ExplanationResponse] = None
    tx_hash: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: str
    actor: Optional[str] = "Analyst"


class AuthRequest(BaseModel):
    username: str
    password: str


@app.post("/auth/register")
def register(request: AuthRequest):
    username = request.username.strip()
    password = request.password
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
        
    user_check = execute_read("SELECT id FROM users WHERE username = %s", (username,))
    if user_check:
        raise HTTPException(status_code=400, detail="Username is already taken")
        
    from src.auth import hash_password
    pwd_hash = hash_password(password)
    
    try:
        execute_write(
            "INSERT INTO users (username, password_hash) VALUES (%s, %s)",
            (username, pwd_hash)
        )
        return {"success": True, "message": "User registered successfully"}
    except Exception as e:
        print(f"[API ERROR] User registration failed: {e}")
        raise HTTPException(status_code=500, detail="User registration failed")


@app.post("/auth/login")
def login(request: AuthRequest):
    username = request.username.strip()
    password = request.password
    
    user_res = execute_read("SELECT id, username, password_hash FROM users WHERE username = %s", (username,))
    if not user_res:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    user = user_res[0]
    from src.auth import verify_password, generate_token
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    token = generate_token(user["id"], user["username"])
    return {
        "success": True,
        "token": token,
        "username": user["username"]
    }


@app.get("/auth/wake")
def wake_up_db():
    """
    Public endpoint to pre-emptively wake up the database server (cold start mitigation).
    """
    try:
        execute_read("SELECT 1")
        return {"status": "awake", "database": "ready"}
    except Exception as e:
        print(f"[WAKEUP WARNING] Failed to ping database: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/")
def home():
    return {
        "message": "Fraud Detection Platform API is running",
        "version": "2.0.0",
        "status": "active"
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_fraud(transaction: Transaction, user_id: int = Depends(get_current_user)):
    try:
        input_data = transaction.dict()
        
        # Run ML Prediction Pipeline (utilizes cash + XAI perturbation)
        result = predict(input_data)
        
        # Determine initial Analyst Review Queue status
        initial_status = "Pending Review" if result["prediction"] == "Fraud" else "Legitimate"
        
        # Log to Database
        features_json = json.dumps({f"V{i}": getattr(transaction, f"V{i}") for i in range(1, 29)})
        
        db_query = """
        INSERT INTO transactions (amount, features, fraud_probability, prediction, status, user_id)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        # In Postgres, we use RETURNING id. In SQLite fallback, the db module strips it and returns cursor.lastrowid
        from src.db import IS_POSTGRES
        if IS_POSTGRES:
            db_query += " RETURNING id;"
            
        inserted_id = execute_write(
            db_query,
            (transaction.Amount, features_json, result["fraud_probability"], result["prediction"], initial_status, user_id)
        )
        
        # Map returned ID to final output
        result["id"] = inserted_id
        result["status"] = initial_status
        result["amount"] = transaction.Amount
        result["features"] = {f"V{i}": getattr(transaction, f"V{i}") for i in range(1, 29)}
        
        return result
    except Exception as e:
        print(f"[API ERROR] Single prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------
# ASYNCHRONOUS BATCH PROCESSING
# -------------------------------------------------------------

def process_batch_in_background(task_id: str, transactions_list: List[dict], user_id: int):
    """
    FastAPI Background Task to run large batch ML predictions asynchronously.
    Saves results incrementally to Database and exports a final CSV.
    """
    total = len(transactions_list)
    completed = 0
    
    try:
        # Update state to processing
        execute_write(
            "UPDATE batch_jobs SET status = 'processing', total_records = %s WHERE task_id = %s",
            (total, task_id)
        )
        
        predicted_rows = []
        
        for idx, tx in enumerate(transactions_list):
            try:
                # Exclude internal variables
                tx_inputs = {k: v for k, v in tx.items() if k == "Amount" or k.startswith("V")}
                
                # Execute ML pipeline (skip_cache=False to leverage deduplication)
                result = predict(tx_inputs)
                
                # Save transaction log in DB
                initial_status = "Pending Review" if result["prediction"] == "Fraud" else "Legitimate"
                features_json = json.dumps({k: v for k, v in tx_inputs.items() if k.startswith("V")})
                
                # Increment DB
                execute_write(
                    """
                    INSERT INTO transactions (amount, features, fraud_probability, prediction, status, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (tx_inputs.get("Amount", 0.0), features_json, result["fraud_probability"], result["prediction"], initial_status, user_id)
                )
                
                # Assemble record for exported CSV
                csv_record = tx_inputs.copy()
                csv_record["fraud_probability"] = round(result["fraud_probability"], 4)
                csv_record["prediction"] = result["prediction"]
                predicted_rows.append(csv_record)
            except Exception as row_error:
                print(f"[BATCH ROW ERROR] Row {idx} failed: {row_error}")
                
            completed += 1
            # Update progress dynamically every 5 items or when done
            if completed % 5 == 0 or completed == total:
                progress = int((completed / total) * 100)
                execute_write(
                    "UPDATE batch_jobs SET processed_records = %s, progress_percent = %s WHERE task_id = %s",
                    (completed, progress, task_id)
                )

        # Write predicted values to final download CSV
        results_file = f"batch_exports/predicted_{task_id}.csv"
        if predicted_rows:
            headers = list(predicted_rows[0].keys())
            with open(results_file, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                writer.writerows(predicted_rows)
                
        # Set job status to complete
        execute_write(
            "UPDATE batch_jobs SET status = 'completed', results_file = %s WHERE task_id = %s",
            (results_file, task_id)
        )
        print(f"[BATCH TASK] Job {task_id} completed successfully.")
        
    except Exception as e:
        print(f"[BATCH TASK ERROR] Job {task_id} failed: {e}")
        execute_write(
            "UPDATE batch_jobs SET status = 'failed' WHERE task_id = %s",
            (task_id,)
        )


@app.post("/predict_batch")
def predict_fraud_batch(transactions: List[Transaction], background_tasks: BackgroundTasks, user_id: int = Depends(get_current_user)):
    try:
        # Generate an absolute unique ID
        task_id = str(uuid.uuid4())
        total_records = len(transactions)
        
        # Save placeholder in batch_jobs table
        execute_write(
            "INSERT INTO batch_jobs (task_id, status, total_records, processed_records, progress_percent, user_id) VALUES (%s, %s, %s, %s, %s, %s)",
            (task_id, "pending", total_records, 0, 0, user_id)
        )
        
        # Serialize Pydantic objects to dicts
        transactions_dict = [tx.dict() for tx in transactions]
        
        # Register background execution
        background_tasks.add_task(
            process_batch_in_background,
            task_id,
            transactions_dict,
            user_id
        )
        
        return {
            "task_id": task_id,
            "status": "pending",
            "total_records": total_records
        }
        
    except Exception as e:
        print(f"[API ERROR] Batch task initiation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/batch/status/{task_id}")
def get_batch_status(task_id: str, user_id: int = Depends(get_current_user)):
    query = "SELECT task_id, status, total_records, processed_records, progress_percent, results_file, user_id FROM batch_jobs WHERE task_id = %s"
    res = execute_read(query, (task_id,))
    
    if not res:
        raise HTTPException(status_code=404, detail="Batch task not found")
        
    job = res[0]
    if job.get("user_id") is not None and job["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied: You do not own this batch task")
        
    return job


@app.get("/batch/download/{task_id}")
def download_batch_results(task_id: str, user_id: int = Depends(get_current_user)):
    query = "SELECT status, results_file, user_id FROM batch_jobs WHERE task_id = %s"
    res = execute_read(query, (task_id,))
    
    if not res:
        raise HTTPException(status_code=404, detail="Batch task not found")
        
    job = res[0]
    if job.get("user_id") is not None and job["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied: You do not own this batch task")
        
    if job["status"] != "completed" or not job["results_file"] or not os.path.exists(job["results_file"]):
        raise HTTPException(status_code=400, detail="Batch results file not ready or compilation failed")
        
    return FileResponse(
        job["results_file"],
        media_type="text/csv",
        filename=f"predictions_{task_id[:8]}.csv"
    )


# -------------------------------------------------------------
# ANALYST REVIEW QUEUE MANAGEMENT
# -------------------------------------------------------------

@app.get("/transactions")
def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    min_prob: Optional[float] = None,
    max_prob: Optional[float] = None,
    user_id: int = Depends(get_current_user)
):
    offset = (page - 1) * limit
    
    # Base queries
    select_query = "SELECT id, amount, features, fraud_probability, prediction, status, created_at, resolved_at FROM transactions"
    count_query = "SELECT COUNT(*) as total FROM transactions"
    
    # Build dynamic WHERE clause
    where_clauses = ["user_id = %s"]
    params = [user_id]
    
    if status:
        where_clauses.append("status = %s")
        params.append(status)
    if min_amount is not None:
        where_clauses.append("amount >= %s")
        params.append(min_amount)
    if max_amount is not None:
        where_clauses.append("amount <= %s")
        params.append(max_amount)
    if min_prob is not None:
        where_clauses.append("fraud_probability >= %s")
        params.append(min_prob)
    if max_prob is not None:
        where_clauses.append("fraud_probability <= %s")
        params.append(max_prob)
        
    if where_clauses:
        where_str = " WHERE " + " AND ".join(where_clauses)
        select_query += where_str
        count_query += where_str
        
    # Append sorting & pagination to select
    select_query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
    select_params = params + [limit, offset]
    
    try:
        items = execute_read(select_query, tuple(select_params))
        total_res = execute_read(count_query, tuple(params))
        total_count = total_res[0]["total"] if total_res else 0
        
        # Deserialize JSON features for cleaner output
        for item in items:
            if item.get("features"):
                try:
                    item["features"] = json.loads(item["features"])
                except Exception:
                    pass
            
            # Formulate date string safely
            if isinstance(item.get("created_at"), datetime.datetime):
                item["created_at"] = item["created_at"].isoformat()
            if isinstance(item.get("resolved_at"), datetime.datetime):
                item["resolved_at"] = item["resolved_at"].isoformat()
                
        return {
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "items": items
        }
    except Exception as e:
        print(f"[API ERROR] Query transactions failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Endpoint excised in prediction-only scope.
# All status updating transitions are completely disabled in self-service predictive model.


# -------------------------------------------------------------
# METRICS & ANALYTICAL METRICS
# -------------------------------------------------------------

@app.get("/dashboard/stats")
def get_dashboard_statistics(user_id: int = Depends(get_current_user)):
    try:
        # 1. Total Predictions
        vol_res = execute_read("SELECT COUNT(*) as cnt FROM transactions WHERE user_id = %s", (user_id,))
        total_predictions = vol_res[0]["cnt"] if vol_res else 0
        
        # 2. Fraud Flagged
        fraud_res = execute_read("SELECT COUNT(*) as cnt FROM transactions WHERE prediction = 'Fraud' AND user_id = %s", (user_id,))
        fraud_flagged = fraud_res[0]["cnt"] if fraud_res else 0
        overall_fraud_rate = (fraud_flagged / total_predictions * 100) if total_predictions > 0 else 0.0
        
        # 3. Average Risk Score
        risk_res = execute_read("SELECT AVG(fraud_probability) as avg_risk FROM transactions WHERE user_id = %s", (user_id,))
        average_risk_score = round(risk_res[0]["avg_risk"] * 100, 1) if (risk_res and risk_res[0]["avg_risk"] is not None) else 0.0
        
        # 4. Total Analyzed Volume ($)
        sum_res = execute_read("SELECT SUM(amount) as total_sum FROM transactions WHERE user_id = %s", (user_id,))
        total_analyzed_volume = round(sum_res[0]["total_sum"], 2) if (sum_res and sum_res[0]["total_sum"] is not None) else 0.0
        
        # 5. Highest Risk Transaction
        max_res = execute_read("SELECT MAX(fraud_probability) as max_risk FROM transactions WHERE user_id = %s", (user_id,))
        highest_risk_transaction = round(max_res[0]["max_risk"] * 100, 1) if (max_res and max_res[0]["max_risk"] is not None) else 0.0
        
        # 6. Timeline (Historical Data for the line charts)
        from src.db import IS_POSTGRES
        if IS_POSTGRES:
            timeline_query = """
            SELECT CAST(created_at AS DATE) as tx_date, 
                   COUNT(*) as total_count, 
                   SUM(CASE WHEN prediction = 'Fraud' THEN 1 ELSE 0 END) as fraud_count
            FROM transactions
            WHERE user_id = %s
            GROUP BY CAST(created_at AS DATE)
            ORDER BY tx_date DESC
            LIMIT 10;
            """
        else:
            timeline_query = """
            SELECT DATE(created_at) as tx_date, 
                   COUNT(*) as total_count, 
                   SUM(CASE WHEN prediction = 'Fraud' THEN 1 ELSE 0 END) as fraud_count
            FROM transactions
            WHERE user_id = %s
            GROUP BY DATE(created_at)
            ORDER BY tx_date DESC
            LIMIT 10;
            """
            
        timeline_res = execute_read(timeline_query, (user_id,))
        timeline = []
        for day in timeline_res:
            timeline.append({
                "date": str(day["tx_date"]),
                "volume": int(day["total_count"]),
                "fraud": int(day["fraud_count"])
            })
            
        # Reverse to show chronological order
        timeline = timeline[::-1]
        
        # Fallback timeline if database has no records
        if not timeline:
            today = datetime.date.today()
            for i in range(6, -1, -1):
                d = today - datetime.timedelta(days=i)
                timeline.append({
                    "date": d.isoformat(),
                    "volume": 0,
                    "fraud": 0
                })

        # 7. Class Breakdown (🟢 Normal, 🔴 Fraud)
        class_res = execute_read("SELECT prediction, COUNT(*) as cnt FROM transactions WHERE user_id = %s GROUP BY prediction", (user_id,))
        breakdown = {"Normal": 0, "Fraud": 0}
        for r in class_res:
            pred = r.get("prediction", "Normal")
            if pred and pred.lower() == "fraud":
                breakdown["Fraud"] = int(r["cnt"])
            else:
                breakdown["Normal"] = int(r["cnt"])
        
        # 8. Global Feature Importance (from XGBoost Classifier)
        from src.model_loader import load_model
        model_instance = load_model()
        importances = model_instance.feature_importances_
        feature_names = [f"V{i}" for i in range(1, 29)] + ["Amount"]
        global_imp = [
            {"feature": name, "importance": float(imp)}
            for name, imp in zip(feature_names, importances)
        ]
        # Sort descending and get top 10
        global_imp = sorted(global_imp, key=lambda x: x["importance"], reverse=True)[:10]

        # 9. Latest Flagged Fraud Transaction Local SHAP Explanation
        latest_fraud = execute_read("""
            SELECT id, amount, features, fraud_probability 
            FROM transactions 
            WHERE prediction = 'Fraud' AND user_id = %s
            ORDER BY created_at DESC 
            LIMIT 1
        """, (user_id,))
        
        latest_fraud_explanation = None
        if latest_fraud:
            lf = latest_fraud[0]
            try:
                lf_features = json.loads(lf["features"])
                # We need features V1-V28 and Amount
                lf_inputs = {f"V{i}": lf_features.get(f"V{i}", 0.0) for i in range(1, 29)}
                lf_inputs["Amount"] = float(lf["amount"])
                
                from src.explain import explain_transaction
                exp = explain_transaction(lf_inputs, lf["fraud_probability"])
                
                latest_fraud_explanation = {
                    "id": lf["id"],
                    "amount": float(lf["amount"]),
                    "fraud_probability": float(lf["fraud_probability"]),
                    "positive_drivers": exp["positive_drivers"]
                }
            except Exception as exp_err:
                print(f"[XAI DASHBOARD WARNING] Failed to calculate explanation: {exp_err}")

        return {
            "total_volume": int(total_predictions),
            "overall_fraud_rate": round(overall_fraud_rate, 2),
            "pending_reviews": int(fraud_flagged),
            "false_positive_ratio": round(average_risk_score, 1),
            "average_resolution_time": round(highest_risk_transaction, 1),
            "total_analyzed_volume": float(total_analyzed_volume),
            "timeline": timeline,
            "class_breakdown": breakdown,
            "global_importances": global_imp,
            "latest_fraud_explanation": latest_fraud_explanation
        }
    except Exception as e:
        print(f"[API ERROR] Fetch stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
