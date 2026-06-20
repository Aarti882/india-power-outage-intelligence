import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Info, Eye, Database, FileText } from 'lucide-react';
import { generateStateReportCard } from '../utils/pdfGenerator';
import SkeletonCard from '../components/SkeletonCard';

// Public GeoJSON URL for India state boundaries
const INDIA_GEOJSON = "https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson";

// Standardizations for any historical names in the public GeoJSON file
const NORM_STATE_MAPPINGS = {
  "orissa": "odisha",
  "uttaranchal": "uttarakhand",
  "nct of delhi": "delhi",
  "pondicherry": "puducherry",
  "daman and diu": "dadra and nagar haveli and daman and diu",
  "dadra and nagar haveli": "dadra and nagar haveli and daman and diu"
};

const IndiaMap = ({ data, seviData, loading }) => {
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipState, setTooltipState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedMetric, setSelectedMetric] = useState("Avg_SEVI");
  const [selectedModalState, setSelectedModalState] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const metricsConfig = {
    "Avg_SEVI": {
      label: "SEVI Vulnerability Score",
      colorRange: ["#1e3a8a", "#ff7a00", "#ef4444"],
      domain: [10, 50, 75],
      suffix: "/100",
      description: "Computed vulnerability ranking based on grid capacity and outages."
    },
    "Avg_Deficit_Percent": {
      label: "Average Deficit %",
      colorRange: ["#1e3a8a", "#ff9500", "#dc2626"],
      domain: [0.5, 4.0, 8.0],
      suffix: "%",
      description: "Aggregated gap between energy demanded and energy supplied."
    },
    "Avg_Outages": {
      label: "Average Outages",
      colorRange: ["#1e3a8a", "#f59e0b", "#b91c1c"],
      domain: [5, 15, 30],
      suffix: " events/mo",
      description: "Average count of monthly power cuts and blackouts."
    }
  };

  // Convert seviData to a dictionary for O(1) state lookups with trimmed lowercase keys
  const stateMetricsLookup = useMemo(() => {
    if (!seviData) return {};
    const dict = {};
    seviData.forEach(row => {
      const key = row.State.toLowerCase().trim();
      dict[key] = row;
    });
    return dict;
  }, [seviData]);

  // Color scale generator
  const colorScale = useMemo(() => {
    const config = metricsConfig[selectedMetric];
    return scaleLinear()
      .domain(config.domain)
      .range(config.colorRange);
  }, [selectedMetric]);

  // Handle map state mouse movements
  const handleMouseMove = (event) => {
    setTooltipPos({
      x: event.clientX + 15,
      y: event.clientY - 15
    });
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
          <div className="h-10 w-[300px] bg-navy-700/60 rounded-xl"></div>
        </div>

        {/* Map layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 glass-panel p-6 rounded-2xl flex flex-col justify-center items-center min-h-[550px] relative overflow-hidden animate-pulse">
            <div className="absolute top-6 left-6 h-12 w-48 bg-navy-700/60 rounded-xl"></div>
            <div className="w-96 h-96 rounded-full border border-navy-700/20 flex items-center justify-center">
              <div className="w-72 h-72 rounded-full border border-navy-700/30 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border border-navy-700/40"></div>
              </div>
            </div>
            <div className="absolute bottom-6 right-6 h-16 w-48 bg-navy-700/60 rounded-2xl"></div>
          </div>
          <SkeletonCard type="metric" className="h-[550px] flex flex-col justify-between" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2 relative">
      
      {/* Title & Controller Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/30 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Interactive India Choropleth
          </h2>
          <p className="text-slate-400 mt-1.5 text-sm">
            Hover over states to inspect detailed power vulnerability indexes. Click a state to lock detailed overview.
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex bg-navy-900/50 p-1.5 rounded-2xl border border-navy-700/35 text-xs">
          {Object.keys(metricsConfig).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={`px-4 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
                selectedMetric === key
                  ? "bg-orange-500 text-white shadow-orange-glow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {metricsConfig[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Map Box (3 columns) */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl flex flex-col justify-center items-center min-h-[550px] relative overflow-hidden">
          
          <div className="absolute top-6 left-6 z-10 flex items-center gap-2 text-xs bg-navy-950/80 border border-navy-700/40 p-3 rounded-xl max-w-xs">
            <Info className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="text-slate-300">
              {metricsConfig[selectedMetric].description}
            </span>
          </div>

          {/* Choropleth Legend bar */}
          <div className="absolute bottom-6 right-6 z-10 bg-navy-950/80 border border-navy-700/40 p-4 rounded-2xl flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {metricsConfig[selectedMetric].label} Scale
            </span>
            <div className="h-2.5 w-48 rounded bg-gradient-to-r" style={{
              backgroundImage: `linear-gradient(to right, ${metricsConfig[selectedMetric].colorRange.join(", ")})`
            }}></div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>{metricsConfig[selectedMetric].domain[0]}</span>
              <span>{metricsConfig[selectedMetric].domain[1]}</span>
              <span>{metricsConfig[selectedMetric].domain[2]}+</span>
            </div>
          </div>

          {/* Map canvas */}
          <div className="w-full max-w-xl">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 950,
                center: [78.9629, 22.5937] // Center of India
              }}
              width={600}
              height={550}
            >
              <Geographies geography={INDIA_GEOJSON}>
                {({ geographies }) => {
                  console.log("GeoJSON feature names:", geographies.map(g => g.properties.NAME_1));
                  return geographies.map((geo) => {
                    const geoStateName = geo.properties.NAME_1;
                    
                    // Normalize name
                    let normalizedName = geoStateName ? geoStateName.toLowerCase().trim() : "";
                    if (NORM_STATE_MAPPINGS[normalizedName]) {
                      normalizedName = NORM_STATE_MAPPINGS[normalizedName];
                    }
                    
                    const stateData = stateMetricsLookup[normalizedName];
                    const metricValue = stateData ? stateData[selectedMetric] : null;
                    
                    // Fill color based on metric
                    const fillColor = metricValue !== null ? colorScale(metricValue) : "#0f172a"; // Slate-900 for blank states

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => {
                          if (stateData) {
                            setSelectedModalState({
                              name: stateData.State,
                              sevi: stateData.Avg_SEVI,
                              deficit: stateData.Avg_Deficit_Percent,
                              outages: stateData.Avg_Outages,
                              recovery: stateData.Avg_Recovery_Time,
                              req: stateData.Avg_Requirement_MU
                            });
                            setIsModalOpen(true);
                          }
                        }}
                        onMouseEnter={(e) => {
                          const stateInfo = stateData ? {
                            name: stateData.State,
                            sevi: stateData.Avg_SEVI,
                            deficit: stateData.Avg_Deficit_Percent,
                            outages: stateData.Avg_Outages,
                            recovery: stateData.Avg_Recovery_Time,
                            req: stateData.Avg_Requirement_MU
                          } : {
                            name: geoStateName || "Unknown Region",
                            noData: true
                          };
                          setHoveredState(stateInfo);
                          setTooltipState(stateInfo);
                          handleMouseMove(e);
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setTooltipState(null)}
                        style={{
                          default: {
                            fill: fillColor,
                            stroke: "#0a1128",
                            strokeWidth: 0.8,
                            outline: "none",
                            transition: "all 200ms ease"
                          },
                          hover: {
                            fill: "#ff7a00",
                            stroke: "#fff",
                            strokeWidth: 1.2,
                            outline: "none",
                            cursor: stateData ? "pointer" : "default"
                          },
                          pressed: {
                            fill: "#e06b00",
                            stroke: "#fff",
                            strokeWidth: 1.5,
                            outline: "none"
                          }
                        }}
                      />
                    );
                  })
                }}
              </Geographies>
            </ComposableMap>
          </div>
        </div>

        {/* Sidebar Info Card (1 column) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-orange-500" />
              <span>State Detail</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Hover over any state on the map to show capacity, supply, and outage frequencies.
            </p>

            <AnimatePresence mode="wait">
              {hoveredState ? (
                <motion.div
                  key={hoveredState.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-navy-700/40">
                    <MapPin className="h-4.5 w-4.5 text-orange-500 shrink-0" />
                    <span className="font-extrabold text-white text-base">{hoveredState.name}</span>
                  </div>

                  {hoveredState.noData ? (
                    <div className="p-3 bg-navy-950/60 rounded-xl border border-navy-700/30 text-xs text-slate-500 italic">
                      No synthetic data available for this region.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="bg-navy-950/60 p-3 rounded-xl border border-navy-700/30">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">SEVI Index Score</p>
                        <p className="text-xl font-black text-orange-400 mt-0.5">{hoveredState.sevi.toFixed(2)}/100</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-navy-950/40 p-2.5 rounded-lg border border-navy-750/30">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Deficit Ratio</p>
                          <p className="text-sm font-bold text-white mt-0.5">{hoveredState.deficit.toFixed(2)}%</p>
                        </div>
                        <div className="bg-navy-950/40 p-2.5 rounded-lg border border-navy-750/30">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Outages / Mo</p>
                          <p className="text-sm font-bold text-white mt-0.5">{hoveredState.outages.toFixed(1)} ev</p>
                        </div>
                      </div>
                      <div className="bg-navy-950/40 p-3 rounded-xl border border-navy-750/30 space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span>Avg Requirement:</span>
                          <span className="font-semibold text-white">{hoveredState.req.toFixed(1)} MU</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recovery speed:</span>
                          <span className="font-semibold text-white">{hoveredState.recovery.toFixed(2)} hrs</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="p-4 bg-navy-950/40 border border-dashed border-navy-700/50 rounded-2xl flex flex-col items-center justify-center py-12 text-center text-xs text-slate-500">
                  <Database className="h-8 w-8 text-navy-600 mb-2" />
                  <span>No State Selected</span>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-[10px] text-slate-500 leading-normal border-t border-navy-700/40 pt-4">
            *Note: Boundaries represent geographical state borders retrieved from the public geohacker repository.
          </div>
        </div>
      </div>

      {/* Modal Detail Popup */}
      <AnimatePresence>
        {isModalOpen && selectedModalState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="glass-panel p-8 rounded-3xl w-full max-w-md relative overflow-hidden text-left"
              style={{ boxShadow: '0 20px 50px 0 rgba(0, 0, 0, 0.5), 0 0 25px rgba(255, 122, 0, 0.15)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedModalState(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-navy-800/60 transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 pb-3 border-b border-navy-700/40 mb-6">
                <MapPin className="h-5 w-5 text-orange-500" />
                <h3 className="font-extrabold text-white text-xl">{selectedModalState.name}</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-navy-950/80 p-4 rounded-2xl border border-navy-700/50 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vulnerability Index (SEVI)</p>
                    <p className="text-2xl font-black text-orange-400 mt-1">{selectedModalState.sevi.toFixed(2)}/100</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    selectedModalState.sevi >= 60 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/25' 
                      : (selectedModalState.sevi >= 30 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/25' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25')
                  }`}>
                    {selectedModalState.sevi >= 60 ? 'High Risk' : (selectedModalState.sevi >= 30 ? 'Medium Risk' : 'Low Risk')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-navy-950/40 p-4 rounded-xl border border-navy-750/30">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Deficit Ratio</p>
                    <p className="text-base font-extrabold text-white mt-1">{selectedModalState.deficit.toFixed(3)}%</p>
                  </div>
                  <div className="bg-navy-950/40 p-4 rounded-xl border border-navy-750/30">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Outages / Month</p>
                    <p className="text-base font-extrabold text-white mt-1">{selectedModalState.outages.toFixed(1)} events</p>
                  </div>
                </div>

                <div className="bg-navy-950/40 p-4 rounded-xl border border-navy-750/30 space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Average Monthly Demand:</span>
                    <span className="font-semibold text-white">{selectedModalState.req.toFixed(1)} MU</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Power Recovery Speed:</span>
                    <span className="font-semibold text-white">{selectedModalState.recovery.toFixed(2)} hours</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => generateStateReportCard(
                    selectedModalState.name,
                    selectedModalState.sevi,
                    selectedModalState.deficit,
                    selectedModalState.outages,
                    selectedModalState.recovery,
                    selectedModalState.req
                  )}
                  className="px-5 py-2.5 bg-gradient-to-tr from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  <span>Report Card</span>
                </button>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedModalState(null);
                  }}
                  className="px-5 py-2.5 bg-navy-800 hover:bg-navy-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-navy-700/50 transition-all cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Tooltip Component */}
      <AnimatePresence>
        {tooltipState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed pointer-events-none z-50 bg-navy-950/90 border border-orange-500/30 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs shadow-glass text-white"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <p className="font-bold text-orange-400 mb-1">{tooltipState.name}</p>
            {tooltipState.noData ? (
              <p className="text-[10px] text-slate-500 italic">No historical records</p>
            ) : (
              <div className="space-y-0.5 text-[10px] text-slate-300">
                <p>SEVI Score: <span className="font-semibold text-white">{tooltipState.sevi.toFixed(1)}/100</span></p>
                <p>Deficit Ratio: <span className="font-semibold text-white">{tooltipState.deficit.toFixed(2)}%</span></p>
                <p>Outages/mo: <span className="font-semibold text-white">{tooltipState.outages.toFixed(1)} events</span></p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IndiaMap;
