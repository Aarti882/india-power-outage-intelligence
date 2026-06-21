import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Zap, AlertCircle } from 'lucide-react';

const Login = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Authentication Error:", err);
      // Friendly, specific error handling
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in window was closed. Please try again.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(err.message || "Failed to authenticate with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-navy-950 flex items-center justify-center relative overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
      
      {/* Background radial/blur gradients for premium aesthetic */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Centered Login Card */}
      <div 
        className="glass-panel p-10 rounded-3xl w-full max-w-md relative overflow-hidden text-center mx-4"
        style={{ 
          boxShadow: '0 20px 50px 0 rgba(0, 0, 0, 0.4), 0 0 25px rgba(255, 122, 0, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {/* Top orange gradient line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-amber-500"></div>

        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center mt-4 mb-8">
          <div className="bg-gradient-to-tr from-orange-600 to-orange-400 p-4 rounded-2xl shadow-orange-glow mb-4">
            <Zap className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white leading-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Power Outage Intelligence
          </h1>
          <p className="text-xs text-orange-500 font-bold uppercase tracking-wider mt-1.5">
            National Grid Analytics & AI Agent
          </p>
        </div>

        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Access interactive SEVI vulnerability maps, machine learning forecasts, regional deficits, and LangChain AI grid reasoning.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-start gap-3 text-left">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-bold text-red-400 uppercase tracking-wider block mb-1">Login Failed</span>
              {error}
            </div>
          </div>
        )}

        {/* Google Authentication Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-6 rounded-2xl text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <div className="h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" fillRule="evenodd" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>

        {/* Footer Brand watermark */}
        <div className="mt-8 pt-6 border-t border-navy-700/30 text-[10px] text-slate-500">
          Secure authentication provided by Google OAuth.
        </div>
      </div>
    </div>
  );
};

export default Login;
