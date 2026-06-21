import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import IndiaMap from './pages/IndiaMap';
import StateComparator from './pages/StateComparator';
import Forecasting from './pages/Forecasting';
import AIAgent from './pages/AIAgent';
import Login from './pages/Login';

import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AlertCircle, Zap } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState([]);
  const [seviData, setSeviData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Monitor Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all core datasets from FastAPI backend on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Parallel fetching
        const [dataRes, seviRes, anomaliesRes] = await Promise.all([
          fetch('/api/data'),
          fetch('/api/sevi'),
          fetch('/api/anomalies')
        ]);

        if (!dataRes.ok || !seviRes.ok || !anomaliesRes.ok) {
          throw new Error("One or more backend API calls failed. Make sure the FastAPI server is running on localhost:8000.");
        }

        const rawData = await dataRes.json();
        const seviJson = await seviRes.json();
        const anomaliesJson = await anomaliesRes.json();
        setData(rawData);
        setSeviData(seviJson);
        setAnomalies(anomaliesJson);
      } catch (err) {
        console.error("Error loading frontend data:", err);
        setError(err.message || "Failed to establish websocket/HTTP connection to backend server.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAllData();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('dashboard'); // Reset active tab on logout
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Main Page Router switch
  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
          <div className="bg-red-500/15 border border-red-500/35 p-4 rounded-full text-red-500">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Backend Connection Offline</h3>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            {error}
          </p>
          <div className="bg-navy-900 border border-navy-700/60 p-4 rounded-xl font-mono text-xs text-slate-400 text-left w-full max-w-md mt-6 space-y-2">
            <p className="text-orange-400 font-semibold">// To troubleshoot:</p>
            <p>1. Open a new terminal in the workspace root.</p>
            <p>2. Activate your virtual environment.</p>
            <p>3. Run: <span className="text-white font-bold">uvicorn backend.main:app --reload</span></p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={data} seviData={seviData} loading={loading} />;
      case 'analytics':
        return <Analytics data={data} seviData={seviData} loading={loading} />;
      case 'map':
        return <IndiaMap data={data} seviData={seviData} loading={loading} />;
      case 'comparator':
        return <StateComparator seviData={seviData} loading={loading} />;
      case 'forecasting':
        return <Forecasting data={data} seviData={seviData} loading={loading} />;
      case 'agent':
        return <AIAgent />;
      default:
        return <Dashboard data={data} seviData={seviData} loading={loading} />;
    }
  };

  // Render initialization loading screen
  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-navy-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full border-2 border-orange-500/30 animate-ping"></div>
          <div className="bg-navy-900 border border-navy-700/60 p-4 rounded-full text-orange-500 shadow-orange-glow relative">
            <Zap className="h-7 w-7 text-orange-500 animate-pulse" />
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest animate-pulse mt-2">
          Initializing Engine...
        </p>
      </div>
    );
  }

  // Route Guard: Unauthenticated users are shown the Login screen
  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen w-screen bg-navy-950 text-slate-100 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        anomalyCount={anomalies.length} 
      />

      {/* Main Viewport Content Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden p-8 z-10 bg-gradient-to-tr from-navy-950 to-navy-900">
        
        {/* Glow backdrop ornaments */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        
        {/* Render page content inside animation wrapper */}
        <div className="flex-1 h-full w-full relative">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
