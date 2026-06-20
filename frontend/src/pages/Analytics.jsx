import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  Label
} from 'recharts';
import { Filter, SlidersHorizontal, Grid, BarChart4 } from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';

const Analytics = ({ data, seviData, loading }) => {
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedMetric, setSelectedMetric] = useState("Energy_Deficit_Percent");
  const [hoveredCell, setHoveredCell] = useState(null);

  // Get unique regions
  const regionsList = useMemo(() => {
    if (!data) return [];
    return ["All", ...new Set(data.map(row => row.Region))];
  }, [data]);

  // Filtered dataset for charts
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (selectedRegion === "All") return data;
    return data.filter(row => row.Region === selectedRegion);
  }, [data, selectedRegion]);

  // 1. Regional Aggregates for Bar Chart
  const regionalMetrics = useMemo(() => {
    if (!data) return [];
    const regionGroups = {};
    
    data.forEach(row => {
      const reg = row.Region;
      if (!regionGroups[reg]) {
        regionGroups[reg] = { region: reg, reqSum: 0, defSum: 0, count: 0, outagesSum: 0 };
      }
      regionGroups[reg].reqSum += row.Energy_Requirement_MU;
      regionGroups[reg].defSum += row.Energy_Deficit_Percent;
      regionGroups[reg].outagesSum += row.Outage_Frequency;
      regionGroups[reg].count += 1;
    });

    return Object.values(regionGroups).map(g => ({
      region: g.region,
      Avg_Requirement: parseFloat((g.reqSum / g.count).toFixed(1)),
      Avg_Deficit_Pct: parseFloat((g.defSum / g.count).toFixed(2)),
      Avg_Outages: parseFloat((g.outagesSum / g.count).toFixed(1)),
    }));
  }, [data]);

  // 2. Correlation: Scatter data (Outage Frequency vs Recovery Time)
  const correlationData = useMemo(() => {
    if (!filteredData) return [];
    // Average values per state for the selected region
    const stateGroups = {};
    filteredData.forEach(row => {
      const state = row.State;
      if (!stateGroups[state]) {
        stateGroups[state] = { name: state, outages: 0, recovery: 0, count: 0, sevi: 0 };
      }
      stateGroups[state].outages += row.Outage_Frequency;
      stateGroups[state].recovery += row.Average_Recovery_Time_Hours;
      stateGroups[state].sevi += row.SEVI;
      stateGroups[state].count += 1;
    });

    return Object.values(stateGroups).map(g => ({
      name: g.name,
      outages: parseFloat((g.outages / g.count).toFixed(1)),
      recovery: parseFloat((g.recovery / g.count).toFixed(2)),
      sevi: parseFloat((g.sevi / g.count).toFixed(1))
    }));
  }, [filteredData]);

  // 3. State-wise Deficit Heatmap Grid (Yearly average deficit % per state)
  const heatmapData = useMemo(() => {
    if (!data) return { states: [], years: [], grid: {} };
    
    const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
    const states = [...new Set(data.map(row => row.State))].sort();
    
    // Compute mean values per state-year
    const grid = {};
    states.forEach(st => {
      grid[st] = {};
      years.forEach(yr => {
        grid[st][yr] = 0;
      });
    });

    const counts = {};
    data.forEach(row => {
      const st = row.State;
      const yr = new Date(row.Date).getFullYear();
      const val = row[selectedMetric];
      
      if (grid[st] && grid[st][yr] !== undefined) {
        if (!counts[`${st}_${yr}`]) {
          counts[`${st}_${yr}`] = { sum: 0, count: 0 };
        }
        counts[`${st}_${yr}`].sum += val;
        counts[`${st}_${yr}`].count += 1;
      }
    });

    states.forEach(st => {
      years.forEach(yr => {
        const cell = counts[`${st}_${yr}`];
        grid[st][yr] = cell ? parseFloat((cell.sum / cell.count).toFixed(2)) : 0;
      });
    });

    return { states, years, grid };
  }, [data, selectedMetric]);

  // Helper to color heatmap cells based on value
  const getCellColor = (val, metric) => {
    if (metric === "Energy_Deficit_Percent") {
      if (val === 0) return "bg-slate-900/60";
      if (val < 1.0) return "bg-orange-500/10 text-orange-200";
      if (val < 3.0) return "bg-orange-500/25 text-orange-100";
      if (val < 6.0) return "bg-orange-500/50 text-white";
      return "bg-orange-600 text-white glow-orange";
    } else { // Outage frequency
      if (val < 10) return "bg-orange-500/10 text-orange-200";
      if (val < 20) return "bg-orange-500/35 text-orange-100";
      if (val < 30) return "bg-orange-500/60 text-white";
      return "bg-red-600 text-white shadow-lg shadow-red-500/20";
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-12 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/30 pb-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-7 bg-navy-750/70 rounded-lg w-64"></div>
            <div className="h-4 bg-navy-700/60 rounded-full w-96"></div>
          </div>
          <div className="h-10 w-32 bg-navy-700/60 rounded-xl"></div>
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard type="chart" className="h-80" />
          <SkeletonCard type="chart" className="h-80" />
        </div>

        {/* Heatmap Grid Skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between items-center animate-pulse">
            <div className="space-y-2">
              <div className="h-5 bg-navy-700/60 rounded-full w-48"></div>
              <div className="h-3 bg-navy-700/40 rounded-full w-96"></div>
            </div>
            <div className="h-10 w-44 bg-navy-700/60 rounded-xl"></div>
          </div>
          <SkeletonCard type="default" className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2">
      {/* Top Banner and Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/30 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Analytics & Grid Correlations
          </h2>
          <p className="text-slate-400 mt-1.5 text-sm">
            Investigate deep regional aggregates, outage correlations, and temporal heatmaps.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-navy-900/50 p-2 rounded-2xl border border-navy-700/35">
          <div className="flex items-center gap-2 px-3 text-xs text-slate-400 font-bold border-r border-navy-700/40">
            <Filter className="h-3.5 w-3.5 text-orange-500" />
            <span>REGION:</span>
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-navy-950 border border-navy-700/50 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 font-medium"
          >
            {regionsList.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Regional Deficit/Outages & Scatter Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Bar Chart comparison */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
            <BarChart4 className="h-5 w-5 text-orange-500" />
            <span>Regional Deficits & Outage Profiles</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Compare regional aggregate averages for deficit and monthly blackouts.
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="region" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} unit="%" />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} tickLine={false} unit="ev" />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#0a1128', 
                    borderColor: 'rgba(255,122,0,0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                <Bar yAxisId="left" dataKey="Avg_Deficit_Pct" name="Average Deficit %" fill="#ff7a00" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="Avg_Outages" name="Average Outages" fill="#ffaa66" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter Chart: Correlation */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
            <SlidersHorizontal className="h-5 w-5 text-orange-500" />
            <span>Outage Frequency vs Recovery Duration</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Scatter plot showing the relationship between outage frequency (events) and recovery speed (hours).
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                <XAxis type="number" dataKey="outages" name="Outages" stroke="#64748b" fontSize={10} tickLine={false}>
                  <Label value="Outages Frequency (monthly)" offset={-10} position="insideBottom" fill="#64748b" fontSize={10} />
                </XAxis>
                <YAxis type="number" dataKey="recovery" name="Recovery Time" stroke="#64748b" fontSize={10} tickLine={false}>
                  <Label value="Recovery Time (Hours)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="#64748b" fontSize={10} />
                </YAxis>
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ 
                    backgroundColor: '#0a1128', 
                    borderColor: 'rgba(255,122,0,0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(value, name) => [value, name === 'outages' ? 'Outages' : 'Recovery Hours']}
                />
                <Scatter name="States" data={correlationData} fill="#ff7a00">
                  {correlationData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.sevi > 50 ? '#ef4444' : '#ff7a00'} 
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Section */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Grid className="h-5 w-5 text-orange-500" />
              <span>State Deficit Heatmap Matrix (2015 – 2024)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Visualize average monthly energy deficit values over the years. Highlighted cells represent spikes.
            </p>
          </div>

          {/* Toggle metric */}
          <div className="flex items-center gap-2 bg-navy-950 p-1.5 rounded-xl border border-navy-700/40 text-xs">
            <button
              onClick={() => setSelectedMetric("Energy_Deficit_Percent")}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                selectedMetric === "Energy_Deficit_Percent" 
                  ? "bg-orange-500 text-white shadow-md" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Deficit %
            </button>
            <button
              onClick={() => setSelectedMetric("Outage_Frequency")}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                selectedMetric === "Outage_Frequency" 
                  ? "bg-orange-500 text-white shadow-md" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Outages
            </button>
          </div>
        </div>

        {/* Heatmap table wrapper */}
        <div className="overflow-x-auto rounded-xl border border-navy-700/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy-900 border-b border-navy-700/50">
                <th className="p-3 text-xs font-semibold uppercase text-slate-400 sticky left-0 bg-navy-900 z-10">State</th>
                {heatmapData.years.map(yr => (
                  <th key={yr} className="p-3 text-xs font-semibold uppercase text-slate-400 text-center">{yr}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.states.map(state => (
                <tr key={state} className="border-b border-navy-800/40 hover:bg-navy-800/20 transition-colors">
                  <td className="p-3 text-xs font-bold text-slate-200 sticky left-0 bg-navy-950/90 z-10 border-r border-navy-800/50">
                    {state}
                  </td>
                  {heatmapData.years.map(year => {
                    const value = heatmapData.grid[state][year];
                    const isHovered = hoveredCell === `${state}_${year}`;
                    return (
                      <td
                        key={year}
                        className={`p-3 text-center transition-all duration-150 cursor-crosshair text-xs font-mono`}
                        onMouseEnter={() => setHoveredCell(`${state}_${year}`)}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div className={`py-1.5 px-2.5 rounded-md font-semibold ${getCellColor(value, selectedMetric)} ${
                          isHovered ? 'scale-110 shadow-orange-glow border border-orange-400/40' : ''
                        }`}>
                          {selectedMetric === "Energy_Deficit_Percent" ? `${value}%` : value}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Heatmap legend */}
        <div className="flex items-center justify-end gap-6 mt-6 text-xs text-slate-400 font-semibold">
          <span>Legend:</span>
          {selectedMetric === "Energy_Deficit_Percent" ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-slate-900/60 border border-navy-700/50"></span> 0%</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-orange-500/10"></span> &lt; 1%</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-orange-500/25"></span> &lt; 3%</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-orange-500/50"></span> &lt; 6%</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-orange-600"></span> 6%+ (Critical)</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-orange-500/10"></span> &lt; 10 events</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-orange-500/35"></span> &lt; 20 events</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-orange-500/60"></span> &lt; 30 events</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-red-600"></span> 30+ events (Critical)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
