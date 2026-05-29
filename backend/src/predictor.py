from src.preprocessing import preprocess_input
from src.feature_pipeline import transform_features
from src.model_loader import load_model, load_threshold
from src.cache import get_transaction_hash, get_cached_prediction, set_cached_prediction
from src.explain import explain_transaction

model = load_model()
threshold = load_threshold()

def predict(input_data: dict, skip_cache: bool = False) -> dict:
    """
    Full prediction pipeline:
    raw input → cache check → preprocessing → transformation → model → explain → cache store → output
    """
    # Exclude V-features or non-inputs that are passed
    features_only = {
        k: float(v) for k, v in input_data.items()
        if k == "Amount" or k.startswith("V")
    }

    # Step 1: Compute cache key and check cache
    tx_hash = get_transaction_hash(features_only)
    if not skip_cache:
        cached_result = get_cached_prediction(tx_hash)
        if cached_result:
            return cached_result

    # Step 2: Preprocess input
    data = preprocess_input(features_only)

    # Step 3: Transform features (scaling)
    data = transform_features(data)

    # Step 4: Predict probability
    prob = float(model.predict_proba(data)[0][1])

    # Step 5: Apply decision threshold
    pred = 1 if prob >= threshold else 0

    # Step 6: Generate explainability metrics (XAI)
    explanation = explain_transaction(features_only, prob)

    # Assemble response
    result = {
        "fraud_probability": prob,
        "prediction": "Fraud" if pred == 1 else "Normal",
        "explanation": {
            "positive_drivers": explanation["positive_drivers"],
            "negative_drivers": explanation["negative_drivers"],
            "all_contributions": explanation["all_contributions"]
        },
        "tx_hash": tx_hash
    }

    # Step 7: Store in cache for future requests
    set_cached_prediction(tx_hash, result)

    return result