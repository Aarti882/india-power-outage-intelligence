import React from 'react';

const SkeletonCard = ({ type = "metric", className = "" }) => {
  if (type === "metric") {
    return (
      <div className={`glass-panel p-6 rounded-2xl animate-pulse space-y-4 ${className}`}>
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="h-3.5 bg-navy-700/60 rounded-full w-2/3"></div>
            <div className="h-7 bg-navy-750/70 rounded-lg w-1/2 mt-3"></div>
          </div>
          <div className="h-12 w-12 bg-navy-700/60 rounded-xl"></div>
        </div>
        <div className="h-2.5 bg-navy-700/60 rounded-full w-5/6 mt-4"></div>
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className={`glass-panel p-6 rounded-2xl animate-pulse space-y-6 ${className}`}>
        <div className="space-y-2">
          <div className="h-4 bg-navy-700/60 rounded-full w-1/4"></div>
          <div className="h-2.5 bg-navy-750/50 rounded-full w-1/3"></div>
        </div>
        {/* Fake chart bar visualizer */}
        <div className="h-56 flex items-end justify-between gap-4 pt-4 border-b border-navy-700/20 px-2">
          <div className="bg-navy-700/40 w-full rounded-t-lg" style={{ height: '35%' }}></div>
          <div className="bg-navy-700/40 w-full rounded-t-lg" style={{ height: '65%' }}></div>
          <div className="bg-navy-700/40 w-full rounded-t-lg" style={{ height: '45%' }}></div>
          <div className="bg-navy-700/40 w-full rounded-t-lg" style={{ height: '85%' }}></div>
          <div className="bg-navy-700/40 w-full rounded-t-lg" style={{ height: '55%' }}></div>
        </div>
      </div>
    );
  }

  if (type === "gauge") {
    return (
      <div className={`glass-panel p-6 rounded-2xl animate-pulse flex flex-col items-center justify-center space-y-4 ${className}`}>
        <div className="h-3 bg-navy-700/60 rounded-full w-1/2"></div>
        <div className="h-3.5 bg-navy-700/60 rounded-full w-1/3"></div>
        
        {/* Semicircle placeholder */}
        <div className="relative w-36 h-18 overflow-hidden flex items-end justify-center my-4">
          <div className="w-36 h-36 border-[10px] border-navy-700/40 border-b-transparent rounded-full"></div>
        </div>
        
        <div className="h-6 bg-navy-700/60 rounded-full w-1/4"></div>
        <div className="h-2.5 bg-navy-700/60 rounded-full w-1/3 mt-2"></div>
      </div>
    );
  }

  // Default block skeleton
  return (
    <div className={`glass-panel p-6 rounded-2xl animate-pulse space-y-4 ${className}`}>
      <div className="h-4 bg-navy-700/60 rounded-full w-1/3"></div>
      <div className="h-3 bg-navy-700/40 rounded-full w-full"></div>
      <div className="h-3 bg-navy-700/40 rounded-full w-5/6"></div>
      <div className="h-3 bg-navy-700/40 rounded-full w-2/3"></div>
    </div>
  );
};

export default SkeletonCard;
