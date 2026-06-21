import os
import pandas as pd
import numpy as np
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from data_generator import get_or_create_dataset
from models import run_forecast_prediction

# Helper function to get processed data
def get_dataset_for_agent():
    try:
        return get_or_create_dataset()
    except Exception as e:
        print(f"Error loading dataset in agent: {e}")
        return None

# --- Define Agent Tools ---

@tool
def get_state_metrics_tool(state: str) -> str:
    """
    Returns historical average metrics for a specific state in India,
    including average requirements, supply, deficit %, outages, recovery times, and custom SEVI score.
    """
    df = get_dataset_for_agent()
    if df is None:
        return "Error: Could not load the dataset."
        
    state_df = df[df['State'].str.lower() == state.lower()]
    if state_df.empty:
        valid_states = ", ".join(df['State'].unique())
        return f"State '{state}' not found. Valid states are: {valid_states}"
        
    avg_req = state_df['Energy_Requirement_MU'].mean()
    avg_def_pct = state_df['Energy_Deficit_Percent'].mean()
    avg_outages = state_df['Outage_Frequency'].mean()
    avg_rec = state_df['Average_Recovery_Time_Hours'].mean()
    avg_sevi = state_df['SEVI'].mean()
    
    latest_row = state_df.sort_values(by='Date').iloc[-1]
    
    response = (
        f"--- Historical Averages for {state} ---\n"
        f"- Avg Monthly Energy Requirement: {avg_req:.2f} MU\n"
        f"- Avg Monthly Energy Deficit: {avg_def_pct:.2f}%\n"
        f"- Avg Monthly Outage Frequency: {avg_outages:.1f} events\n"
        f"- Avg Power Recovery Time: {avg_rec:.2f} hours\n"
        f"- State Energy Vulnerability Index (SEVI): {avg_sevi:.2f}/100\n\n"
        f"--- Latest Month Data ({latest_row['Date']}) ---\n"
        f"- Requirement: {latest_row['Energy_Requirement_MU']:.2f} MU\n"
        f"- Deficit: {latest_row['Energy_Deficit_Percent']:.2f}%\n"
        f"- Outages: {latest_row['Outage_Frequency']} events\n"
        f"- Recovery Time: {latest_row['Average_Recovery_Time_Hours']:.2f} hours\n"
        f"- SEVI: {latest_row['SEVI']:.2f}/100"
    )
    return response

@tool
def get_outage_risk_forecast_tool() -> str:
    """
    Forecasts the energy deficit percentage for next month (Jan 2025) for all states,
    ranking them by predicted deficit % and outage risk.
    """
    df = get_dataset_for_agent()
    if df is None:
        return "Error: Could not load the dataset."
        
    states = df['State'].unique()
    predictions = []
    
    # Predict for Jan 2025
    target_date = "2025-01-01"
    for state in states:
        try:
            pred_res = run_forecast_prediction(state, target_date, df)
            state_data = df[df['State'] == state].sort_values(by='Date')
            latest_sevi = state_data['SEVI'].iloc[-1]
            
            predictions.append({
                'State': state,
                'Predicted_Deficit_Percent': pred_res['Predicted_Deficit_Percent_RF'],
                'Latest_SEVI': latest_sevi
            })
        except Exception as e:
            print(f"Prediction failed for {state}: {e}")
            
    if not predictions:
        return "Error: Modeling predictions failed. Make sure models are trained."
        
    pred_df = pd.DataFrame(predictions).sort_values(by='Predicted_Deficit_Percent', ascending=False)
    
    response = f"--- Predicted Energy Deficit & Outage Risk for Jan 2025 ---\n"
    for idx, row in enumerate(pred_df.itertuples(), 1):
        response += f"{idx}. {row.State}: Predicted Deficit {row.Predicted_Deficit_Percent:.2f}% (Latest SEVI: {row.Latest_SEVI:.2f}/100)\n"
        
    response += "\n*Note: High predicted deficit percent indicates higher likelihood of outages next month.*"
    return response

