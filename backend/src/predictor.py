from src.preprocessing import preprocess_input
from src.feature_pipeline import transform_features
from src.model_loader import load_model, load_threshold

model = load_model()
threshold = load_threshold()

def predict(input_data: dict):
    """
    Full prediction pipeline:
    raw input → preprocessing → transformation → model → output
    """

    # Step 1: preprocess
    data = preprocess_input(input_data)

    # Step 2: transform
    data = transform_features(data)

    # Step 3: predict probability
    prob = model.predict_proba(data)[0][1]

    # Step 4: apply threshold
    pred = 1 if prob >= threshold else 0

    return {
        "fraud_probability": float(prob),
        "prediction": "Fraud" if pred == 1 else "Normal"
    }