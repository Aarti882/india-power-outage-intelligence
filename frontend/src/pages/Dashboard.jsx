import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { AlertCircle, Calendar, MapPin, Zap, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import MetricCards from '../components/MetricCards';
import CustomGauge from '../components/CustomGauge';
import SkeletonCard from '../components/SkeletonCard';

const Dashboard = ({ data, seviData, loading }) => {
  const [selectedState, setSelectedState] = useState("Uttar Pradesh");
  const [time, setTime] = useState(new Date());
  const [anomalies, setAnomalies] = useState([]);
  const [showAlert, setShowAlert] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const res = await fetch('/api/anomalies');
        if (res.ok) {
          const data = await res.json();
          setAnomalies(data);
        }
      } catch (err) {
        console.error("Error fetching anomalies:", err);
      }
    };
    fetchAnomalies();
  }, []);

  // Calculate metrics for dashboard display and report export
  const metrics = useMemo(() => {
    if (!data || !seviData || data.length === 0 || seviData.length === 0) {
      return {
        totalEnergySupplied: 0,
        nationalDeficitPct: 0,
        avgOutages: 0,
        highestSeviState: "N/A",
        maxSevi: 0
      };
    }
    const totalEnergySupplied = data.reduce((acc, row) => acc + row.Energy_Supplied_MU, 0);
    const totalReq = data.reduce((acc, row) => acc + row.Energy_Requirement_MU, 0);
    const totalDef = data.reduce((acc, row) => acc + row.Energy_Deficit_MU, 0);
    const nationalDeficitPct = totalReq > 0 ? (totalDef / totalReq) * 100 : 0;
    const avgOutages = data.reduce((acc, row) => acc + row.Outage_Frequency, 0) / (data.length || 1);
    
    const sorted = [...seviData].sort((a, b) => b.Avg_SEVI - a.Avg_SEVI);
    const highestSeviState = sorted[0]?.State || "N/A";
    const maxSevi = sorted[0]?.Avg_SEVI || 0;

    return {
      totalEnergySupplied,
      nationalDeficitPct,
      avgOutages,
      highestSeviState,
      maxSevi
    };
  }, [data, seviData]);

  const highRiskStates = useMemo(() => {
    if (!seviData) return [];
    return seviData.filter(s => s.Avg_SEVI > 40).map(s => s.State);
  }, [seviData]);

  const exportPDFReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { totalEnergySupplied, nationalDeficitPct, avgOutages, highestSeviState, maxSevi } = metrics;
      
      const reportDiv = document.createElement('div');
      reportDiv.style.position = 'fixed';
      reportDiv.style.left = '-9999px';
      reportDiv.style.top = '-9999px';
      reportDiv.style.width = '800px';
      reportDiv.style.padding = '40px';
      reportDiv.style.backgroundColor = '#0a1128';
      reportDiv.style.color = '#f8fafc';
      reportDiv.style.fontFamily = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      
      reportDiv.innerHTML = `
        <div style="border-bottom: 2px solid rgba(255, 122, 0, 0.4); padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1px;">India Power Outage System</h1>
            <h2 style="color: #ff7a00; font-size: 16px; font-weight: 600; margin: 5px 0 0 0;">State Energy Vulnerability Report</h2>
          </div>
          <div style="text-align: right;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">Generated: ${new Date().toLocaleString()}</p>
            <p style="color: #64748b; font-size: 10px; margin: 3px 0 0 0;">Horizon: 2015 - 2024</p>
          </div>
        </div>
        
        <div style="margin-bottom: 35px;">
          <h3 style="color: #ffffff; font-size: 15px; font-weight: 700; margin: 0 0 15px 0; border-left: 4px solid #ff7a00; padding-left: 10px;">Grid Summary Metrics</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 12px;">
              <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px; tracking-wider">Total Energy Supplied</span>
              <span style="color: #ff7a00; font-size: 24px; font-weight: 800;">${totalEnergySupplied.toLocaleString(undefined, { maximumFractionDigits: 0 })} MU</span>
              <span style="color: #64748b; font-size: 9px; display: block; margin-top: 5px;">Cumulative demand met nationally</span>
            </div>
            <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 12px;">
              <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px; tracking-wider">National Deficit Ratio</span>
              <span style="color: #ef4444; font-size: 24px; font-weight: 800;">${nationalDeficitPct.toFixed(2)}%</span>
              <span style="color: #64748b; font-size: 9px; display: block; margin-top: 5px;">Average supply shortfall percentage</span>
            </div>
            <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 12px;">
              <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px; tracking-wider">Avg Monthly Outages</span>
              <span style="color: #ffaa66; font-size: 24px; font-weight: 800;">${avgOutages.toFixed(1)} events</span>
              <span style="color: #64748b; font-size: 9px; display: block; margin-top: 5px;">Average frequency of power cuts</span>
            </div>
            <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 12px;">
              <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px; tracking-wider">Most Vulnerable State</span>
              <span style="color: #f59e0b; font-size: 24px; font-weight: 800;">${highestSeviState}</span>
              <span style="color: #64748b; font-size: 9px; display: block; margin-top: 5px;">Peak risk: ${maxSevi.toFixed(1)} SEVI score</span>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 35px;">
          <h3 style="color: #ffffff; font-size: 15px; font-weight: 700; margin: 0 0 15px 0; border-left: 4px solid #ff7a00; padding-left: 10px;">State Energy Vulnerability Index (SEVI) Rankings</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; background-color: rgba(255, 255, 255, 0.01); border-radius: 8px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.04);">
            <thead>
              <tr style="background-color: rgba(255, 255, 255, 0.04); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                <th style="padding: 10px 15px; color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 9px; tracking-wider">State</th>
                <th style="padding: 10px 15px; color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 9px; tracking-wider; text-align: right;">Avg Deficit %</th>
                <th style="padding: 10px 15px; color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 9px; tracking-wider; text-align: right;">Avg Outages/mo</th>
                <th style="padding: 10px 15px; color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 9px; tracking-wider; text-align: right;">SEVI Score</th>
                <th style="padding: 10px 15px; color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 9px; tracking-wider; text-align: center;">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              ${seviData ? seviData.map((row, idx) => {
                const riskLevel = row.Avg_SEVI >= 50 ? 'HIGH' : (row.Avg_SEVI >= 30 ? 'MEDIUM' : 'LOW');
                const riskColor = row.Avg_SEVI >= 50 ? '#ef4444' : (row.Avg_SEVI >= 30 ? '#ff7a00' : '#10b981');
                const bgColor = idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)';
                return `
                  <tr style="background-color: ${bgColor}; border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
                    <td style="padding: 8px 15px; color: #ffffff; font-weight: bold;">${row.State}</td>
                    <td style="padding: 8px 15px; color: #cbd5e1; text-align: right; font-family: monospace;">${row.Avg_Deficit_Percent.toFixed(2)}%</td>
                    <td style="padding: 8px 15px; color: #cbd5e1; text-align: right; font-family: monospace;">${row.Avg_Outages.toFixed(1)}</td>
                    <td style="padding: 8px 15px; color: #ff7a00; text-align: right; font-weight: bold; font-family: monospace;">${row.Avg_SEVI.toFixed(1)}</td>
                    <td style="padding: 8px 15px; text-align: center;">
                      <span style="background-color: ${riskColor}15; border: 1px solid ${riskColor}30; color: ${riskColor}; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;">${riskLevel}</span>
                    </td>
                  </tr>
                `;
              }).join('') : ''}
            </tbody>
          </table>
        </div>
        
        <div style="background-color: rgba(255, 122, 0, 0.04); border: 1px solid rgba(255, 122, 0, 0.15); padding: 18px; border-radius: 12px; font-size: 11px; line-height: 1.6; color: #94a3b8; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
          <strong style="color: #ff7a00; font-size: 12px; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Summary Analysis & Recommendations</strong>
          The State Energy Vulnerability Index (SEVI) is a normalized risk assessment metric combining power deficits, outage frequencies, and restoration speed. High SEVI scores (SEVI > 40) highlighted in this report identify critical states where power grid infrastructure is vulnerable to seasonal peaking load stresses. We recommend capacity enhancement, smart grid management, and investment in energy storage systems for high-risk zones.
        </div>
      `;
      
      document.body.appendChild(reportDiv);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(reportDiv, {
        backgroundColor: '#0a1128',
        scale: 2,
        useCORS: true
      });
      
      document.body.removeChild(reportDiv);
      
      const imgWidth = 595.28;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'pt', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('India_Power_Report.pdf');
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Get unique states list
  const statesList = useMemo(() => {
    if (!seviData) return [];
    return seviData.map(s => s.State).sort();
  }, [seviData]);

  // Find SEVI score for selected state
  const selectedStateSevi = useMemo(() => {
    if (!seviData) return 0;
    const match = seviData.find(s => s.State.toLowerCase() === selectedState.toLowerCase());
    return match ? match.Avg_SEVI : 0;
  }, [seviData, selectedState]);

  // Get historical trend of selected state
  const selectedStateTrend = useMemo(() => {
    if (!data) return [];
    // Filter last 24 months for readability
    return data
      .filter(row => row.State.toLowerCase() === selectedState.toLowerCase())
      .sort((a, b) => new Date(a.Date) - new Date(b.Date))
      .slice(-24)
      .map(row => ({
        month: new Date(row.Date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        deficit: parseFloat(row.Energy_Deficit_Percent.toFixed(2)),
        outages: row.Outage_Frequency,
      }));
  }, [data, selectedState]);

  // Top 5 states by average outage frequency
  const topOutageStates = useMemo(() => {
    if (!seviData) return [];
    return [...seviData]
      .sort((a, b) => b.Avg_Outages - a.Avg_Outages)
      .slice(0, 5)
      .map(s => ({
        name: s.State,
        outages: parseFloat(s.Avg_Outages.toFixed(1))
      }));
  }, [seviData]);

  if (loading) {
    return (
      <div className="space-y-8 pb-12 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/30 pb-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-7 bg-navy-700/60 rounded-lg w-64"></div>
            <div className="h-4 bg-navy-700/40 rounded-full w-96"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-28 bg-navy-700/60 rounded-xl"></div>
            <div className="h-10 w-32 bg-navy-700/60 rounded-xl"></div>
          </div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard type="metric" />
          <SkeletonCard type="metric" />
          <SkeletonCard type="metric" />
          <SkeletonCard type="metric" />
        </div>

        {/* Gauge & Chart Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard type="gauge" className="h-80" />
          <SkeletonCard type="chart" className="lg:col-span-2 h-80" />
        </div>

        {/* Bottom Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <SkeletonCard type="chart" className="lg:col-span-3 h-80" />
          <SkeletonCard type="metric" className="lg:col-span-2 h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2">
      {/* Anomaly Pulsing alert banner */}
      <AnimatePresence>
        {showAlert && highRiskStates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 relative overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)' }}
          >
            <div className="flex items-center gap-3">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="h-3.5 w-3.5 rounded-full bg-red-500 flex items-center justify-center shrink-0"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
              </motion.div>
              <div className="text-xs sm:text-sm">
                <span className="font-extrabold text-red-500 uppercase tracking-wider mr-2">HIGH RISK CRITICAL ALERT:</span>
                <span className="text-slate-200">
                  States with SEVI scores exceeding 40: <strong className="text-white">{highRiskStates.join(", ")}</strong>.
                  {anomalies.length > 0 && ` Active anomalies detected: ${anomalies.length} grid events.`}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setShowAlert(false)}
              className="p-1 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white transition-colors text-xs font-bold font-mono cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/30 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Grid Intelligence Dashboard
          </h2>
          <p className="text-slate-400 mt-1.5 text-sm">
            Real-time power supply deficits, outages, and vulnerability metrics across Indian states.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportPDFReport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4" />
            <span>{isExporting ? 'Generating Report...' : 'Export Report'}</span>
          </button>
          <div className="flex items-center gap-2.5 bg-navy-800/40 border border-navy-700/50 px-4 py-2.5 rounded-xl text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono font-bold text-white tracking-wide">{time.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-3 bg-navy-800/40 border border-navy-700/50 px-4 py-2.5 rounded-xl text-xs text-slate-300">
            <Calendar className="h-4 w-4 text-orange-500" />
            <span>Data Horizon: 2015 – 2024</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <MetricCards data={data} seviData={seviData} />

      {/* Main Grid: Custom Gauge & Trend Line */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: State Vulnerability Gauge */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                <span>State Index Explorer</span>
              </h3>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-navy-900 border border-navy-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-orange-500/60 font-semibold"
              >
                {statesList.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Check the computed State Energy Vulnerability Index (SEVI) for any state. Higher values denote higher vulnerability.
            </p>
          </div>
          
          <div className="flex-1 flex items-center justify-center my-4">
            <CustomGauge value={selectedStateSevi} stateName={selectedState} />
          </div>
        </div>

        {/* Right Columns: Deficit Trend Area Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <span>Energy Deficit Trend — {selectedState}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                24-month historical monthly energy deficit profile (%)
              </p>
            </div>
          </div>

          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selectedStateTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7a00" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ff7a00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
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
                <Area 
                  type="monotone" 
                  dataKey="deficit" 
                  stroke="#ff7a00" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#deficitGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Outage States & Recent Anomalies Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Top 5 Outage States Bar Chart */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-2">
            Top Outage-Prone States
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            States ranked by average monthly outage frequency.
          </p>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topOutageStates} layout="vertical" margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#0a1128', 
                    borderColor: 'rgba(255,122,0,0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="outages" radius={[0, 8, 8, 0]}>
                  {topOutageStates.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? '#ef4444' : (index < 3 ? '#ff7a00' : '#ff9233')} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vulnerability System Callout */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
          <div>
            <div className="bg-orange-500/15 border border-orange-500/30 p-3 rounded-xl inline-block mb-4">
              <AlertCircle className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">SEVI Vulnerability Formula</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              The State Energy Vulnerability Index is a weighted metric normalising multiple risks:
            </p>
            <div className="bg-navy-950/60 p-4 rounded-xl space-y-2 border border-navy-700/30 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>1. Deficit Ratio (40%):</span>
                <span className="text-orange-500">Weight 0.40</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>2. Outage Freq (35%):</span>
                <span className="text-orange-500">Weight 0.35</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>3. Recovery Time (25%):</span>
                <span className="text-orange-500">Weight 0.25</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-navy-700/40 text-[11px] text-slate-400">
            Formula: <span className="text-white font-bold">SEVI = 0.4*D_norm + 0.35*F_norm + 0.25*R_norm</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
