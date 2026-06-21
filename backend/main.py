import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from data_generator import get_or_create_dataset
from models import (
    DataRecord,
    SEVIResponse,
    AnomalyRecord,
    ForecastCompareResponse,
    ForecastCompareMetrics,
    ForecastRequest,
    ForecastResponse,
    AgentRequest,
    AgentResponse,
    train_and_save_models,
    run_forecast_prediction,
    MODEL_PATH
)
from agent import run_agent_query

app = FastAPI(title="India Power Outage Intelligence System API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load dataset once at startup
df = get_or_create_dataset()

@app.get("/")
def read_root():
    return {"message": "Welcome to the India Power Outage Intelligence System API"}

@app.get("/api/data", response_model=List[DataRecord])
def get_data():
    """Returns the full synthetic dataset."""
    try:
        records = df.to_dict(orient="records")
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset: {str(e)}")

@app.get("/api/sevi", response_model=List[SEVIResponse])
def get_sevi():
    """Returns State Energy Vulnerability Index scores and averages per state."""
    try:
        # Group by State and aggregate
        grouped = df.groupby("State").agg({
            "Energy_Requirement_MU": "mean",
            "Energy_Deficit_Percent": "mean",
            "Outage_Frequency": "mean",
            "Average_Recovery_Time_Hours": "mean",
            "SEVI": "mean"
        }).reset_index()
        
        # Rename columns to match Pydantic schema
        grouped.columns = [
            "State",
            "Avg_Requirement_MU",
            "Avg_Deficit_Percent",
            "Avg_Outages",
            "Avg_Recovery_Time",
            "Avg_SEVI"
        ]
        
        # Round values for clean presentation
        grouped = grouped.round(2)
        
        return grouped.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing SEVI: {str(e)}")

@app.get("/api/anomalies", response_model=List[AnomalyRecord])
def get_anomalies():
    """Returns all detected anomaly records."""
    try:
        anomalies_df = df[df["Is_Anomaly"] == True]
        records = anomalies_df.to_dict(orient="records")
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching anomalies: {str(e)}")

@app.get("/api/forecast", response_model=ForecastCompareResponse)
def get_forecast_metrics():
    """Returns Linear Regression + Random Forest metrics comparison."""
    try:
        import pickle
        # Auto-train models if they don't exist yet
        if not os.path.exists(MODEL_PATH):
            train_and_save_models(df)
            
        with open(MODEL_PATH, "rb") as f:
            model_data = pickle.load(f)
            
        metrics = model_data["metrics"]
        feature_count = len(model_data["feature_cols"])
        
        return ForecastCompareResponse(
            lr=ForecastCompareMetrics(
                mae=metrics["lr"]["mae"],
                rmse=metrics["lr"]["rmse"],
                r2=metrics["lr"]["r2"]
            ),
            rf=ForecastCompareMetrics(
                mae=metrics["rf"]["mae"],
                rmse=metrics["rf"]["rmse"],
                r2=metrics["rf"]["r2"]
            ),
            feature_count=feature_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching forecast metrics: {str(e)}")

@app.post("/api/forecast", response_model=ForecastResponse)
def get_forecast_prediction(request: ForecastRequest):
    """Predicts future deficit % for a specific state and target date."""
    try:
        pred_dict = run_forecast_prediction(request.State, request.TargetDate, df)
        return ForecastResponse(**pred_dict)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating forecast: {str(e)}")

@app.post("/api/agent", response_model=AgentResponse)
def query_agent(request: AgentRequest):
    """Queries the LangChain + Gemini Agent with a natural language prompt."""
    try:
        # If chat_history is provided, format it for run_agent_query.
        # run_agent_query expects list of [role, content]
        history = request.chat_history or []
        answer = run_agent_query(request.input, history, request.image_data)
        return AgentResponse(output=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
