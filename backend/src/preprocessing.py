import numpy as np
import joblib

imputer = joblib.load("model/imputer.pkl")
EXPECTED_FEATURES = 28  # V1–V28

def preprocess_input(input_data: dict):
    """
    Raw input → validated + imputed + structured array
    """

    processed_features = []
    # 1. Process PCA features V1–V28
    for i in range(1, 29):
        key = f"V{i}"
        value = input_data.get(key, None)

        # Missing value handling
        if value is None or (isinstance(value, float) and np.isnan(value)):
            value = imputer[key]
        processed_features.append(float(value))

    # 2. Process Amount
    amount = input_data.get("Amount", None)
    if amount is None or (isinstance(amount, float) and np.isnan(amount)):
        amount = imputer["Amount"]

    # 3. Combine → Exact training format
    data = np.append(processed_features, float(amount))

    # 4. Reshape for model
    data = data.reshape(1, -1)
    return data