# India Power Outage Intelligence System ⚡

A production-grade, full-stack AI-powered data analytics and predictive forecasting system designed to study state-wise energy deficit patterns, detect grid anomalies, predict future outages, and answer natural language queries using Google Gemini API and LangChain.

This project features a decoupled architecture with a **Python FastAPI backend** and a **React SPA frontend** styled with **Tailwind CSS** and animated with **Framer Motion**.

---

## 🌟 Key Features

1. **Interactive Analytics Dashboard**:
   - Visualizes multi-year energy deficits and demand trends (2015–2024).
   - Tracks seasonal peaks and outage distributions across India's grid regions.
   - Built with **React + Recharts** for fluid, responsive charts.

2. **Interactive India Choropleth Map**:
   - Renders state boundary boundaries using `react-simple-maps` and SVG mercator projections.
   - Highlights state-by-state index metrics (SEVI, Deficit %, Outages) dynamically.

3. **State Energy Vulnerability Index (SEVI)**:
   - A custom composite index score reflecting state-level grid vulnerability.
   - Evaluates:
     $$\text{SEVI} = 0.40 \times \text{Norm}(\text{Deficit \%}) + 0.35 \times \text{Norm}(\text{Outage Frequency}) + 0.25 \times \text{Norm}(\text{Recovery Time})$$
   - Normalized from 0 (resilient) to 100 (vulnerable).

4. **Z-Score Anomaly Detection**:
   - Scans grid history to locate anomalies in energy deficit and outage spikes relative to each state's historical standard deviation.

5. **AI Analytics Chat Agent**:
   - Uses LangChain and Google Gemini API to implement a tool-calling reasoning agent.
   - Answers questions like *"Which state has the highest outage risk next month?"* or *"What is Maharashtra's peak demand season?"* with precise footnotes on tools used.

---

## 📂 Project Structure

```text
India power outage/
├── backend/
│   ├── main.py              # FastAPI main entry point and routes
│   ├── data_generator.py    # Generates 10-year monthly synthetic data
│   ├── models.py            # Pydantic schemas, ML train & inference pipeline
│   ├── agent.py             # Custom LangChain agent loop and tools
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── public/
│   │   └── india_states.geojson # Vector map boundaries
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Side-navigation links & badges
│   │   │   ├── MetricCards.jsx   # Counting aggregate layout cards
│   │   │   └── CustomGauge.jsx   # SVG semicircle SEVI gauge
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Overview trends & gauges
│   │   │   ├── Analytics.jsx     # Correlation scatter & heatmaps
│   │   │   ├── IndiaMap.jsx      # Vector choropleth map
│   │   │   ├── Forecasting.jsx   # ML forecast predictions side-by-side
│   │   │   └── AIAgent.jsx       # Conversational chat interface
│   │   ├── App.jsx               # Navigation router and API fetches
│   │   ├── main.jsx              # React mounting file
│   │   └── index.css             # Tailwind rules & glassmorphic panels
│   ├── package.json         # Node dependency file
│   ├── vite.config.js       # Vite configuration with proxy to port 8000
│   ├── tailwind.config.js   # Custom dark navy and orange theme colors
│   └── postcss.config.js    # PostCSS configs
├── data/                    # Raw generated dataset backup files
├── models/                  # Serialized .pkl ML binary output
├── scratch/                 # Integration and endpoint test runners
└── README.md                # Documentation
```

---

## ⚙️ REST API Endpoints (FastAPI)

- `GET /api/data`: Returns full synthetic dataset records.
- `GET /api/sevi`: Returns State Energy Vulnerability Index summaries per state.
- `GET /api/anomalies`: Returns all detected anomaly records.
- `GET /api/forecast`: Returns Random Forest vs Linear Regression evaluation metrics.
- `POST /api/forecast`: Accepts `{"State": "StateName", "TargetDate": "YYYY-MM-DD"}` and returns model predictions and historical lags.
- `POST /api/agent`: Accepts human queries and chat history, routing them to the Gemini agent.

---

## 📈 Model Performance

| Metric | Linear Regression | Random Forest Regressor (Recommended) |
| :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | 1.097 | **0.332** |
| **Root Mean Squared Error (RMSE)** | 1.286 | **0.439** |
| **R² Score** | -55.9% | **+81.8%** |

*The Random Forest model excels at predicting complex monthly seasonal spikes and state-level baseline differences.*

---

## 🚀 Installation & Running

### Prerequisites
- Python 3.9+
- Node.js 16+
- Google Gemini API Key (Optional, needed for chat tab)

### 1. Setup Backend
1. Open a terminal and navigate to the project folder.
2. Initialize your virtual environment and install backend requirements:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Train models and generate backup CSV dataset:
   ```bash
   python -c "from backend.models import train_and_save_models; from backend.data_generator import get_or_create_dataset; train_and_save_models(get_or_create_dataset())"
   ```
4. Set your API Key and run the FastAPI server:
   ```bash
   # Windows (CMD)
   set GEMINI_API_KEY=your_gemini_api_key_here
   uvicorn backend.main:app --port 8000 --reload
   
   # Windows (PowerShell)
   $env:GEMINI_API_KEY="your_gemini_api_key_here"
   uvicorn backend.main:app --port 8000 --reload
   ```

### 2. Setup Frontend
1. Open a new terminal in the `frontend` folder.
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the React dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your web browser.
