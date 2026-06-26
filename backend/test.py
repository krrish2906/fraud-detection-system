from src.predictor import predict
import pandas as pd

# Take real sample
sample = pd.read_csv("../assets/credit_data.csv").iloc[541]

input_data = {
    "Amount": sample["Amount"],
    **{f"V{i}": sample[f"V{i}"] for i in range(1,29)}
}

result = predict(input_data)
print(result)