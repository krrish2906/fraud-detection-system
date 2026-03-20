from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from src.predictor import predict
from fastapi.middleware.cors import CORSMiddleware

# App metadata
app = FastAPI(
    title="Fraud Detection API",
    description="ML-powered API to detect fraudulent transactions",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

class PredictionResponse(BaseModel):
    fraud_probability: float
    prediction: str

@app.get("/")
def home():
    return {"message": "Fraud Detection API is running"}

@app.post("/predict", response_model=PredictionResponse)
def predict_fraud(transaction: Transaction):
    try:
        input_data = transaction.dict()
        result = predict(input_data)
        return {
            "fraud_probability": round(result["fraud_probability"], 4),
            "prediction": result["prediction"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_batch", response_model=List[PredictionResponse])
def predict_fraud_batch(transactions: List[Transaction]):
    try:
        results = []
        for tx in transactions:
            input_data = tx.dict()
            result = predict(input_data)
            results.append({
                "fraud_probability": round(result["fraud_probability"], 4),
                "prediction": result["prediction"]
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
