import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Map, 
  LineChart, 
  Bot, 
  Zap, 
  AlertTriangle,
  GitCompare
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, anomalyCount }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', name: 'Analytics Trends', icon: BarChart3 },
    { id: 'map', name: 'Choropleth Map', icon: Map },
    { id: 'comparator', name: 'State Comparator', icon: GitCompare },
    { id: 'forecasting', name: 'AI Forecasting', icon: LineChart },
    { id: 'agent', name: 'Gemini AI Agent', icon: Bot },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-700/50 flex flex-col h-full z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-navy-700/40 flex items-center gap-3">
        <div className="bg-gradient-to-tr from-orange-600 to-orange-400 p-2.5 rounded-xl shadow-orange-glow">
          <Zap className="h-6 w-6 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Power Outage
          </h1>
          <p className="text-xs text-orange-500 font-semibold tracking-wider uppercase">
            Intelligence
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500/15 to-orange-500/5 text-orange-500 border border-orange-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>{item.name}</span>
              </div>
              
              {/* Optional Anomaly indicator badge on map tab */}
              {item.id === 'map' && anomalyCount > 0 && (
                <span className="flex items-center justify-center h-5 px-1.5 text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
                  {anomalyCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-navy-700/40 bg-navy-950/40 m-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="text-xs font-medium text-slate-400">System Connected</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">FastAPI Engine v0.1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
