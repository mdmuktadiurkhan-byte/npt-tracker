'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STATUS_MAP = {
  "0": { label: "Machine On", color: "#00E676" },
  "0_off": { label: "Machine Off - N/A", color: "#FF5252" },
  "1": { label: "Yarn Breakage", color: "#2979FF" },
  "2": { label: "Roll Cutting", color: "#FFAB91" },
  "3": { label: "Needle Broken", color: "#A5D6A7" },
  "4": { label: "Program Change", color: "#FFE082" },
  "5": { label: "Power/Electrical problem", color: "#00E5FF" },
  "6": { label: "Machine Cleaning", color: "#C5CAE9" },
  "7": { label: "No Order/No program", color: "#E6EE9C" },
  "8": { label: "No Yarn", color: "#E040FB" },
  "9": { label: "Machine Maintenance", color: "#FF1744" },
};

export default function KnittingMachineTracker() {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [machineNumber, setMachineNumber] = useState('5');
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/npt-status" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Chart", href: "/chart" },
  ];
  
  const [targetDate, setTargetDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    const systemThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkMode(systemThemeMediaQuery.matches);
    const handleThemeChange = (e) => setDarkMode(e.matches);
    systemThemeMediaQuery.addEventListener("change", handleThemeChange);
    return () => systemThemeMediaQuery.removeEventListener("change", handleThemeChange);
  }, []);

  const fetchTrackerData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/reason?machine=${machineNumber}&date=${targetDate}`);
      const json = await res.json();
      
      if (json.success && json.data) {
        const processedBlocks = [];
        const apiData = json.data;

        const dayStartMs = new Date(`${targetDate}T00:00:00`).getTime();
        const dayEndMs = new Date(`${targetDate}T23:59:59.999`).getTime();

        for (let i = 0; i < apiData.length; i++) {
          const current = apiData[i];
          
          let startMs = new Date(current.bdStartTime).getTime();
          let endMs;
          let isLiveBlock = false;

          if (i < apiData.length - 1) {
            endMs = new Date(apiData[i + 1].bdStartTime).getTime();
          } else {
            endMs = new Date().getTime();
            isLiveBlock = true;
          }

          if (endMs < dayStartMs || startMs > dayEndMs) {
            continue; 
          }
          
          if (startMs < dayStartMs) startMs = dayStartMs;
          if (endMs > dayEndMs) {
            endMs = dayEndMs;
            isLiveBlock = false; 
          }

          let duration = endMs - startMs;
          if (duration <= 0) {
            duration = 1000; 
          }

          let currentStatusKey = current.reasonNumber;
          if (current.reasonNumber === "0" && !current.isActive) {
            currentStatusKey = "0_off";
          }

          const statusInfo = STATUS_MAP[currentStatusKey] || { label: "No operation data", color: "#FFAB91" };

          processedBlocks.push({
            ...current,
            computedStartMs: startMs,
            computedEndMs: endMs,
            computedDurationMs: duration,
            isLiveBlock: isLiveBlock, 
            statusKey: currentStatusKey, 
            color: statusInfo.color
          });
        }

        setTimelineData(processedBlocks);
      }
    } catch (error) {
      console.error("Error fetching data from API:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData(true);
  }, [machineNumber, targetDate]);

  useEffect(() => {
    const apiInterval = setInterval(() => {
      fetchTrackerData(false); 
    }, 10000); 
    return () => clearInterval(apiInterval);
  }, [machineNumber, targetDate]);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const nowMs = new Date().getTime();
      const dayEndMs = new Date(`${targetDate}T23:59:59.999`).getTime();

      setTimelineData(prevBlocks => {
        if (!prevBlocks || prevBlocks.length === 0) return prevBlocks;
        
        const updatedBlocks = [...prevBlocks];
        const lastIndex = updatedBlocks.length - 1;
        const lastBlock = { ...updatedBlocks[lastIndex] };

        if (lastBlock.isLiveBlock) {
          const targetEndMs = Math.min(nowMs, dayEndMs);
          
          lastBlock.computedEndMs = targetEndMs;
          lastBlock.computedDurationMs = Math.max(targetEndMs - lastBlock.computedStartMs, 1000);
          
          if (nowMs >= dayEndMs) {
            lastBlock.isLiveBlock = false; 
          }
          
          updatedBlocks[lastIndex] = lastBlock;
        }
        
        return updatedBlocks;
      });
    }, 1000); 

    return () => clearInterval(clockInterval);
  }, [targetDate]);

  const totalDurationDay = 24 * 60 * 60 * 1000;
  const dayStartMs = new Date(`${targetDate}T00:00:00`).getTime();
  const timeLabels = ["12AM", "2AM", "4AM", "6AM", "8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM", "10PM"];

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const formatDateTime = (ms) => {
    const date = new Date(ms);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // --- Reason Wise Total Calculation & Sorting ---
  const getSortedStatusMetrics = () => {
    // ১. প্রথমে সব স্ট্যাটাসের টোটাল ডিউরেশন ০ সেট করি
    const metrics = {};
    Object.keys(STATUS_MAP).forEach(key => {
      metrics[key] = {
        key,
        ...STATUS_MAP[key],
        totalDurationMs: 0,
        percentage: 0
      };
    });

    // ২. টাইমলাইন ডাটা থেকে প্রতিটি রেস্পেক্টিভ কী-তে ডিউরেশন যোগ করি
    let totalCalculatedTimeMs = 0;
    timelineData.forEach(block => {
      if (metrics[block.statusKey]) {
        metrics[block.statusKey].totalDurationMs += block.computedDurationMs;
        totalCalculatedTimeMs += block.computedDurationMs;
      }
    });

    // ৩. পারসেন্টেজ ক্যালকুলেশন করি (যদি ডাটা থাকে, অন্যথায় ০)
    Object.keys(metrics).forEach(key => {
      if (totalCalculatedTimeMs > 0) {
        metrics[key].percentage = (metrics[key].totalDurationMs / totalCalculatedTimeMs) * 100;
      }
    });

    // ৪. পারসেন্টেজ অনুযায়ী বড় থেকে ছোট ক্রমানুসারে (Descending Order) সর্ট করি
    return Object.values(metrics).sort((a, b) => b.percentage - a.percentage);
  };

  const sortedStatusMetrics = getSortedStatusMetrics();

  return (
    <div className={`min-h-screen p-6 font-sans transition-colors duration-300 ${
      darkMode ? "bg-gray-950 text-slate-100" : "bg-gray-50 text-gray-900"
    }`}>
      
      <header className={`mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center max-w-7xl mx-auto border-b pb-3 ${
        darkMode ? "border-gray-800" : "border-gray-200"
      }`}>
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
            Knitting Machine NPT Tracker
          </h2>
          <p className="text-xs text-green-500 font-medium animate-pulse mt-0.5">● Live Monitoring Connected</p>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className={`flex p-1 rounded-lg border text-xs font-medium ${
            darkMode ? "bg-gray-900/50 border-gray-800" : "bg-gray-200/60 border-gray-300"
          }`}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                    isActive
                      ? darkMode
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "bg-white text-indigo-600 shadow-sm font-semibold"
                      : darkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg text-xs transition-all border ${
              darkMode 
                ? "bg-gray-900 border-gray-800 text-yellow-400 hover:bg-gray-800" 
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100 shadow-sm"
            }`}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <div className={`p-6 rounded-xl border max-w-7xl mx-auto transition-colors duration-300 ${
        darkMode ? "bg-gray-900/40 border-gray-800" : "bg-white border-gray-100 shadow-sm"
      }`}>
        
        <div className={`flex flex-wrap items-center justify-between border-b pb-4 mb-6 gap-4 ${
          darkMode ? "border-gray-800" : "border-gray-100"
        }`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Machine:</span>
              <input 
                type="text" 
                value={machineNumber} 
                onChange={(e) => setMachineNumber(e.target.value)}
                className={`border w-16 p-1.5 text-center rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? "bg-gray-900 border-gray-800 text-gray-200" : "bg-white border-gray-300 text-gray-700"
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Date:</span>
              <input 
                type="date" 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)}
                className={`border p-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? "bg-gray-900 border-gray-800 text-gray-200" : "bg-white border-gray-300 text-gray-700"
                }`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          <div className={`lg:col-span-3 border rounded-xl px-6 pb-16 pt-36 relative ${
            darkMode ? "bg-gray-900/60 border-gray-800/60" : "bg-[#FCFDFE] border-gray-100"
          }`}>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-400">Loading Tracker Chart...</div>
            ) : (
              <div className="min-w-[750px] relative">
                
                <div className="flex items-center relative">
                  <div className={`w-16 text-xs font-bold shrink-0 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    M-{machineNumber}
                  </div>

                  <div className={`flex-1 h-24 rounded-sm relative border ${
                    darkMode ? "bg-gray-950/40 border-gray-800" : "bg-gray-50 border-gray-200"
                  }`}>
                    {timelineData.map((block, index) => {
                      const leftPercent = ((block.computedStartMs - dayStartMs) / totalDurationDay) * 100;
                      const widthPercent = (block.computedDurationMs / totalDurationDay) * 100;
                      const statusInfo = STATUS_MAP[block.statusKey] || { label: "No operation data", color: "#FFAB91" };

                      return (
                        <div
                          key={index}
                          style={{ 
                            position: 'absolute',
                            left: `${Math.max(leftPercent, 0)}%`,
                            width: `${Math.max(widthPercent, 0.05)}%`, 
                            backgroundColor: block.color 
                          }}
                          className="h-full cursor-pointer group"
                        >
                          <div className="absolute -top-36 left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#1E1E1E] text-gray-300 text-[13px] p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[9999] w-64 pointer-events-none border border-gray-800">
                            <div className="space-y-1.5 text-left whitespace-nowrap">
                              <div>
                                <span className="text-gray-400 font-medium">Start: </span>
                                <span className="text-gray-200 font-mono text-[12px]">{formatDateTime(block.computedStartMs)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 font-medium">End: </span>
                                <span className="text-gray-200 font-mono text-[12px]">
                                  {block.isLiveBlock ? `${formatDateTime(block.computedEndMs)} (Running)` : formatDateTime(block.computedEndMs)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 font-medium">Duration: </span>
                                <span className="text-white font-semibold">{formatDuration(block.computedDurationMs)}</span>
                              </div>
                              <div className="pt-0.5">
                                <span className="text-gray-400 font-medium">Reason: </span>
                                <span className="text-orange-400 font-medium">{statusInfo.label}</span>
                              </div>
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#1E1E1E]"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`absolute left-16 right-0 -bottom-10 flex justify-between text-xs font-medium ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                  {timeLabels.map((label, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className={`w-[1px] h-1.5 mb-1 ${darkMode ? "bg-gray-700" : "bg-gray-300"}`}></div>
                      <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{label}</span>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* Right Side Panel: Status & Reasons With Auto Sorting, Percentage and Duration */}
          <div className={`border rounded-xl p-5 h-fit ${
            darkMode ? "bg-gray-900/60 border-gray-800" : "bg-white border-gray-100 shadow-sm"
          }`}>
            <h3 className={`text-sm font-semibold border-b pb-2 mb-3 ${
              darkMode ? "text-gray-300 border-gray-800" : "text-gray-700 border-gray-100"
            }`}>Status & Reasons</h3>
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {sortedStatusMetrics.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2 text-xs font-medium p-1 rounded transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-3.5 h-3.5 rounded shadow-sm shrink-0 border border-black/5" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className={`truncate ${darkMode ? "text-gray-300" : "text-gray-700"}`} title={item.label}>
                      {item.label}
                    </span>
                  </div>
                  
                  <div className="text-right shrink-0 font-mono flex flex-col items-end">
                    <span className={item.percentage > 0 ? "text-indigo-500 font-bold" : (darkMode ? "text-gray-600" : "text-gray-400")}>
                      {item.percentage.toFixed(1)}%
                    </span>
                    {item.totalDurationMs > 0 && (
                      <span className={`text-[10px] ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                        {formatDuration(item.totalDurationMs)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}