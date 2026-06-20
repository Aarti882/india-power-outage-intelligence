import os
import pickle
import numpy as np
import pandas as pd
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# --- Pydantic Schema definitions for API ---

class DataRecord(BaseModel):
    Date: str
    State: str
    Region: str
    Energy_Requirement_MU: float
    Energy_Supplied_MU: float
    Energy_Deficit_MU: float
    Energy_Deficit_Percent: float
    Peak_Demand_MW: float
    Peak_Met_MW: float
    Peak_Deficit_MW: float
    Outage_Frequency: int
    Average_Recovery_Time_Hours: float
    SEVI: float
    Is_Anomaly: bool

class SEVIResponse(BaseModel):
    State: str
    Avg_Requirement_MU: float
    Avg_Deficit_Percent: float
    Avg_Outages: float
    Avg_Recovery_Time: float
    Avg_SEVI: float

class AnomalyRecord(BaseModel):
    Date: str
    State: str
    Region: str
    Energy_Deficit_Percent: float
    Outage_Frequency: int
    Average_Recovery_Time_Hours: float
    Deficit_Anomaly: bool
    Outage_Anomaly: bool

class ForecastCompareMetrics(BaseModel):
    mae: float
    rmse: float
    r2: float

class ForecastCompareResponse(BaseModel):
    lr: ForecastCompareMetrics
    rf: ForecastCompareMetrics
    feature_count: int

class ForecastRequest(BaseModel):
    State: str
    TargetDate: str # e.g. "2025-01-01"

class ForecastResponse(BaseModel):
    State: str
    TargetDate: str
    Predicted_Deficit_Percent_LR: float
    Predicted_Deficit_Percent_RF: float
    Lags: List[float]

class AgentRequest(BaseModel):
    input: str
    chat_history: Optional[List[List[str]]] = None # list of [role, content]
    image_data: Optional[str] = None # Optional base64 image data

class AgentResponse(BaseModel):
    output: str

# --- Machine Learning Engine Code ---

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'outage_forecasting_models.pkl')

