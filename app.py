import os
import json
import pickle
import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime

from src.data_processing import (
    load_data, 
    calculate_sevi, 
    detect_anomalies, 
    get_state_summary, 
    get_regional_summary
)
from src.modeling import predict_next_month
from src.agent import create_power_intelligence_agent
from src.config import SEVI_WEIGHTS, MODEL_DIR

# Page Configuration
st.set_page_config(
    page_title="India Power Outage Intelligence System",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for rich aesthetics and premium Dark Navy + Orange styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
    
    /* General body & container backgrounds */
    html, body, [class*="css"] {
        font-family: 'Outfit', sans-serif;
    }
    
    .stApp {
        background-color: #070c1e;
        color: #e2e8f0;
    }
    
    /* Sidebar styling */
    section[data-testid="stSidebar"] {
        background-color: #030611 !important;
        border-right: 1px solid rgba(255, 122, 0, 0.15) !important;
    }
    
    section[data-testid="stSidebar"] .stMarkdown {
        color: #94a3b8;
    }
    
    /* Main titles & headers */
    .main-title {
        font-size: 2.8rem;
        font-weight: 700;
        background: linear-gradient(135deg, #FF7A00, #FFA800, #FFFFFF);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    
    .subtitle {
        font-size: 1.2rem;
        color: #94a3b8;
        margin-bottom: 2rem;
    }
    
    /* Custom premium HTML metric card wrapper */
    .metric-card-container {
        display: flex;
        flex-direction: column;
        background: #0c122b;
        border: 1px solid rgba(255, 122, 0, 0.15);
        border-left: 5px solid #ff7a00;
        border-radius: 12px;
        padding: 1.2rem 1.5rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        margin-bottom: 1rem;
        transition: all 0.3s ease;
    }
    
    .metric-card-container:hover {
        transform: translateY(-3px);
        border-color: rgba(255, 122, 0, 0.4);
        box-shadow: 0 20px 25px -5px rgba(255, 122, 0, 0.08), 0 10px 10px -5px rgba(255, 122, 0, 0.08);
    }
    
    .metric-card-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.3rem;
    }
    
    .metric-card-value {
        font-size: 2.1rem;
        font-weight: 700;
        color: #ff7a00;
        line-height: 1.1;
    }
    
    .metric-card-subtext {
        font-size: 0.8rem;
        color: #cbd5e1;
        margin-top: 0.4rem;
    }
    
    .sevi-badge {
        background: linear-gradient(135deg, #ff7a00, #ff5000);
        color: white;
        padding: 0.3rem 0.6rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
    }
    
    /* Scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    ::-webkit-scrollbar-track {
        background: #070c1e;
    }
    ::-webkit-scrollbar-thumb {
        background: #1a2035;
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #ff7a00;
    }
    
    /* Streamlit dataframe background and borders styling overrides */
    [data-testid="stTable"], [data-testid="stDataFrame"] {
        background-color: #0c122b !important;
        border-radius: 8px;
        overflow: hidden;
    }
    
    /* Chat elements theme alignment */
    .stChatMessage {
        background-color: #0c122b !important;
        border: 1px solid rgba(255, 122, 0, 0.1) !important;
        border-radius: 8px !important;
    }
</style>
""", unsafe_allow_html=True)

# Cache data loading
@st.cache_data
def get_dashboard_data():
    raw_df = load_data()
    sevi_df = calculate_sevi(raw_df)
    full_df = detect_anomalies(sevi_df)
    return full_df

# Cache geojson loading
@st.cache_data
def get_geojson_data():
    geojson_path = os.path.join('data', 'india_states.geojson')
    if os.path.exists(geojson_path):
        with open(geojson_path, 'r') as f:
            return json.load(f)
    return None

# Cache model details
@st.cache_resource
def load_trained_models():
    model_path = os.path.join(MODEL_DIR, 'outage_forecasting_models.pkl')
    if os.path.exists(model_path):
        with open(model_path, 'rb') as f:
            return pickle.load(f)
    return None

# Function to draw custom metric card
def draw_custom_metric(label, value, subtext=""):
    st.markdown(f"""
    <div class="metric-card-container">
        <div class="metric-card-label">{label}</div>
        <div class="metric-card-value">{value}</div>
        {"<div class='metric-card-subtext'>" + subtext + "</div>" if subtext else ""}
    </div>
    """, unsafe_allow_html=True)

# Load dataset and GeoJSON
try:
    df = get_dashboard_data()
    geojson_data = get_geojson_data()
    states = sorted(df['State'].unique())
    regions = df['Region'].unique()
except Exception as e:
    st.error(f"Error loading dataset: {e}")
    st.info("Please run `python data/generate_synthetic_data.py` to generate the raw dataset first.")
    st.stop()

# Sidebar Navigation
with st.sidebar:
    st.markdown("### ⚡ India Power Intelligence")
    st.markdown("An AI-powered data analytics agent and forecasting platform for national power outages and energy deficits.")
    
    st.write("---")
    
    app_mode = st.sidebar.radio(
        "Navigate",
        ["📊 Deficit & Outage Dashboard", "🔮 Predictive Forecasting", "🤖 AI Analytics Agent"]
    )
    
    st.write("---")
    
    st.markdown("### 🔑 API Authentication")
    gemini_key = st.text_input("Enter Gemini API Key", type="password", help="Required for the AI Analytics Agent tab")
    if gemini_key:
        os.environ["GEMINI_API_KEY"] = gemini_key
        st.success("API key registered!")
    else:
        st.info("API key is required only for chatbot functionality. You can still use dashboard and forecasting.")
        
    st.write("---")
    st.markdown("### 📘 SEVI Index Weights")
    st.caption("State Energy Vulnerability Index is computed using:")
    st.markdown(f"""
    - **Deficit % Weight**: `{SEVI_WEIGHTS['deficit_pct']:.1f}`
    - **Outage Freq Weight**: `{SEVI_WEIGHTS['frequency']:.1f}`
    - **Recovery Time Weight**: `{SEVI_WEIGHTS['recovery_time']:.1f}`
    """)
    st.caption("Higher SEVI score indicates greater vulnerability to grid instability and recovery delays.")

# Main Header
st.markdown("<div class='main-title'>India Power Outage Intelligence System</div>", unsafe_allow_html=True)
st.markdown("<div class='subtitle'>State-wise energy deficit analytics, predictive modeling, and intelligent AI reasoning</div>", unsafe_allow_html=True)

# ----------------- Tab 1: Dashboard -----------------
if app_mode == "📊 Deficit & Outage Dashboard":
    st.header("📊 National Power Grid Dashboard")
    
    # Filter Row
    col_f1, col_f2 = st.columns(2)
    with col_f1:
        selected_region = st.multiselect("Filter by Region", options=regions, default=list(regions))
    with col_f2:
        year_range = st.slider("Select Year Range", min_value=2015, max_value=2024, value=(2015, 2024))
        
    # Apply filters
    filtered_df = df[
        (df['Region'].isin(selected_region)) & 
        (df['Date'].dt.year >= year_range[0]) & 
        (df['Date'].dt.year <= year_range[1])
    ]
    
    if filtered_df.empty:
        st.warning("No data found for selected filters.")
    else:
        # Key Metrics Row
        total_req = filtered_df['Energy_Requirement_MU'].sum()
        total_supplied = filtered_df['Energy_Supplied_MU'].sum()
        national_deficit_pct = ((total_req - total_supplied) / total_req) * 100
        avg_outages = filtered_df['Outage_Frequency'].mean()
        avg_recovery = filtered_df['Average_Recovery_Time_Hours'].mean()
        
        # Max SEVI State
        latest_sevi_state = filtered_df[filtered_df['Date'] == filtered_df['Date'].max()].groupby('State')['SEVI'].mean().idxmax()
        latest_sevi_val = filtered_df[filtered_df['Date'] == filtered_df['Date'].max()].groupby('State')['SEVI'].mean().max()
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            draw_custom_metric("Total Energy Required", f"{total_req/1000:,.1f}k MU", "Cumulative demand")
        with col2:
            change_pct = ((filtered_df[filtered_df['Date'].dt.year == 2015]['Energy_Deficit_Percent'].mean() - filtered_df[filtered_df['Date'].dt.year == 2024]['Energy_Deficit_Percent'].mean()))
            draw_custom_metric("National Deficit %", f"{national_deficit_pct:.2f}%", f"-{change_pct:.2f}% improvement since 2015")
        with col3:
            draw_custom_metric("Avg Outages / Month", f"{avg_outages:.1f}", "Events per state")
        with col4:
            draw_custom_metric("Most Vulnerable State", f"{latest_sevi_state}", f"SEVI Score: {latest_sevi_val:.1f}/100")
            
        st.write("---")
        
        # Choropleth Map and Trend Line side-by-side
        col_p1, col_p2 = st.columns([1.1, 1.0])
        
        with col_p1:
            st.subheader("🗺️ India Grid Vulnerability Choropleth Map (SEVI)")
            if geojson_data is None:
                st.warning("GeoJSON map data not found in `data/india_states.geojson`. Map cannot be displayed.")
            else:
                # Group data state-wise for map
                map_df = filtered_df.groupby('State').agg({
                    'SEVI': 'mean',
                    'Energy_Deficit_Percent': 'mean',
                    'Outage_Frequency': 'mean',
                    'Average_Recovery_Time_Hours': 'mean'
                }).reset_index()
                
                # Render Choropleth
                fig_map = px.choropleth(
                    map_df,
                    geojson=geojson_data,
                    featureidkey='properties.ST_NM',
                    locations='State',
                    color='SEVI',
                    color_continuous_scale='Oranges',
                    range_color=[0, 100],
                    labels={'SEVI': 'Avg SEVI Score'},
                    hover_data=['Energy_Deficit_Percent', 'Outage_Frequency', 'Average_Recovery_Time_Hours']
                )
                
                # Format geolayout
                fig_map.update_geos(
                    fitbounds="locations",
                    visible=False,
                    bgcolor="rgba(0,0,0,0)"
                )
                
                fig_map.update_layout(
                    paper_bgcolor="#070c1e",
                    plot_bgcolor="#070c1e",
                    font_color="#ffffff",
                    margin=dict(l=0, r=0, t=10, b=0),
                    height=450
                )
                st.plotly_chart(fig_map, use_container_width=True)
            
        with col_p2:
            st.subheader("📈 State Energy Deficit Trend Over Time")
            # State-wise deficit timeline (resampled yearly or monthly)
            timeline_df = filtered_df.groupby(['Date', 'State'])['Energy_Deficit_Percent'].mean().reset_index()
            # Multi-line plot for top 6 states by average deficit to keep it clean
            top_states_by_def = filtered_df.groupby('State')['Energy_Deficit_Percent'].mean().nlargest(6).index.tolist()
            timeline_df_filtered = timeline_df[timeline_df['State'].isin(top_states_by_def)]
            
            fig_trend = px.line(
                timeline_df_filtered, 
                x='Date', 
                y='Energy_Deficit_Percent', 
                color='State',
                labels={'Energy_Deficit_Percent': 'Deficit %', 'Date': 'Timeline'},
                color_discrete_sequence=px.colors.sequential.Oranges_r
            )
            fig_trend.update_layout(
                paper_bgcolor="#070c1e",
                plot_bgcolor="#070c1e",
                font_color="#ffffff",
                hovermode="x unified",
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
                margin=dict(l=0, r=0, t=10, b=0),
                height=450
            )
            fig_trend.update_xaxes(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
            fig_trend.update_yaxes(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
            st.plotly_chart(fig_trend, use_container_width=True)
            
        st.write("---")
        
        # Row 2: SEVI Bar Chart and Regional Outages
        col_p3, col_p4 = st.columns([1.0, 1.0])
        
        with col_p3:
            st.subheader("🛡️ State-wise Average Energy Vulnerability Index (SEVI)")
            state_summary = get_state_summary(filtered_df).sort_values(by='Avg_SEVI', ascending=False)
            
            fig_sevi = px.bar(
                state_summary,
                x='State',
                y='Avg_SEVI',
                color='Avg_SEVI',
                color_continuous_scale='Oranges',
                labels={'Avg_SEVI': 'SEVI Score'},
                text_auto='.1f'
            )
            fig_sevi.update_layout(
                paper_bgcolor="#070c1e",
                plot_bgcolor="#070c1e",
                font_color="#ffffff",
                coloraxis_showscale=False,
                margin=dict(l=0, r=0, t=10, b=0),
                height=380
            )
            fig_sevi.update_xaxes(showgrid=False)
            fig_sevi.update_yaxes(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
            st.plotly_chart(fig_sevi, use_container_width=True)
            
        with col_p4:
            st.subheader("🗺️ Regional Outage Frequency & Recovery Profile")
            reg_summary = filtered_df.groupby('Region').agg({
                'Outage_Frequency': 'mean',
                'Average_Recovery_Time_Hours': 'mean'
            }).reset_index()
            
            fig_bar = go.Figure()
            fig_bar.add_trace(go.Bar(
                x=reg_summary['Region'],
                y=reg_summary['Outage_Frequency'],
                name='Avg Outages (events)',
                marker_color='#FF7A00'
            ))
            fig_bar.add_trace(go.Bar(
                x=reg_summary['Region'],
                y=reg_summary['Average_Recovery_Time_Hours'],
                name='Avg Recovery Time (Hrs)',
                marker_color='#FFA800'
            ))
            fig_bar.update_layout(
                barmode='group',
                paper_bgcolor="#070c1e",
                plot_bgcolor="#070c1e",
                font_color="#ffffff",
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
                margin=dict(l=0, r=0, t=10, b=0),
                height=380
            )
            fig_bar.update_yaxes(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
            st.plotly_chart(fig_bar, use_container_width=True)
            
        st.write("---")
        
        # Row 3: Seasonal Patterns
        st.subheader("📆 Seasonal Patterns & Outage Peaks")
        filtered_df['Month_Name'] = filtered_df['Date'].dt.strftime('%B')
        filtered_df['Month_Num'] = filtered_df['Date'].dt.month
        seasonal_df = filtered_df.groupby(['Month_Num', 'Month_Name']).agg({
            'Energy_Deficit_Percent': 'mean',
            'Outage_Frequency': 'mean'
        }).reset_index().sort_values(by='Month_Num')
        
        fig_season = go.Figure()
        fig_season.add_trace(go.Scatter(
            x=seasonal_df['Month_Name'],
            y=seasonal_df['Energy_Deficit_Percent'],
            name='Energy Deficit %',
            yaxis='y1',
            line=dict(color='#ff3c00', width=3)
        ))
        fig_season.add_trace(go.Bar(
            x=seasonal_df['Month_Name'],
            y=seasonal_df['Outage_Frequency'],
            name='Avg Outages (Count)',
            yaxis='y2',
            marker_color='rgba(255, 122, 0, 0.4)'
        ))
        
        fig_season.update_layout(
            paper_bgcolor="#070c1e",
            plot_bgcolor="#070c1e",
            font_color="#ffffff",
            yaxis=dict(title="Energy Deficit %", color="#ff3c00", showgrid=True, gridcolor="rgba(255,255,255,0.05)"),
            yaxis2=dict(title="Outages Count", color="#ff7a00", overlaying='y', side='right', showgrid=False),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            margin=dict(l=0, r=0, t=10, b=0),
            height=380
        )
        st.plotly_chart(fig_season, use_container_width=True)
        
        # Row 4: Anomalies
        st.subheader("🚨 Grid Anomaly Log")
        st.write("Anomalies are detected using a Z-score threshold (> 2.5) relative to each state's own historical average.")
        anomalies_df = filtered_df[filtered_df['Is_Anomaly'] == True].sort_values(by='Date', ascending=False)
        
        if anomalies_df.empty:
            st.success("No grid anomalies detected for the selected period!")
        else:
            display_cols = ['Date', 'State', 'Region', 'Energy_Deficit_Percent', 'Outage_Frequency', 'Average_Recovery_Time_Hours', 'Deficit_Anomaly', 'Outage_Anomaly']
            st.dataframe(
                anomalies_df[display_cols].style.format({
                    'Date': lambda x: x.strftime('%Y-%m-%d'),
                    'Energy_Deficit_Percent': '{:.2f}%',
                    'Average_Recovery_Time_Hours': '{:.2f} hrs'
                }),
                use_container_width=True
            )

# ----------------- Tab 2: Forecasting -----------------
elif app_mode == "🔮 Predictive Forecasting":
    st.header("🔮 Energy Deficit Forecasting Model")
    st.markdown(
        "This section evaluates and utilizes machine learning models to forecast next month's energy deficit % "
        "using historical features (lags, rolling averages, state encoders)."
    )
    
    # Load model binaries
    model_data = load_trained_models()
    
    if not model_data:
        st.error("Model binaries not found! Please run the training script: `python -m src.modeling` in the terminal.")
    else:
        # Comparison Metrics
        st.subheader("⚖️ Model Comparison: Linear Regression vs. Random Forest")
        
        col_m1, col_m2 = st.columns(2)
        metrics = model_data['metrics']
        
        # Create a df for plotting metrics
        metrics_df = pd.DataFrame({
            'Model': ['Linear Regression', 'Random Forest'],
            'MAE': [metrics['lr']['mae'], metrics['rf']['mae']],
            'RMSE': [metrics['lr']['rmse'], metrics['rf']['rmse']],
            'R2 Score': [metrics['lr']['r2'], metrics['rf']['r2']]
        })
        
        with col_m1:
            st.write("#### Performance Metrics comparison (Test Set 2024)")
            st.dataframe(
                metrics_df.style.highlight_max(subset=['R2 Score'], color='rgba(255,122,0,0.25)').highlight_min(subset=['MAE', 'RMSE'], color='rgba(255,122,0,0.25)'),
                use_container_width=True
            )
            st.markdown(
                "**Insight**: The **Random Forest Regressor** significantly outperforms Linear Regression, "
                "capturing non-linear seasonal interactions and state-wise baseline variance."
            )
            
        with col_m2:
            fig_compare = px.bar(
                metrics_df,
                x='Model',
                y='R2 Score',
                color='Model',
                color_discrete_sequence=['#FF7A00', '#FFA800']
            )
            fig_compare.update_layout(
                yaxis_range=[0, 1],
                paper_bgcolor="#070c1e",
                plot_bgcolor="#070c1e",
                font_color="#ffffff",
                margin=dict(l=0, r=0, t=10, b=0),
                height=300
            )
            fig_compare.update_yaxes(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
            fig_compare.update_xaxes(showgrid=False)
            st.plotly_chart(fig_compare, use_container_width=True)
            
        st.write("---")
        
        # Inference Section
        st.subheader("🔮 Predict Next Month Outage Risk")
        col_inf1, col_inf2 = st.columns([1, 2])
        
        with col_inf1:
            selected_state = st.selectbox("Select State for Forecasting", options=states)
            forecast_date = st.date_input("Target Forecast Month", value=datetime(2025, 1, 1))
            forecast_date_str = forecast_date.strftime('%Y-%m-%d')
            
            run_pred = st.button("Generate Forecast", type="primary")
            
        with col_inf2:
            if run_pred:
                with st.spinner("Generating forecasts..."):
                    try:
                        prediction = predict_next_month(selected_state, forecast_date_str)
                        
                        st.success(f"Forecast successfully generated for **{selected_state}** on **{forecast_date.strftime('%B %Y')}**!")
                        
                        col_r1, col_r2 = st.columns(2)
                        with col_r1:
                            draw_custom_metric("Predicted Deficit % (RF)", f"{prediction['predicted_deficit_percent_rf']:.2f}%", "Random Forest Regressor (Recommended)")
                        with col_r2:
                            draw_custom_metric("Predicted Deficit % (LR)", f"{prediction['predicted_deficit_percent_lr']:.2f}%", "Linear Regression")
                            
                        # Show context: previous 3 months
                        st.markdown("##### Historical Lags Context (Previous 3 Months)")
                        lags = prediction['lags']
                        st.markdown(f"- Lag 1 (Previous Month): `{lags[2]:.2f}%`  \n- Lag 2 (2 Months Ago): `{lags[1]:.2f}%`  \n- Lag 3 (3 Months Ago): `{lags[0]:.2f}%` ")
                        
                    except Exception as e:
                        st.error(f"Prediction failed: {e}")

# ----------------- Tab 3: AI Agent -----------------
elif app_mode == "🤖 AI Analytics Agent":
    st.header("🤖 LangChain AI Analytics Agent")
    st.markdown(
        "Ask our Google Gemini-powered AI agent natural language questions about India's power outages, "
        "deficit rankings, seasonal trends, and SEVI vulnerability metrics."
    )
    
    # Check for API Key
    if "GEMINI_API_KEY" not in os.environ or not os.environ["GEMINI_API_KEY"]:
        st.warning("⚠️ Google Gemini API Key is missing. Please enter it in the sidebar to enable the AI agent.")
        st.info(
            "To get a Gemini API key, go to the Google AI Studio console. Once entered in the sidebar, "
            "you can query this dataset using natural language."
        )
    else:
        # Create agent
        agent_executor = create_power_intelligence_agent()
        
        if agent_executor is None:
            st.error("Failed to initialize Gemini Agent. Please check if your API Key is valid.")
        else:
            st.success("🤖 AI Agent is online and connected to the power outage dataset!")
            
            # Sample Query Shortcuts
            st.markdown("##### 💡 Try asking:")
            shortcut_col1, shortcut_col2, shortcut_col3 = st.columns(3)
            
            # Setup session state for chat history
            if "messages" not in st.session_state:
                st.session_state.messages = []
                
            # Input query
            query = st.chat_input("Ask a question about the power outage dataset...")
            
            with shortcut_col1:
                if st.button("Which state has highest outage risk next month?"):
                    query = "Which state has highest outage risk next month?"
            with shortcut_col2:
                if st.button("What is the peak demand season for Maharashtra?"):
                    query = "What is the peak demand season for Maharashtra?"
            with shortcut_col3:
                if st.button("Compare the SEVI of Bihar and Gujarat"):
                    query = "Compare the SEVI of Bihar and Gujarat"
            
            # Display Chat History
            for message in st.session_state.messages:
                with st.chat_message(message["role"]):
                    st.markdown(message["content"])
                    
            # Process current query
            if query:
                # Add human message to log
                st.session_state.messages.append({"role": "human", "content": query})
                with st.chat_message("human"):
                    st.markdown(query)
                    
                # Run Agent Executor
                with st.chat_message("assistant"):
                    with st.spinner("Analyzing dataset and generating insights..."):
                        try:
                            # LangChain Agent Executor run
                            # Prepare chat history for LangChain
                            chat_history = []
                            for msg in st.session_state.messages[:-1]:
                                if msg["role"] == "human":
                                    chat_history.append(("human", msg["content"]))
                                else:
                                    chat_history.append(("ai", msg["content"]))
                                    
                            result = agent_executor.invoke({
                                "input": query,
                                "chat_history": chat_history
                            })
                            
                            response = result["output"]
                            st.markdown(response)
                            
                            # Add assistant message to log
                            st.session_state.messages.append({"role": "assistant", "content": response})
                            
                        except Exception as e:
                            st.error(f"Agent error: {e}")
                            st.info("Ensure the models are trained and raw data is present.")
