import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Percent, ShieldAlert, TrendingUp } from 'lucide-react';

const CountUp = ({ value, duration = 1.5, decimals = 0, suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value);
    if (isNaN(end) || end === 0) {
      setCount(value);
      return;
    }
    
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration * 1000 / 60));
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const currentVal = start + progress * range;
      setCount(currentVal.toFixed(decimals));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end.toFixed(decimals));
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration, decimals]);

  return <span>{count}{suffix}</span>;
};

const MetricCards = ({ data, seviData }) => {
  // 1. Calculate Metrics
  const totalEnergySupplied = data.reduce((acc, row) => acc + row.Energy_Supplied_MU, 0);
  
  const totalReq = data.reduce((acc, row) => acc + row.Energy_Requirement_MU, 0);
  const totalDef = data.reduce((acc, row) => acc + row.Energy_Deficit_MU, 0);
  const nationalDeficitPct = totalReq > 0 ? (totalDef / totalReq) * 100 : 0;
  
  const avgOutages = data.reduce((acc, row) => acc + row.Outage_Frequency, 0) / (data.length || 1);
  
  // Most vulnerable state (highest average SEVI)
  let highestSeviState = "N/A";
  let maxSevi = 0;
  if (seviData && seviData.length > 0) {
    const sorted = [...seviData].sort((a, b) => b.Avg_SEVI - a.Avg_SEVI);
    highestSeviState = sorted[0].State;
    maxSevi = sorted[0].Avg_SEVI;
  }

  const cards = [
    {
      title: "Total Energy Supplied",
      value: totalEnergySupplied,
      decimals: 0,
      suffix: " MU",
      icon: Zap,
      color: "from-orange-500 to-amber-500",
      glow: "rgba(255, 122, 0, 0.25)",
      description: "Cumulative energy delivered across all states (2015-2024)"
    },
    {
      title: "National Deficit Ratio",
      value: nationalDeficitPct,
      decimals: 2,
      suffix: "%",
      icon: Percent,
      color: "from-red-500 to-orange-500",
      glow: "rgba(239, 68, 68, 0.2)",
      description: "Aggregated national shortfall between demand and supply"
    },
    {
      title: "Avg Monthly Outages",
      value: avgOutages,
      decimals: 1,
      suffix: " events",
      icon: ShieldAlert,
      color: "from-orange-600 to-red-600",
      glow: "rgba(220, 38, 38, 0.2)",
      description: "Average frequency of blackouts per state monthly"
    },
    {
      title: "Most Vulnerable State",
      value: highestSeviState,
      isText: true,
      subValue: `${maxSevi.toFixed(1)} SEVI`,
      icon: TrendingUp,
      color: "from-amber-600 to-orange-500",
      glow: "rgba(245, 158, 11, 0.25)",
      description: `Highest risk rating: ${highestSeviState} is energy-vulnerable`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            style={{ boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.25), 0 0 15px ${card.glow}` }}
            className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-orange-500/25 transition-all duration-300"
          >
            {/* Background Light Effect */}
            <div className={`absolute -right-10 -top-10 w-24 h-24 bg-gradient-to-tr ${card.color} opacity-[0.06] blur-2xl rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
            
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400 tracking-wide uppercase">
                  {card.title}
                </p>
                <h3 className="text-2xl font-bold mt-2 text-white tracking-tight flex items-baseline gap-1">
                  {card.isText ? (
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                      {card.value}
                    </span>
                  ) : (
                    <CountUp value={card.value} decimals={card.decimals} suffix={card.suffix} />
                  )}
                </h3>
                {card.isText && (
                  <p className="text-xs text-orange-400 font-semibold mt-1 flex items-center gap-1">
                    <span>SEVI Vulnerability Score: {card.subValue}</span>
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-tr ${card.color} bg-opacity-10 text-white shadow-md`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
            
            <p className="text-[11px] text-slate-400/80 mt-4 leading-normal">
              {card.description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};

export default MetricCards;
