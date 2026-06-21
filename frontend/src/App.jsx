import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import IndiaMap from './pages/IndiaMap';
import StateComparator from './pages/StateComparator';
import Forecasting from './pages/Forecasting';
import AIAgent from './pages/AIAgent';
import Login from './pages/Login';

import { auth, isFirebaseConfigured } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AlertCircle, Zap, Menu } from 'lucide-react';
import { API_BASE_URL } from './config';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState([]);
  const [seviData, setSeviData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Monitor Firebase Authentication state
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return;
    }
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
          fetch(`${API_BASE_URL}/api/data`),
          fetch(`${API_BASE_URL}/api/sevi`),
          fetch(`${API_BASE_URL}/api/anomalies`)
        ]);

        if (!dataRes.ok || !seviRes.ok || !anomaliesRes.ok) {
          throw new Error(`One or more backend API calls failed. Make sure the FastAPI server is running at ${API_BASE_URL}.`);
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

    if (user || !isFirebaseConfigured) {
      fetchAllData();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('dashboard'); // Reset active tab on logout
      setIsSidebarOpen(false);
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

  // Setup/Configuration Required Screen (if env variables are missing)
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen w-screen bg-navy-950 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div 
          className="glass-panel p-8 rounded-3xl w-full max-w-lg relative overflow-hidden text-left"
          style={{ 
            boxShadow: '0 20px 50px 0 rgba(0, 0, 0, 0.4), 0 0 25px rgba(255, 122, 0, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-amber-500"></div>

          <div className="flex items-center gap-3.5 mb-6 border-b border-navy-700/40 pb-4">
            <div className="bg-orange-500/10 border border-orange-500/25 p-2 rounded-xl text-orange-500">
              <Zap className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Firebase Config Required</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Setup environment credentials to enable Google Sign-In</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            The Firebase Auth credentials are missing from your configuration. Please follow these steps to set up your environment variables:
          </p>

          <div className="space-y-5 text-xs text-slate-300">
            <div>
              <span className="font-bold text-orange-500 mr-1.5">Step 1:</span>
              Create a file named <code className="text-white font-mono bg-navy-900 px-1.5 py-0.5 rounded border border-navy-700/55">.env.local</code> in the <code className="text-white font-mono bg-navy-900 px-1.5 py-0.5 rounded border border-navy-700/55">frontend/</code> directory.
            </div>

            <div>
              <span className="font-bold text-orange-500 mr-1.5">Step 2:</span>
              Open <code className="text-white font-mono bg-navy-900 px-1.5 py-0.5 rounded border border-navy-700/55">.env.local</code> and paste your Firebase Web App credentials:
              <pre className="mt-2.5 bg-navy-900/90 border border-navy-700/60 p-4 rounded-xl font-mono text-[10px] text-slate-400 leading-relaxed overflow-x-auto select-all">
{`VITE_FIREBASE_API_KEY=AIzaSyA...your_api_key...
VITE_FIREBASE_AUTH_DOMAIN=india-power-outage.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=india-power-outage
VITE_FIREBASE_STORAGE_BUCKET=india-power-outage.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=1:your_app_id`}
              </pre>
            </div>

            <div className="pt-2 border-t border-navy-700/40">
              <span className="font-bold text-orange-500 mr-1.5">Step 3:</span>
              Restart your React development server in the terminal:
              <div className="mt-2 bg-navy-900/90 border border-navy-700/60 px-4 py-2.5 rounded-xl font-mono text-[10.5px] text-slate-400">
                <span className="text-slate-500">$</span> npm run dev
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-navy-700/30 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Powered by Firebase Authentication</span>
            <span className="text-orange-500 font-medium">Refreshes automatically on config detection</span>
          </div>
        </div>
      </div>
    );
  }

  // Route Guard: Unauthenticated users are shown the Login screen
  if (!user) {
    return <Login />;
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false); // Close sidebar on selection (mobile overlay)
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-navy-950 text-slate-100 overflow-hidden relative">
      
      {/* Top Header bar for Mobile and Tablet viewports */}
      <header className="lg:hidden w-full h-16 bg-navy-900 border-b border-navy-700/50 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-navy-800/60 transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-orange-600 to-orange-400 p-1.5 rounded-lg shadow-orange-glow">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent uppercase tracking-wider">
              Power Intel
            </span>
          </div>
        </div>
        {user.photoURL && (
          <img 
            src={user.photoURL} 
            alt={user.displayName || "User"} 
            className="h-8 w-8 rounded-full border border-orange-500/30 object-cover"
            referrerPolicy="no-referrer"
          />
        )}
      </header>

      {/* Dark overlay backdrop visible when Sidebar overlay is open */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar 
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        anomalyCount={anomalies.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Viewport Content Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 lg:p-8 z-10 bg-gradient-to-tr from-navy-950 to-navy-900 relative">
        
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
