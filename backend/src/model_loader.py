import joblib

def load_model():
    return joblib.load("model/model.pkl")

def load_threshold():
    return joblib.load("model/threshold.pkl")