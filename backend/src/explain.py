import joblib
import numpy as np
from src.preprocessing import preprocess_input
from src.feature_pipeline import transform_features
from src.model_loader import load_model

# Load models and stats
model = load_model()
imputer = joblib.load("model/imputer.pkl")


def explain_transaction(input_data: dict, baseline_prob: float) -> dict:
    """
    Computes local feature contributions (attributions) using perturbation analysis.
    For each feature, we replace its value with its imputed population mean (baseline),
    re-run inference, and calculate the difference in probability:
    
    Contribution = Baseline_Prob - Perturbed_Prob
    
    Positive Contribution -> The feature's value increased the fraud probability.
    Negative Contribution -> The feature's value decreased the fraud probability.
    """
    contributions = {}
    
    # Feature list: V1-V28 and Amount
    features_to_test = [f"V{i}" for i in range(1, 29)] + ["Amount"]
    
    for feature in features_to_test:
        # Create a deep copy of raw input data
        perturbed_input = input_data.copy()
        
        # Replace target feature with its population baseline mean
        perturbed_input[feature] = imputer.get(feature, 0.0)
        
        # Run standard preprocessing and inference pipelines
        try:
            prep_data = preprocess_input(perturbed_input)
            transformed_data = transform_features(prep_data)
            perturbed_prob = float(model.predict_proba(transformed_data)[0][1])
            
            # Contribution is the probability shift
            contributions[feature] = float(baseline_prob - perturbed_prob)
        except Exception as e:
            print(f"[XAI WARNING] Failed to explain feature {feature}: {e}")
            contributions[feature] = 0.0

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
