import os
import pandas as pd
import numpy as np
from src.config import RAW_DATA_PATH, SEVI_WEIGHTS

def load_data(file_path=RAW_DATA_PATH):
    """Loads the state-wise energy deficit dataset."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset not found at {file_path}. Please run synthetic data generator first.")
    
    df = pd.read_csv(file_path)
    df['Date'] = pd.to_datetime(df['Date'])
    return df

def calculate_sevi(df):
    """
    Calculates the State Energy Vulnerability Index (SEVI).
    SEVI = w1 * Norm(Deficit_Percent) + w2 * Norm(Outage_Frequency) + w3 * Norm(Recovery_Time)
    Normalized on a 0-100 scale.
    """
    df_sevi = df.copy()
    
    # We use min-max scaling across the historical dataset to normalize components
    def min_max_scale(series):
        s_min = series.min()
        s_max = series.max()
        if s_max == s_min:
            return series * 0.0
        return (series - s_min) / (s_max - s_min) * 100

    # Normalize components
    df_sevi['Norm_Deficit'] = min_max_scale(df_sevi['Energy_Deficit_Percent'])
    df_sevi['Norm_Outage_Freq'] = min_max_scale(df_sevi['Outage_Frequency'])
    df_sevi['Norm_Recovery_Time'] = min_max_scale(df_sevi['Average_Recovery_Time_Hours'])
    
    # Calculate SEVI
    w_def = SEVI_WEIGHTS['deficit_pct']
    w_freq = SEVI_WEIGHTS['frequency']
    w_rec = SEVI_WEIGHTS['recovery_time']
    
    df_sevi['SEVI'] = (
        w_def * df_sevi['Norm_Deficit'] + 
        w_freq * df_sevi['Norm_Outage_Freq'] + 
        w_rec * df_sevi['Norm_Recovery_Time']
    )
    
    # Round to 2 decimal places
    df_sevi['SEVI'] = df_sevi['SEVI'].round(2)
    return df_sevi

def detect_anomalies(df, threshold=2.5):
    """
    Detects anomalies in Energy_Deficit_Percent and Outage_Frequency.
    Anomalies are detected relative to each State's own historical average
    using the Z-score method.
    """
    df_anom = df.copy()
    df_anom['Deficit_Anomaly'] = False
    df_anom['Outage_Anomaly'] = False
    
    for state in df_anom['State'].unique():
        state_mask = df_anom['State'] == state
        state_data = df_anom[state_mask]
        
        # Deficit Percent Z-score
        def_mean = state_data['Energy_Deficit_Percent'].mean()
        def_std = state_data['Energy_Deficit_Percent'].std()
        if def_std > 0:
            def_z = (state_data['Energy_Deficit_Percent'] - def_mean) / def_std
            df_anom.loc[state_mask, 'Deficit_Anomaly'] = def_z > threshold
            
        # Outage Frequency Z-score
        out_mean = state_data['Outage_Frequency'].mean()
        out_std = state_data['Outage_Frequency'].std()
        if out_std > 0:
            out_z = (state_data['Outage_Frequency'] - out_mean) / out_std
            df_anom.loc[state_mask, 'Outage_Anomaly'] = out_z > threshold
            
    df_anom['Is_Anomaly'] = df_anom['Deficit_Anomaly'] | df_anom['Outage_Anomaly']
    return df_anom

def get_state_summary(df):
    """Returns aggregated metrics state-wise."""
    summary = df.groupby('State').agg(
        Avg_Requirement_MU=('Energy_Requirement_MU', 'mean'),
        Avg_Deficit_Percent=('Energy_Deficit_Percent', 'mean'),
        Total_Deficit_MU=('Energy_Deficit_MU', 'sum'),
        Avg_Outages=('Outage_Frequency', 'mean'),
        Avg_Recovery_Time=('Average_Recovery_Time_Hours', 'mean'),
        Avg_SEVI=('SEVI', 'mean') if 'SEVI' in df.columns else ('Energy_Deficit_Percent', 'mean') # fallback
    ).reset_index()
    
    return summary.round(2)

def get_regional_summary(df):
    """Returns aggregated metrics region-wise."""
    summary = df.groupby('Region').agg(
        Avg_Requirement_MU=('Energy_Requirement_MU', 'mean'),
        Avg_Deficit_Percent=('Energy_Deficit_Percent', 'mean'),
        Avg_Outages=('Outage_Frequency', 'mean'),
        Avg_Recovery_Time=('Average_Recovery_Time_Hours', 'mean')
    ).reset_index()
    return summary.round(2)
