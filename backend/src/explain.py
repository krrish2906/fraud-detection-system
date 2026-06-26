import joblib
import numpy as np
from src.model_loader import load_model

# Load models and stats
model = load_model()
imputer = joblib.load("model/imputer.pkl")
scaler = joblib.load("model/scaler.pkl")


def explain_transaction(input_data: dict, baseline_prob: float) -> dict:
    """
    Computes local feature contributions (attributions) using batch perturbation analysis.
    Instead of running 29 separate sequential model predictions in a loop, we construct
    a single batch matrix of shape (29, 29) where each row represents one perturbed feature vector,
    scale it vectorially, and perform a single batch call to XGBoost predict_proba.
    
    Contribution = Baseline_Prob - Perturbed_Prob
    """
    features_to_test = [f"V{i}" for i in range(1, 29)] + ["Amount"]
    
    # 1. Construct the base vector representing input features
    base_vector = np.zeros(29)
    for i in range(1, 29):
        val = input_data.get(f"V{i}", None)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            val = imputer.get(f"V{i}", 0.0)
        base_vector[i - 1] = float(val)
        
    amt = input_data.get("Amount", None)
    if amt is None or (isinstance(amt, float) and np.isnan(amt)):
        amt = imputer.get("Amount", 0.0)
    base_vector[28] = float(amt)
    
    # 2. Build a matrix of shape (29, 29) where all rows are initially copies of the base vector
    batch_matrix = np.tile(base_vector, (29, 1))
    
    # 3. Perturb the j-th feature in the j-th row with its imputed population mean
    for j, feature in enumerate(features_to_test):
        batch_matrix[j, j] = imputer.get(feature, 0.0)
        
    # 4. Vectorized Feature Pipeline: Scale the last column (Amount) for all rows at once
    amounts = batch_matrix[:, 28].reshape(-1, 1)
    scaled_amounts = scaler.transform(amounts)
    batch_matrix[:, 28] = scaled_amounts.ravel()
    
    # 5. Run single-call batch inference
    try:
        probs = model.predict_proba(batch_matrix)[:, 1]  # Shape: (29,)
    except Exception as e:
        print(f"[XAI ERROR] Batch explanation inference failed: {e}")
        probs = np.full(29, baseline_prob)
        
    # 6. Map results back to the contributions dictionary
    contributions = {}
    for j, feature in enumerate(features_to_test):
        contributions[feature] = float(baseline_prob - float(probs[j]))

    # Sort and separate positive and negative drivers
    sorted_features = sorted(contributions.items(), key=lambda x: x[1], reverse=True)
    
    # Filter to actual meaningful changes (top 5 positive, top 5 negative)
    positive_drivers = [{"feature": f, "score": round(s, 6)} for f, s in sorted_features if s > 0.0001][:5]
    
    # Negative drivers sorted by most negative first (largest absolute decrease)
    negative_drivers = [{"feature": f, "score": round(s, 6)} for f, s in sorted_features[::-1] if s < -0.0001][:5]

    return {
        "positive_drivers": positive_drivers,
        "negative_drivers": negative_drivers,
        "all_contributions": {f: round(s, 6) for f, s in contributions.items()}
    }