def prepare_features(df):
    """Features engineering with lag and rolling windows."""
    df_feat = df.copy()
    
    # Sort to ensure correct lag calculations
    df_feat = df_feat.sort_values(by=['State', 'Date']).reset_index(drop=True)
    
    # Temporal features
    df_feat['Month'] = pd.to_datetime(df_feat['Date']).dt.month
    df_feat['Year'] = pd.to_datetime(df_feat['Date']).dt.year
    
    # Lag features
    df_feat['Deficit_Lag_1'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(1)
    df_feat['Deficit_Lag_2'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(2)
    df_feat['Deficit_Lag_3'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(3)
    
    # Rolling statistics
    df_feat['Deficit_Roll_Mean_3'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(1).transform(lambda x: x.rolling(3).mean())
    df_feat['Deficit_Roll_Std_3'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(1).transform(lambda x: x.rolling(3).std())
    
    # Target variable (deficit % of next month)
    df_feat['Target'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(-1)
    
    # Drop rows with NaN (due to lags and shifts)
    df_feat = df_feat.dropna().reset_index(drop=True)
    return df_feat

def train_and_save_models(df):
    """Trains forecasting models and saves them locally."""
    df_feat = prepare_features(df)
    
    # One-hot encode State
    df_encoded = pd.get_dummies(df_feat, columns=['State'], drop_first=False)
    
    # Define features and target (exclude labels/metas to prevent leakage)
    metadata_cols = ['Date', 'Region', 'Energy_Requirement_MU', 'Energy_Supplied_MU', 
                     'Energy_Deficit_MU', 'Energy_Deficit_Percent', 'Peak_Demand_MW', 'Peak_Met_MW', 
                     'Peak_Deficit_MW', 'Outage_Frequency', 'Average_Recovery_Time_Hours', 
                     'Norm_Deficit', 'Norm_Outage_Freq', 'Norm_Recovery_Time', 'SEVI', 'Target',
                     'Deficit_Anomaly', 'Outage_Anomaly', 'Is_Anomaly']
    
    feature_cols = [col for col in df_encoded.columns if col not in metadata_cols]
    
    # Temporal Split: Train on years < 2024, test on 2024
    train_mask = df_encoded['Year'] < 2024
    test_mask = df_encoded['Year'] == 2024
    
    X_train, y_train = df_encoded.loc[train_mask, feature_cols], df_encoded.loc[train_mask, 'Target']
    X_test, y_test = df_encoded.loc[test_mask, feature_cols], df_encoded.loc[test_mask, 'Target']
    
    num_cols = ['Year', 'Month', 'Deficit_Lag_1', 'Deficit_Lag_2', 'Deficit_Lag_3', 'Deficit_Roll_Mean_3', 'Deficit_Roll_Std_3']
    scaler = StandardScaler()
    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    
    X_train_scaled[num_cols] = scaler.fit_transform(X_train[num_cols])
    X_test_scaled[num_cols] = scaler.transform(X_test[num_cols])
    
    # 1. Linear Regression
    lr = LinearRegression()
    lr.fit(X_train_scaled, y_train)
    y_pred_lr = lr.predict(X_test_scaled)
    
    # 2. Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train_scaled, y_train)
    y_pred_rf = rf.predict(X_test_scaled)
    
    # Evaluate
    model_data = {
        'linear_regression': lr,
        'random_forest': rf,
        'scaler': scaler,
        'feature_cols': feature_cols,
        'numerical_cols': num_cols,
        'metrics': {
            'lr': {
                'mae': float(mean_absolute_error(y_test, y_pred_lr)),
                'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred_lr))),
                'r2': float(r2_score(y_test, y_pred_lr))
            },
            'rf': {
                'mae': float(mean_absolute_error(y_test, y_pred_rf)),
                'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred_rf))),
                'r2': float(r2_score(y_test, y_pred_rf))
            }
        }
    }
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model_data, f)
        
    print(f"Models saved successfully to {MODEL_PATH}!")
    return model_data

def run_forecast_prediction(state: str, target_date_str: str, df: pd.DataFrame) -> dict:
    """Predicts next month deficit % using saved Random Forest and Linear Regression models."""
    if not os.path.exists(MODEL_PATH):
        # Auto train if missing
        train_and_save_models(df)
        
    with open(MODEL_PATH, 'rb') as f:
        model_data = pickle.load(f)
        
    lr = model_data['linear_regression']
    rf = model_data['random_forest']
    scaler = model_data['scaler']
    feature_cols = model_data['feature_cols']
    num_cols = model_data['numerical_cols']
    
    # Prepare lags for state
    state_data = df[df['State'] == state].sort_values(by='Date')
    if len(state_data) < 3:
        raise ValueError(f"Insufficient historical data for state: {state}")
        
    latest_deficits = state_data['Energy_Deficit_Percent'].tail(3).values
    target_date = pd.to_datetime(target_date_str)
    
    # Build feature row
    row_dict = {}
    row_dict['Year'] = target_date.year
    row_dict['Month'] = target_date.month
    
    row_dict['Deficit_Lag_1'] = latest_deficits[-1]
    row_dict['Deficit_Lag_2'] = latest_deficits[-2]
    row_dict['Deficit_Lag_3'] = latest_deficits[-3]
    
    row_dict['Deficit_Roll_Mean_3'] = np.mean(latest_deficits)
    row_dict['Deficit_Roll_Std_3'] = np.std(latest_deficits)
    
    for col in feature_cols:
        if col.startswith('State_'):
            state_name = col.replace('State_', '')
            row_dict[col] = 1 if state_name == state else 0
            
    df_row = pd.DataFrame([row_dict])[feature_cols]
    df_row[num_cols] = scaler.transform(df_row[num_cols])
    
    pred_lr = lr.predict(df_row)[0]
    pred_rf = rf.predict(df_row)[0]
    
    return {
        'State': state,
        'TargetDate': target_date_str,
        'Predicted_Deficit_Percent_LR': max(0.0, float(round(pred_lr, 3))),
        'Predicted_Deficit_Percent_RF': max(0.0, float(round(pred_rf, 3))),
        'Lags': latest_deficits.tolist()
    }
