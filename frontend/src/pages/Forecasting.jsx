import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';
import { LineChart, BarChart3, HelpCircle, Calendar, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';
import { API_BASE_URL } from '../config';

const Forecasting = ({ data, seviData, loading: dataLoading }) => {
  const [selectedState, setSelectedState] = useState("Uttar Pradesh");
  const [targetDate, setTargetDate] = useState("2025-01-01");
  const [metrics, setMetrics] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState("");

  // Get unique states list
  const statesList = useMemo(() => {
    if (!seviData) return [];
    return seviData.map(s => s.State).sort();
  }, [seviData]);

  // Fetch general model metrics
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/forecast`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch model metrics");
        return res.json();
      })
      .then(data => {
        setMetrics(data);
        setLoadingMetrics(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingMetrics(false);
      });
  }, []);

  // Fetch prediction on state or date change
  const fetchPrediction = () => {
    setLoadingPrediction(true);
    setPredictionError("");
    fetch(`${API_BASE_URL}/api/forecast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        State: selectedState,
        TargetDate: targetDate
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Inference failed on the server.");
        return res.json();
      })
      .then(data => {
        setPrediction(data);
        setLoadingPrediction(false);
      })
      .catch(err => {
        setPredictionError(err.message || "Failed to generate prediction.");
        setLoadingPrediction(false);
      });
  };

  useEffect(() => {
    if (selectedState && targetDate) {
      fetchPrediction();
    }
  }, [selectedState, targetDate]);

  // Format prediction and lags data for comparison chart
  const chartData = useMemo(() => {
    if (!prediction) return [];
    
    // prediction.Lags is [Lag_3, Lag_2, Lag_1]
    const lags = prediction.Lags || [0, 0, 0];
    
    return [
      { name: "3 Months Ago", type: "Historical", value: parseFloat(lags[0].toFixed(2)) },
      { name: "2 Months Ago", type: "Historical", value: parseFloat(lags[1].toFixed(2)) },
      { name: "Last Month", type: "Historical", value: parseFloat(lags[2].toFixed(2)) },
      { name: "Predicted (LR)", type: "Linear Regression", value: parseFloat(prediction.Predicted_Deficit_Percent_LR.toFixed(2)) },
      { name: "Predicted (RF)", type: "Random Forest", value: parseFloat(prediction.Predicted_Deficit_Percent_RF.toFixed(2)) }
    ];
  }, [prediction]);

  if (dataLoading) {
    return (
      <div className="space-y-8 pb-12 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/30 pb-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-7 bg-navy-750/70 rounded-lg w-64"></div>
            <div className="h-4 bg-navy-700/60 rounded-full w-96"></div>
          </div>
        </div>

        {/* Model Metrics Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard type="metric" className="h-40" />
          <SkeletonCard type="metric" className="h-40" />
          <SkeletonCard type="metric" className="h-40" />
        </div>

        {/* Inference Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard type="default" className="h-[400px]" />
          <SkeletonCard type="chart" className="lg:col-span-2 h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/30 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            AI Demand & Shortfall Forecasting
          </h2>
          <p className="text-slate-400 mt-1.5 text-sm">
            Temporal auto-regressive model comparison predicting state-level deficit ratios.
          </p>
        </div>
      </div>

      {/* Grid: Model Comparison Metrics (Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Model Efficacy Callout */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-orange-500/10 rounded-full blur-xl"></div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <h3 className="text-base font-bold text-white">Model Efficacy Report</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Comparing test set predictions for 2024. Random Forest handles non-linear peaks (summer cooling load) far better than Linear Regression.
            </p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 p-3.5 rounded-xl flex gap-3 text-[11px] text-orange-200">
            <TrendingUp className="h-4 w-4 shrink-0 mt-0.5 text-orange-500 animate-bounce" />
            <span>
              <strong>Random Forest</strong> achieved an R² ≈ 81.8% compared to Linear Regression's negative R². We recommend RF predictions.
            </span>
          </div>
        </div>

        {/* Linear Regression Metrics Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Linear Regression Metrics
            </h3>
            {loadingMetrics ? (
              <div className="h-20 animate-shimmer rounded-xl"></div>
            ) : metrics ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-700/30">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">MAE</p>
                  <p className="text-lg font-bold text-white mt-1">{metrics.lr.mae.toFixed(3)}</p>
                </div>
                <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-700/30">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">RMSE</p>
                  <p className="text-lg font-bold text-white mt-1">{metrics.lr.rmse.toFixed(3)}</p>
                </div>
                <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-700/30">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">R²</p>
                  <p className="text-lg font-bold text-red-400 mt-1">{metrics.lr.r2.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Failed to load metrics.</p>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-4 leading-normal">
            Feature Space: 22 dimensions (Lags 1-3, rolling stats, month seasonal, state dummies)
          </p>
        </div>

        {/* Random Forest Metrics Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Random Forest Regressor Metrics
            </h3>
            {loadingMetrics ? (
              <div className="h-20 animate-shimmer rounded-xl"></div>
            ) : metrics ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-700/30">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">MAE</p>
                  <p className="text-lg font-bold text-white mt-1">{metrics.rf.mae.toFixed(3)}</p>
                </div>
                <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-700/30">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">RMSE</p>
                  <p className="text-lg font-bold text-white mt-1">{metrics.rf.rmse.toFixed(3)}</p>
                </div>
                <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-700/30">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">R²</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">+{metrics.rf.r2.toFixed(3)}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Failed to load metrics.</p>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-4 leading-normal">
            Hyperparameters: n_estimators=100, bootstrapping=true, random_state=42
          </p>
        </div>

      </div>

      {/* Main Prediction Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Controller selectors */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-white">Inference Engine</h3>
          <p className="text-xs text-slate-400">
            Generate next-month deficit forecasts by running model inference on the latest lag features.
          </p>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Select Target State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-navy-900 border border-navy-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/60 font-semibold"
              >
                {statesList.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Target Month</label>
              <div className="bg-navy-900/60 border border-navy-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <span>January 2025 (Next Month)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-navy-700/40 space-y-3.5 text-xs">
            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider">Features fed to model:</h4>
            <ul className="space-y-2 text-slate-400 text-[11px] list-disc list-inside">
              <li>Deficit % Lag 1 (Previous Month)</li>
              <li>Deficit % Lag 2 (2 Months Prior)</li>
              <li>Deficit % Lag 3 (3 Months Prior)</li>
              <li>Deficit 3-Month Rolling Average</li>
              <li>Deficit 3-Month Rolling Standard Dev</li>
              <li>Seasonal Month Flag (January)</li>
              <li>One-hot state coefficient</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Prediction Visual Comparison */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">
              Deficit Forecast Chart — {selectedState}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Side-by-side comparison of 3-month historical lags and the predicted values (%) for Jan 2025.
            </p>
          </div>

          <div className="flex-1 min-h-[300px]">
            {loadingPrediction ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-400 italic">Running model predictions...</p>
              </div>
            ) : predictionError ? (
              <div className="flex items-center gap-2 text-red-400 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{predictionError}</span>
              </div>
            ) : prediction ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#0a1128', 
                      borderColor: 'rgba(255,122,0,0.3)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => {
                      let color = "#ffaa66"; // Lags (Historical)
                      if (entry.type === "Linear Regression") color = "#3b82f6"; // Blue
                      if (entry.type === "Random Forest") color = "#ff7a00"; // Orange
                      return (
                        <Cell key={`cell-${index}`} fill={color} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-[10px] font-bold text-slate-400 uppercase">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-[#ffaa66]"></span>
              <span>Historical Lags</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-[#3b82f6]"></span>
              <span>Linear Regression Pred</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-[#ff7a00]"></span>
              <span>Random Forest Pred (Recommended)</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Forecasting;
