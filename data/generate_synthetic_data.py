import os
import numpy as np
import pandas as pd

# Define States, Regions, and their characteristics
STATES_INFO = {
    'Uttar Pradesh': {'Region': 'Northern', 'Base_Req': 8500, 'Deficit_Profile': 'high', 'Recovery_Base': 5.5},
    'Rajasthan': {'Region': 'Northern', 'Base_Req': 6000, 'Deficit_Profile': 'medium', 'Recovery_Base': 4.2},
    'Punjab': {'Region': 'Northern', 'Base_Req': 5000, 'Deficit_Profile': 'medium', 'Recovery_Base': 3.5},
    'Haryana': {'Region': 'Northern', 'Base_Req': 4800, 'Deficit_Profile': 'medium', 'Recovery_Base': 3.2},
    'Delhi': {'Region': 'Northern', 'Base_Req': 2500, 'Deficit_Profile': 'low', 'Recovery_Base': 1.8},
    'Maharashtra': {'Region': 'Western', 'Base_Req': 12000, 'Deficit_Profile': 'low_medium', 'Recovery_Base': 2.8},
    'Gujarat': {'Region': 'Western', 'Base_Req': 9500, 'Deficit_Profile': 'low', 'Recovery_Base': 2.0},
    'Madhya Pradesh': {'Region': 'Western', 'Base_Req': 6500, 'Deficit_Profile': 'medium', 'Recovery_Base': 4.0},
    'Tamil Nadu': {'Region': 'Southern', 'Base_Req': 9000, 'Deficit_Profile': 'low_medium', 'Recovery_Base': 2.5},
    'Karnataka': {'Region': 'Southern', 'Base_Req': 7000, 'Deficit_Profile': 'low_medium', 'Recovery_Base': 2.9},
    'Andhra Pradesh': {'Region': 'Southern', 'Base_Req': 5500, 'Deficit_Profile': 'medium', 'Recovery_Base': 3.4},
    'Telangana': {'Region': 'Southern', 'Base_Req': 6000, 'Deficit_Profile': 'medium', 'Recovery_Base': 3.1},
    'West Bengal': {'Region': 'Eastern', 'Base_Req': 4500, 'Deficit_Profile': 'medium', 'Recovery_Base': 3.8},
    'Bihar': {'Region': 'Eastern', 'Base_Req': 2800, 'Deficit_Profile': 'high', 'Recovery_Base': 6.5},
    'Assam': {'Region': 'North-Eastern', 'Base_Req': 800, 'Deficit_Profile': 'high', 'Recovery_Base': 7.0}
}

def generate_data(start_year=2015, end_year=2024):
    np.random.seed(42)
    
    dates = pd.date_range(start=f'{start_year}-01-01', end=f'{end_year}-12-01', freq='MS')
    data_list = []
    
    for state, info in STATES_INFO.items():
        region = info['Region']
        base_req = info['Base_Req']
        def_profile = info['Deficit_Profile']
        rec_base = info['Recovery_Base']
        
        # Yearly growth rate (roughly 4-6% compound annual growth)
        growth_rate = np.random.uniform(0.04, 0.06)
        
        for date in dates:
            year = date.year
            month = date.month
            
            # Years elapsed since start
            years_elapsed = year - start_year
            
            # Base requirement with yearly growth
            yearly_req = base_req * ((1 + growth_rate) ** years_elapsed)
            
            # Seasonal factor: demand peaks in summer (April-July) and slight winter peak (Oct-Dec)
            # We'll model this using sine waves and offsets
            summer_months = [4, 5, 6, 7]
            winter_months = [10, 11, 12]
            
            if month in summer_months:
                seasonal_factor = np.random.uniform(1.15, 1.30)
            elif month in winter_months:
                seasonal_factor = np.random.uniform(1.02, 1.10)
            else:
                seasonal_factor = np.random.uniform(0.85, 0.95)
                
            requirement = yearly_req * seasonal_factor + np.random.normal(0, base_req * 0.02)
            
            # Deficit Profile trend (India has significantly reduced its energy deficit from 2015 to 2024)
            # In 2015, deficits were higher. By 2024, they are mostly very low except during extreme peak summer.
            if def_profile == 'high':
                base_deficit_pct = np.random.uniform(7.0, 12.0)
                improvement_factor = 0.85 ** years_elapsed # Deficit reduces by 15% each year
            elif def_profile == 'medium':
                base_deficit_pct = np.random.uniform(4.0, 7.0)
                improvement_factor = 0.80 ** years_elapsed
            elif def_profile == 'low_medium':
                base_deficit_pct = np.random.uniform(2.0, 4.0)
                improvement_factor = 0.75 ** years_elapsed
            else: # low
                base_deficit_pct = np.random.uniform(0.5, 1.5)
                improvement_factor = 0.70 ** years_elapsed
                
            # Deficit increases during summer peaks
            seasonal_deficit_multiplier = 1.8 if month in summer_months else 0.8
            
            deficit_percent = base_deficit_pct * improvement_factor * seasonal_deficit_multiplier
            # Add some randomness but clip at 0
            deficit_percent = max(0.0, deficit_percent + np.random.normal(0, 0.3))
            
            # Energy Supplied
            supplied = requirement * (1 - (deficit_percent / 100))
            deficit_mu = requirement - supplied
            
            # Peak Demand in MW (approximate mapping from MU: MW = MU / 24 hrs * load_factor * scaling)
            peak_demand = (requirement / 720) * 1.5 * 1000  # 720 hours in month
            # Peak Deficit % is typically slightly higher than energy deficit %
            peak_deficit_pct = deficit_percent * np.random.uniform(1.2, 1.5)
            peak_met = peak_demand * (1 - (peak_deficit_pct / 100))
            peak_deficit = peak_demand - peak_met
            
            # Outage frequency (highly correlated with deficit percent and peak season)
            # e.g., base outages + random component + (deficit % * scaling)
            base_outages = 5 if def_profile == 'low' else (10 if def_profile == 'medium' or def_profile == 'low_medium' else 20)
            seasonal_outages = 10 if month in summer_months else 2
            outage_freq = base_outages + seasonal_outages + (deficit_percent * 2.5) + np.random.poisson(3)
            outage_freq = max(1, int(round(outage_freq)))
            
            # Average Recovery Time (increases during peak demand months due to grid stress)
            recovery_mult = 1.3 if month in summer_months else 1.0
            recovery_time = rec_base * recovery_mult + np.random.normal(0, 0.5)
            recovery_time = max(0.5, round(recovery_time, 2))
            
            data_list.append({
                'Date': date.strftime('%Y-%m-%d'),
                'State': state,
                'Region': region,
                'Energy_Requirement_MU': round(requirement, 2),
                'Energy_Supplied_MU': round(supplied, 2),
                'Energy_Deficit_MU': round(deficit_mu, 2),
                'Energy_Deficit_Percent': round(deficit_percent, 3),
                'Peak_Demand_MW': round(peak_demand, 2),
                'Peak_Met_MW': round(peak_met, 2),
                'Peak_Deficit_MW': round(peak_deficit, 2),
                'Outage_Frequency': outage_freq,
                'Average_Recovery_Time_Hours': recovery_time
            })
            
    df = pd.DataFrame(data_list)
    return df

if __name__ == '__main__':
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    print("Generating synthetic state-wise energy deficit dataset (2015-2024)...")
    dataset = generate_data()
    
    output_path = os.path.join('data', 'state_wise_energy_deficit.csv')
    dataset.to_csv(output_path, index=False)
    print(f"Dataset successfully created and saved to {output_path}!")
    print(f"Total Rows: {len(dataset)}")
    print(dataset.head())