@tool
def get_peak_demand_season_tool(state: str) -> str:
    """
    Analyzes historical monthly averages for a state to identify its peak demand and highest outage season.
    """
    df = get_dataset_for_agent()
    if df is None:
        return "Error: Could not load the dataset."
        
    state_df = df[df['State'].str.lower() == state.lower()].copy()
    if state_df.empty:
        return f"State '{state}' not found."
        
    state_df['Month_Num'] = pd.to_datetime(state_df['Date']).dt.month
    monthly_stats = state_df.groupby('Month_Num').agg(
        Avg_Req=('Energy_Requirement_MU', 'mean'),
        Avg_Def_Pct=('Energy_Deficit_Percent', 'mean'),
        Avg_Outages=('Outage_Frequency', 'mean')
    ).reset_index()
    
    # Month name mapping
    month_names = {1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June', 
                   7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'}
    monthly_stats['Month'] = monthly_stats['Month_Num'].map(month_names)
    
    # Sort by Avg Requirements
    peak_req = monthly_stats.sort_values(by='Avg_Req', ascending=False).head(3)
    # Sort by Outages
    peak_outages = monthly_stats.sort_values(by='Avg_Outages', ascending=False).head(3)
    
    response = f"--- Seasonal Power Demand Analysis for {state} ---\n"
    response += "Peak Demand Months (by average requirement):\n"
    for row in peak_req.itertuples():
        response += f"- {row.Month}: {row.Avg_Req:.2f} MU (Avg Deficit: {row.Avg_Def_Pct:.2f}%)\n"
        
    response += "\nWorst Months for Outages:\n"
    for row in peak_outages.itertuples():
        response += f"- {row.Month}: {row.Avg_Outages:.1f} outage events (Avg Deficit: {row.Avg_Def_Pct:.2f}%)\n"
        
    return response

@tool
def get_grid_anomalies_tool() -> str:
    """
    Scans the historical records for power outages or deficit anomalies in Indian states
    and returns a summary of the most extreme events.
    """
    df = get_dataset_for_agent()
    if df is None:
        return "Error: Could not load the dataset."
        
    anomalies = df[df['Is_Anomaly'] == True].sort_values(by='Date', ascending=False)
    if anomalies.empty:
        return "No significant power supply anomalies detected in the dataset."
        
    response = f"--- Detected Anomalies Summary (Showing top 10 most recent) ---\n"
    for row in anomalies.head(10).itertuples():
        reasons = []
        if row.Deficit_Anomaly:
            reasons.append(f"Spike in Deficit ({row.Energy_Deficit_Percent}%)")
        if row.Outage_Anomaly:
            reasons.append(f"Spike in Outages ({row.Outage_Frequency} events)")
            
        response += f"- Date: {row.Date} | State: {row.State} | Anomaly: {', '.join(reasons)} | Recovery: {row.Average_Recovery_Time_Hours} hours\n"
        
    return response

# Pack tools
TOOLS = [get_state_metrics_tool, get_outage_risk_forecast_tool, get_peak_demand_season_tool, get_grid_anomalies_tool]

# --- Custom Agent Loop Executor ---
class CustomAgentExecutor:
    def __init__(self, llm, tools):
        self.llm = llm.bind_tools(tools)
        self.tools = tools
        self.system_prompt = (
            "You are the 'India Power Outage Intelligence System' AI Agent. "
            "Your role is to assist users in understanding power deficits, outages, recovery times, "
            "and the State Energy Vulnerability Index (SEVI) across India's states. "
            "Use the provided tools to fetch precise facts. Do not make up any numbers. "
            "Be concise, professional, and structure your responses using markdown. "
            "Do NOT include or name the internal tool names (like get_state_metrics_tool) in your responses. "
            "If the user greets you (e.g. 'hi', 'hello', 'hii'), respond with a smart, welcoming greeting "
            "and briefly introduce yourself and how you can help them (e.g. state summaries, forecast risks, season analysis, anomaly scans)."
        )

    def invoke(self, user_input: str, chat_history: list = None, image_data: str = None) -> str:
        chat_history = chat_history or []
        
        # Build messages list
        messages = [
            ("system", self.system_prompt)
        ]
        
        for msg in chat_history:
            if isinstance(msg, (list, tuple)) and len(msg) == 2:
                messages.append((msg[0], msg[1]))
            
        # Build user message with optional base64 image data (multimodal input)
        if image_data:
            # Handle standard format: data:image/png;base64,.....
            if not image_data.startswith("data:image"):
                # Default MIME type if raw base64 is sent
                mime = "image/png"
                if "jpeg" in image_data or "jpg" in image_data:
                    mime = "image/jpeg"
                base64_str = image_data.split(",")[-1]
                image_url = f"data:{mime};base64,{base64_str}"
            else:
                image_url = image_data

            user_content = [
                {"type": "text", "text": user_input},
                {
                    "type": "image_url",
                    "image_url": {"url": image_url}
                }
            ]
            messages.append(HumanMessage(content=user_content))
        else:
            messages.append(HumanMessage(content=user_input))
        
        # Run agent loop (up to 5 iterations)
        for _ in range(5):
            try:
                response = self.llm.invoke(messages)
            except Exception as e:
                err_msg = str(e)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    return (
                        "**Google Gemini API Quota Exceeded (429 Rate Limit)**:\n\n"
                        "You have exceeded your per-minute or daily API request limit for the free tier of the Gemini API. "
                        "Please wait about 60 seconds and try your request again.\n\n"
                        "*Tip: If you require higher limits, you can link a billing account to your project in Google AI Studio.*"
                    )
                return f"Agent error during LLM invocation: {err_msg}"
                
            messages.append(response)
            
            # If no tool calls, return final response
            if not response.tool_calls:
                return response.content
                
            # Process tool calls
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                
                tool_fn = next((t for t in self.tools if t.name == tool_name), None)
                if tool_fn:
                    try:
                        tool_result = tool_fn.invoke(tool_args)
                    except Exception as e:
                        tool_result = f"Error running tool: {e}"
                else:
                    tool_result = f"Tool '{tool_name}' not found."
                    
                # Append tool output
                messages.append(ToolMessage(
                    content=str(tool_result),
                    tool_call_id=tool_call["id"]
                ))
                
        return "Agent execution halted: too many tool call iterations."

def run_agent_query(user_query: str, chat_history: list = None, image_data: str = None) -> str:
    """Runs the natural language agent query against Gemini API."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return "Error: Google Gemini API Key is missing. Please configure GEMINI_API_KEY environment variable on the server."
        
    try:
        # Initialize Gemini Chat model (using gemini-2.5-flash-lite as it supports vision)
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            temperature=0.2,
            google_api_key=api_key
        )
        executor = CustomAgentExecutor(llm, TOOLS)
        return executor.invoke(user_query, chat_history, image_data)
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            return (
                "**Google Gemini API Quota Exceeded (429 Rate Limit)**:\n\n"
                "You have exceeded your per-minute or daily API request limit for the free tier of the Gemini API. "
                "Please wait about 60 seconds and try your request again.\n\n"
                "*Tip: If you require higher limits, you can link a billing account to your project in Google AI Studio.*"
            )
        return f"Failed to run agent query: {err_msg}"
