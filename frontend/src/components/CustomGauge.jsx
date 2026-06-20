import React from 'react';
import { motion } from 'framer-motion';

const CustomGauge = ({ value = 0, title = "Vulnerability Index", stateName = "Selected State" }) => {
  // Semicircle calculations
  const radius = 50;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // 157.08
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  // Determine risk category and color
  let riskLabel = "Low Risk";
  let riskColorClass = "text-emerald-400";
  let strokeColor = "#10b981"; // Emerald
  let glowColor = "rgba(16, 185, 129, 0.4)";

  if (value >= 60) {
    riskLabel = "High Risk";
    riskColorClass = "text-red-500 font-bold text-orange-glow";
    strokeColor = "#ef4444"; // Red
    glowColor = "rgba(239, 68, 68, 0.5)";
  } else if (value >= 30) {
    riskLabel = "Medium Risk";
    riskColorClass = "text-orange-500 font-bold";
    strokeColor = "#ff7a00"; // Orange
    glowColor = "rgba(255, 122, 0, 0.5)";
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-navy-800/30 rounded-2xl border border-navy-700/50 relative overflow-hidden h-full">
      {/* Background radial glow */}
      <div 
        className="absolute w-32 h-32 blur-3xl opacity-[0.08] rounded-full -bottom-10"
        style={{ backgroundColor: strokeColor }}
      ></div>

      <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1">
        {title}
      </h4>
      <p className="text-sm text-white font-bold mb-4">{stateName}</p>

      {/* SVG Semicircle Gauge */}
      <div className="relative w-44 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-180" viewBox="0 0 120 70">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#ff7a00" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          
          {/* Base Track */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="#16224f"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Indicator Arc */}
          <motion.path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>

        {/* Center Text displaying value */}
        <div className="absolute bottom-1 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-white leading-none">
            {value.toFixed(1)}
          </span>
          <span className={`text-[10px] uppercase font-bold tracking-wider mt-1.5 ${riskColorClass}`}>
            {riskLabel}
          </span>
        </div>
      </div>

      <div className="w-full grid grid-cols-3 gap-2 mt-4 text-center border-t border-navy-700/40 pt-4">
        <div>
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Low</p>
          <div className="h-1 w-full bg-emerald-500/20 rounded-full mt-1">
            <div className="h-full bg-emerald-500 rounded-full w-full opacity-60"></div>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Medium</p>
          <div className="h-1 w-full bg-orange-500/20 rounded-full mt-1">
            <div className="h-full bg-orange-500 rounded-full w-full opacity-60"></div>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 font-semibold uppercase">High</p>
          <div className="h-1 w-full bg-red-500/20 rounded-full mt-1">
            <div className="h-full bg-red-500 rounded-full w-full opacity-60"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomGauge;
