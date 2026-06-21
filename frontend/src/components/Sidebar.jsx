import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Map, 
  LineChart, 
  Bot, 
  Zap, 
  AlertTriangle,
  GitCompare,
  LogOut,
  X
} from 'lucide-react';

const Sidebar = ({ user, onLogout, activeTab, setActiveTab, anomalyCount, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', name: 'Analytics Trends', icon: BarChart3 },
    { id: 'map', name: 'Choropleth Map', icon: Map },
    { id: 'comparator', name: 'State Comparator', icon: GitCompare },
    { id: 'forecasting', name: 'AI Forecasting', icon: LineChart },
    { id: 'agent', name: 'Gemini AI Agent', icon: Bot },
  ];

  return (
    <aside 
      className={`w-64 bg-navy-900 border-r border-navy-700/50 flex flex-col h-full z-40 fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="p-6 border-b border-navy-700/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
        {/* Close button on mobile/tablet viewports */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors cursor-pointer"
          title="Close Menu"
        >
          <X className="h-5 w-5" />
        </button>
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

      {/* User Profile Card */}
      {user && (
        <div className="p-3 border-t border-navy-700/40 bg-navy-950/30 mx-4 mb-2 rounded-2xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || "User"} 
                className="h-8 w-8 rounded-full border border-orange-500/20 object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-orange-500 font-bold text-xs shrink-0">
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="truncate">
              <p className="text-[11px] font-bold text-white truncate leading-tight">
                {user.displayName || 'Google User'}
              </p>
              <p className="text-[9px] text-slate-500 truncate mt-0.5 leading-none">
                {user.email}
              </p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-navy-800/60 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* System Status Footer */}
      <div className="p-3 border-t border-navy-700/40 bg-navy-950/40 mx-4 mb-4 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="text-[10px] font-semibold text-slate-400">System Connected</span>
        </div>
        <p className="text-[9px] text-slate-600 mt-1">FastAPI Engine v0.1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
