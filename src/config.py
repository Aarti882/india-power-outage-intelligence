import os

# Project Base Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
SRC_DIR = os.path.join(BASE_DIR, 'src')

# Dataset Path
RAW_DATA_PATH = os.path.join(DATA_DIR, 'state_wise_energy_deficit.csv')

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

# State Energy Vulnerability Index (SEVI) Weights
# Must sum to 1.0
SEVI_WEIGHTS = {
    'deficit_pct': 0.40,
    'frequency': 0.40,
    'recovery_time': 0.20
}

# LLM Configuration for LangChain Gemini Agent
GEMINI_MODEL_NAME = "gemini-1.5-flash"
AGENT_TEMPERATURE = 0.2
