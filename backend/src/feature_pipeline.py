import joblib
scaler = joblib.load("model/scaler.pkl")

def transform_features(data):
    """
    Apply scaling (same as training)
    """

    # Scale Amount (last column)
    data[0, -1] = scaler.transform([[data[0, -1]]])[0][0]
    return data
