import os
import pickle
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

from src.config import MODEL_DIR
from src.data_processing import load_data, calculate_sevi

def prepare_features(df):
    """
    Performs feature engineering for energy deficit forecasting.
    Creates lag features, rolling statistics, and temporal features.
    """
    df_feat = df.copy()
    
    # Sort to ensure correct lag calculations
    df_feat = df_feat.sort_values(by=['State', 'Date']).reset_index(drop=True)
    
    # Feature 1: Temporal features
    df_feat['Month'] = df_feat['Date'].dt.month
    df_feat['Year'] = df_feat['Date'].dt.year
    
    # Feature 2: Lag features
    df_feat['Deficit_Lag_1'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(1)
    df_feat['Deficit_Lag_2'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(2)
    df_feat['Deficit_Lag_3'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(3)
    
    # Feature 3: Rolling statistics
    df_feat['Deficit_Roll_Mean_3'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(1).transform(lambda x: x.rolling(3).mean())
    df_feat['Deficit_Roll_Std_3'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(1).transform(lambda x: x.rolling(3).std())
    
    # Target variable: Deficit percent of the next month (shift -1)
    df_feat['Target'] = df_feat.groupby('State')['Energy_Deficit_Percent'].shift(-1)
    
    # Drop rows with NaN (due to lags and shifts)
    df_feat = df_feat.dropna().reset_index(drop=True)
    
    return df_feat

def train_and_evaluate():
    """
    Trains Linear Regression and Random Forest models on historical data.
    Splits train/test temporally: 2015-2023 for training, 2024 for testing.
    Saves models, scaler, and features metadata.
    """
    # Load and process data
    df = load_data()
    df_sevi = calculate_sevi(df)
    df_features = prepare_features(df_sevi)
    
    # One-hot encode the 'State' column
    df_encoded = pd.get_dummies(df_features, columns=['State'], drop_first=False)
    
    # Define features and target
    # Exclude non-numeric or raw target/metadata columns
    metadata_cols = ['Date', 'Region', 'Energy_Requirement_MU', 'Energy_Supplied_MU', 
                     'Energy_Deficit_MU', 'Energy_Deficit_Percent', 'Peak_Demand_MW', 'Peak_Met_MW', 
                     'Peak_Deficit_MW', 'Outage_Frequency', 'Average_Recovery_Time_Hours', 
                     'Norm_Deficit', 'Norm_Outage_Freq', 'Norm_Recovery_Time', 'SEVI', 'Target']
    
    feature_cols = [col for col in df_encoded.columns if col not in metadata_cols]
    
    # Temporal Split: Train on years < 2024, test on 2024
    train_mask = df_encoded['Year'] < 2024
    test_mask = df_encoded['Year'] == 2024
    
    X_train = df_encoded.loc[train_mask, feature_cols]
    y_train = df_encoded.loc[train_mask, 'Target']
    
    X_test = df_encoded.loc[test_mask, feature_cols]
    y_test = df_encoded.loc[test_mask, 'Target']
    
    print(f"Training features count: {len(feature_cols)}")
    print(f"Train set size: {X_train.shape[0]}, Test set size: {X_test.shape[0]}")
    
    # Scale numerical features (excluding one-hot columns)
    num_cols = ['Year', 'Month', 'Deficit_Lag_1', 'Deficit_Lag_2', 'Deficit_Lag_3', 
                'Deficit_Roll_Mean_3', 'Deficit_Roll_Std_3']
    
    scaler = StandardScaler()
    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    
    X_train_scaled[num_cols] = scaler.fit_transform(X_train[num_cols])
    X_test_scaled[num_cols] = scaler.transform(X_test[num_cols])
    
    # 1. Linear Regression
    lr = LinearRegression()
    lr.fit(X_train_scaled, y_train)
    y_pred_lr = lr.predict(X_test_scaled)
    
    # LR Metrics
    lr_mae = mean_absolute_error(y_test, y_pred_lr)
    lr_rmse = np.sqrt(mean_squared_error(y_test, y_pred_lr))
    lr_r2 = r2_score(y_test, y_pred_lr)
    
    # 2. Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train_scaled, y_train)
    y_pred_rf = rf.predict(X_test_scaled)
    
    # RF Metrics
    rf_mae = mean_absolute_error(y_test, y_pred_rf)
    rf_rmse = np.sqrt(mean_squared_error(y_test, y_pred_rf))
    rf_r2 = r2_score(y_test, y_pred_rf)
    
    print("\n--- Model Evaluation Results (Test Set 2024) ---")
    print(f"Linear Regression  -> MAE: {lr_mae:.4f}, RMSE: {lr_rmse:.4f}, R2: {lr_r2:.4f}")
    print(f"Random Forest      -> MAE: {rf_mae:.4f}, RMSE: {rf_rmse:.4f}, R2: {rf_r2:.4f}")
    
    # Save the models and scaler
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # We save a dictionary containing both models, the scaler, features list, and performance metrics
    model_data = {
        'linear_regression': lr,
        'random_forest': rf,
        'scaler': scaler,
        'feature_cols': feature_cols,
        'numerical_cols': num_cols,
        'metrics': {
            'lr': {'mae': lr_mae, 'rmse': lr_rmse, 'r2': lr_r2},
            'rf': {'mae': rf_mae, 'rmse': rf_rmse, 'r2': rf_r2}
        }
    }
    
    model_path = os.path.join(MODEL_DIR, 'outage_forecasting_models.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model_data, f)
        
    print(f"\nModels successfully saved to {model_path}!")
    
    # Return metrics for comparison plot
    return model_data

def predict_next_month(state, target_date_str="2025-01-01"):
    """
    Predicts the energy deficit percentage for a specific state for a future month.
    Uses the trained Random Forest model (or whichever model is preferred).
    """
    model_path = os.path.join(MODEL_DIR, 'outage_forecasting_models.pkl')
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found. Please train models first.")
        
    with open(model_path, 'rb') as f:
        model_data = pickle.load(f)
        
    lr = model_data['linear_regression']
    rf = model_data['random_forest']
    scaler = model_data['scaler']
    feature_cols = model_data['feature_cols']
    num_cols = model_data['numerical_cols']
    
    # Load original dataset to get latest values for building lags
    df = load_data()
    df_sevi = calculate_sevi(df)
    
    # Filter state data and get the last 3 months of deficit percents
    state_data = df_sevi[df_sevi['State'] == state].sort_values(by='Date')
    if len(state_data) < 3:
        raise ValueError(f"Insufficient historical data for state: {state}")
        
    latest_deficits = state_data['Energy_Deficit_Percent'].tail(3).values
    
    # Parse target date
    target_date = pd.to_datetime(target_date_str)
    
    # Build single feature row
    row_dict = {}
    row_dict['Year'] = target_date.year
    row_dict['Month'] = target_date.month
    
    # Lag 1 is the most recent month in the dataset
    row_dict['Deficit_Lag_1'] = latest_deficits[-1]
    row_dict['Deficit_Lag_2'] = latest_deficits[-2]
    row_dict['Deficit_Lag_3'] = latest_deficits[-3]
    
    # Rolling stats
    row_dict['Deficit_Roll_Mean_3'] = np.mean(latest_deficits)
    row_dict['Deficit_Roll_Std_3'] = np.std(latest_deficits)
    
    # One-hot encoding of state columns
    for col in feature_cols:
        if col.startswith('State_'):
            state_name = col.replace('State_', '')
            row_dict[col] = 1 if state_name == state else 0
            
    # Convert to DataFrame
    df_row = pd.DataFrame([row_dict])
    
    # Reorder columns to match feature_cols
    df_row = df_row[feature_cols]
    
    # Scale numerical columns
    df_row_scaled = df_row.copy()
    df_row_scaled[num_cols] = scaler.transform(df_row[num_cols])
    
    # Predict
    pred_lr = lr.predict(df_row_scaled)[0]
    pred_rf = rf.predict(df_row_scaled)[0]
    
    return {
        'state': state,
        'date': target_date_str,
        'predicted_deficit_percent_lr': max(0.0, float(round(pred_lr, 3))),
        'predicted_deficit_percent_rf': max(0.0, float(round(pred_rf, 3))),
        'lags': latest_deficits.tolist()
    }

if __name__ == '__main__':
    print("Starting training and evaluation pipeline...")
    train_and_evaluate()
