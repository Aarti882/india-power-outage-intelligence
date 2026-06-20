import React, { useState, useMemo } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { 
  GitCompare, 
  FileText, 
  Zap, 
  ShieldAlert, 
  ArrowLeftRight,
  TrendingUp,
  Clock,
  Gauge
} from 'lucide-react';
import { generateStateReportCard } from '../utils/pdfGenerator';
import SkeletonCard from '../components/SkeletonCard';

const StateComparator = ({ seviData, loading }) => {
  const [stateA, setStateA] = useState("Uttar Pradesh");
  const [stateB, setStateB] = useState("Bihar");

  // Get list of unique states
  const statesList = useMemo(() => {
    if (!seviData) return [];
    return seviData.map(s => s.State).sort();
  }, [seviData]);

  // Find metrics for selected states
  const stateAData = useMemo(() => {
    if (!seviData) return null;
    return seviData.find(s => s.State.toLowerCase() === stateA.toLowerCase()) || seviData[0];
  }, [seviData, stateA]);

  const stateBData = useMemo(() => {
    if (!seviData) return null;
    return seviData.find(s => s.State.toLowerCase() === stateB.toLowerCase()) || seviData[1] || seviData[0];
  }, [seviData, stateB]);

  // Calculate dynamic maximums for radar chart normalization (0-100 score mapping)
  const maxValues = useMemo(() => {
    if (!seviData || seviData.length === 0) return { sevi: 100, deficit: 10, outages: 40, recovery: 10, requirement: 25000 };
    return {
      sevi: Math.max(...seviData.map(s => s.Avg_SEVI), 1),
      deficit: Math.max(...seviData.map(s => s.Avg_Deficit_Percent), 1),
      outages: Math.max(...seviData.map(s => s.Avg_Outages), 1),
      recovery: Math.max(...seviData.map(s => s.Avg_Recovery_Time), 1),
      requirement: Math.max(...seviData.map(s => s.Avg_Requirement_MU), 1)
    };
  }, [seviData]);

  // Format Radar data (mapping 5 metrics normalized to 100)
  const radarData = useMemo(() => {
    if (!stateAData || !stateBData) return [];
    return [
      {
        subject: 'SEVI Vulnerability',
        A: (stateAData.Avg_SEVI / maxValues.sevi) * 100,
        B: (stateBData.Avg_SEVI / maxValues.sevi) * 100,
        valA: stateAData.Avg_SEVI.toFixed(2),
        valB: stateBData.Avg_SEVI.toFixed(2)
      },
      {
        subject: 'Deficit Ratio (%)',
        A: (stateAData.Avg_Deficit_Percent / maxValues.deficit) * 100,
        B: (stateBData.Avg_Deficit_Percent / maxValues.deficit) * 100,
        valA: `${stateAData.Avg_Deficit_Percent.toFixed(2)}%`,
        valB: `${stateBData.Avg_Deficit_Percent.toFixed(2)}%`
      },
      {
        subject: 'Outages Count',
        A: (stateAData.Avg_Outages / maxValues.outages) * 100,
        B: (stateBData.Avg_Outages / maxValues.outages) * 100,
        valA: stateAData.Avg_Outages.toFixed(1),
        valB: stateBData.Avg_Outages.toFixed(1)
      },
      {
        subject: 'Recovery Speed (hrs)',
        A: (stateAData.Avg_Recovery_Time / maxValues.recovery) * 100,
        B: (stateBData.Avg_Recovery_Time / maxValues.recovery) * 100,
        valA: `${stateAData.Avg_Recovery_Time.toFixed(2)} hrs`,
        valB: `${stateBData.Avg_Recovery_Time.toFixed(2)} hrs`
      },
      {
        subject: 'Energy Demand (MU)',
        A: (stateAData.Avg_Requirement_MU / maxValues.requirement) * 100,
        B: (stateBData.Avg_Requirement_MU / maxValues.requirement) * 100,
        valA: `${stateAData.Avg_Requirement_MU.toFixed(0)} MU`,
        valB: `${stateBData.Avg_Requirement_MU.toFixed(0)} MU`
      }
    ];
  }, [stateAData, stateBData, maxValues]);

  // Determine more energy secure state (Lower SEVI vulnerability score = more secure)
  const securityWinner = useMemo(() => {
    if (!stateAData || !stateBData) return null;
    if (stateAData.Avg_SEVI === stateBData.Avg_SEVI) return null;
    return stateAData.Avg_SEVI < stateBData.Avg_SEVI ? stateAData : stateBData;
  }, [stateAData, stateBData]);

  const securityLoser = useMemo(() => {
    if (!stateAData || !stateBData) return null;
    return stateAData.Avg_SEVI >= stateBData.Avg_SEVI ? stateAData : stateBData;
  }, [stateAData, stateBData]);

  if (loading) {
    return (
      <div className="space-y-8 pb-12 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/30 pb-6">
          <div className="space-y-2">
            <div className="h-7 bg-navy-700/60 rounded-lg w-64"></div>
            <div className="h-4 bg-navy-700/40 rounded-full w-96"></div>
          </div>
        </div>

        {/* Dropdowns Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-12 bg-navy-800/60 border border-navy-700/50 rounded-xl"></div>
          <div className="h-12 bg-navy-800/60 border border-navy-700/50 rounded-xl"></div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard type="metric" className="h-80" />
          <SkeletonCard type="gauge" className="h-80" />
          <SkeletonCard type="metric" className="h-80" />
        </div>

        {/* Winner banner Skeleton */}
        <div className="h-20 bg-navy-800/60 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/30 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            State Vulnerability Comparator
          </h2>
          <p className="text-slate-400 mt-1.5 text-sm">
            Compare monthly deficits, outage events, demand requirement and vulnerability index profiles between states.
          </p>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center bg-navy-900/50 p-4 rounded-2xl border border-navy-700/35">
        <div className="md:col-span-2 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Primary State</label>
          <select
            value={stateA}
            onChange={(e) => setStateA(e.target.value)}
            className="bg-navy-950 border border-navy-700/60 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/60 font-semibold cursor-pointer"
          >
            {statesList.map(st => (
              <option key={st} value={st} disabled={st === stateB}>{st}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-center text-slate-500">
          <ArrowLeftRight className="h-5 w-5 rotate-90 md:rotate-0" />
        </div>

        <div className="md:col-span-2 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Comparison State</label>
          <select
            value={stateB}
            onChange={(e) => setStateB(e.target.value)}
            className="bg-navy-950 border border-navy-700/60 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/60 font-semibold cursor-pointer"
          >
            {statesList.map(st => (
              <option key={st} value={st} disabled={st === stateA}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Side by Side Metrics Cards & Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: State A */}
        {stateAData && (
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between border-orange-500/10"
               style={{ boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25), 0 0 15px rgba(255, 122, 0, 0.05)' }}>
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full"></div>
            
            <div>
              <div className="flex justify-between items-start pb-4 border-b border-navy-700/35">
                <div>
                  <h3 className="text-xl font-extrabold text-white">{stateAData.State}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Zone</span>
                </div>
                <button
                  onClick={() => generateStateReportCard(stateAData.State, stateAData.Avg_SEVI, stateAData.Avg_Deficit_Percent, stateAData.Avg_Outages, stateAData.Avg_Recovery_Time, stateAData.Avg_Requirement_MU)}
                  className="p-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-white rounded-xl border border-orange-500/25 transition-all text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  title={`Download ${stateAData.State} PDF`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Report Card</span>
                </button>
              </div>

              <div className="space-y-4 mt-6">
                <div className="bg-navy-950/60 p-3.5 rounded-xl border border-navy-750/30 flex justify-between items-center">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-orange-500" /> SEVI Score
                  </span>
                  <span className="font-extrabold text-sm text-orange-400">{stateAData.Avg_SEVI.toFixed(2)}/100</span>
                </div>
                <div className="bg-navy-950/40 p-3 rounded-xl border border-navy-750/20 flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-slate-500" /> Deficit Ratio
                  </span>
                  <span className="font-bold text-white">{stateAData.Avg_Deficit_Percent.toFixed(2)}%</span>
                </div>
                <div className="bg-navy-950/40 p-3 rounded-xl border border-navy-750/20 flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-slate-500" /> Outages Frequency
                  </span>
                  <span className="font-bold text-white">{stateAData.Avg_Outages.toFixed(1)} / mo</span>
                </div>
                <div className="bg-navy-950/40 p-3 rounded-xl border border-navy-750/20 flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-500" /> Recovery Speed
                  </span>
                  <span className="font-bold text-white">{stateAData.Avg_Recovery_Time.toFixed(2)} hrs</span>
                </div>
                <div className="bg-navy-950/40 p-3 rounded-xl border border-navy-750/20 flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-slate-500" /> Monthly Requirement
                  </span>
                  <span className="font-bold text-white">{stateAData.Avg_Requirement_MU.toFixed(0)} MU</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-navy-700/30 text-[10px] text-slate-400">
              *Calculated based on 2015-2024 records.
            </div>
          </div>
        )}

        {/* Center Radar Chart (1 column) */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between items-center min-h-[380px]">
          <div className="w-full text-center pb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Performance Profile Comparison</h4>
            <p className="text-[10px] text-slate-500 mt-1">Plotted metrics mapped on a normalized scale (0 - 100)</p>
          </div>

          <div className="w-full h-64 mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 7 }} />
                <Radar name={stateA} dataKey="A" stroke="#ff7a00" fill="#ff7a00" fillOpacity={0.2} />
                <Radar name={stateB} dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0a1128', 
                    borderColor: 'rgba(255,122,0,0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                  formatter={(value, name, props) => {
                    const originalVal = props.payload[name === stateA ? 'valA' : 'valB'];
                    return [originalVal, name];
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center gap-6 mt-4 text-[10px] font-extrabold uppercase">
            <div className="flex items-center gap-1.5 text-orange-400">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span>{stateA}</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>{stateB}</span>
            </div>
          </div>
        </div>

        {/* Right Card: State B */}
        {stateBData && (
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between border-blue-500/10"
               style={{ boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25), 0 0 15px rgba(59, 130, 246, 0.05)' }}>
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full"></div>
            
            <div>
              <div className="flex justify-between items-start pb-4 border-b border-navy-700/35">
                <div>
                  <h3 className="text-xl font-extrabold text-white">{stateBData.State}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Comparison Zone</span>
                </div>
                <button
                  onClick={() => generateStateReportCard(stateBData.State, stateBData.Avg_SEVI, stateBData.Avg_Deficit_Percent, stateBData.Avg_Outages, stateBData.Avg_Recovery_Time, stateBData.Avg_Requirement_MU)}
                  className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-white rounded-xl border border-blue-500/25 transition-all text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  title={`Download ${stateBData.State} PDF`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Report Card</span>
                </button>
              </div>

              <div className="space-y-4 mt-6">
                <div className="bg-navy-950/60 p-3.5 rounded-xl border border-navy-750/30 flex justify-between items-center">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-blue-500" /> SEVI Score
                  </span>
                  <span className="font-extrabold text-sm text-blue-400">{stateBData.Avg_SEVI.toFixed(2)}/100</span>
                </div>
                <div className="bg-navy-950/40 p-3 rounded-xl border border-navy-750/20 flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-slate-500" /> Deficit Ratio
                  </span>
                  <span className="font-bold text-white">{stateBData.Avg_Deficit_Percent.toFixed(2)}%</span>
                </div>
                <div className="bg-navy-950/40 p-3 rounded-xl border border-navy-750/20 flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-slate-500" /> Outages Frequency
                  </span>
                  <span className="font-bold text-white">{stateBData.Avg_Outages.toFixed(1)} / mo</span>
                </div>
                <div className="bg-navy-950/40 p-3 rounded-xl border border-navy-750/20 flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-500" /> Recovery Speed
                  </span>
                  <span className="font-bold text-white">{stateBData.Avg_Recovery_Time.toFixed(2)} hrs</span>
                </div>
                <div className="bg-navy-950/40 p-3 rounded-xl border border-navy-750/20 flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-slate-500" /> Monthly Requirement
                  </span>
                  <span className="font-bold text-white">{stateBData.Avg_Requirement_MU.toFixed(0)} MU</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-navy-700/30 text-[10px] text-slate-400">
              *Calculated based on 2015-2024 records.
            </div>
          </div>
        )}

      </div>

      {/* Winner Banner */}
      {securityWinner && securityLoser && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md">
                Energy Security Leader
              </span>
              <span className="text-white font-bold text-sm">{securityWinner.State}</span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              {securityWinner.State} exhibits higher overall grid resilience and energy security compared to {securityLoser.State}, with a SEVI vulnerability index score that is {Math.abs(securityWinner.Avg_SEVI - securityLoser.Avg_SEVI).toFixed(1)} points lower.
            </p>
          </div>
          <button
            onClick={() => generateStateReportCard(securityWinner.State, securityWinner.Avg_SEVI, securityWinner.Avg_Deficit_Percent, securityWinner.Avg_Outages, securityWinner.Avg_Recovery_Time, securityWinner.Avg_Requirement_MU)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/10 shrink-0"
          >
            <FileText className="h-4 w-4" />
            <span>Download Winner Report</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default StateComparator;
