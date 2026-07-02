"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Chart page এর মতো STATUS_MAP এখানে যুক্ত করা হলো
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

const initialMachines = [];

export default function MachineDashboard() {
  const [machines, setMachines] = useState(initialMachines);
  const [darkMode, setDarkMode] = useState(true);
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/npt-status" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Chart", href: "/chart" },
  ];

  useEffect(() => {
    const systemThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkMode(systemThemeMediaQuery.matches);

    const handleThemeChange = (e) => setDarkMode(e.matches);
    systemThemeMediaQuery.addEventListener("change", handleThemeChange);

    return () => systemThemeMediaQuery.removeEventListener("change", handleThemeChange);
  }, []);

  useEffect(() => {
    setMachines((prev) =>
      prev.map((m) => ({
        ...m,
        isOnline: Math.random() > 0.4,
        reasonNumber: Math.random() > 0.5 ? "3" : "N/A",
      }))
    );

    const fetchMachineStatus = async () => {
      try {
        const response = await fetch("/api/status");
        const data = await response.json();
        setMachines(data.machines);
      } catch (error) {
        setMachines((prev) =>
          prev.map((m) =>
            Math.random() > 0.85 ? { ...m, isOnline: !m.isOnline } : m
          )
        );
      }
    };

    const interval = setInterval(fetchMachineStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const offMachines = machines.filter((m) => !m.isOnline);
  const onMachines = machines.filter((m) => m.isOnline);

  return (
    <div className={`min-h-screen p-4 font-sans selection:bg-indigo-500 transition-colors duration-300 ${
      darkMode ? "bg-gray-950 text-slate-100" : "bg-gray-50 text-gray-900"
    }`}>
      
      <header className={`mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center max-w-[1800px] mx-auto border-b pb-3 ${
        darkMode ? "border-gray-800" : "border-gray-200"
      }`}>
        <h1 className={`text-xl font-bold tracking-tight ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
          GMS NPT Tracker <span className={`text-xs font-normal ${darkMode ? "text-gray-500" : "text-gray-400"}`}>(Total: {machines.length})</span>
        </h1>
        
        <div className="flex items-center gap-4">
          <nav className={`flex p-1 rounded-lg border text-xs font-medium ${
            darkMode ? "bg-gray-900/50 border-gray-800" : "bg-gray-100 border-gray-200"
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
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-[1800px] mx-auto">
        
        {/* OFF Machines */}
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${
          darkMode ? "bg-gray-900/60 border-red-900/30" : "bg-white border-red-100 shadow-sm"
        }`}>
          <div className={`flex items-center gap-2 mb-3 border-b pb-2 ${darkMode ? "border-red-950" : "border-red-100"}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? "text-red-400" : "text-red-600"}`}>
              Stop Machine ({offMachines.length})
            </h2>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5 2xl:grid-cols-6 gap-2 overflow-y-auto max-h-[75vh] pr-1 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {offMachines.map((machine) => (
                <CompactMachineCard key={machine.machineNumber} machine={machine} darkMode={darkMode} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ON Machines */}
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${
          darkMode ? "bg-gray-900/60 border-green-900/30" : "bg-white border-green-100 shadow-sm"
        }`}>
          <div className={`flex items-center gap-2 mb-3 border-b pb-2 ${darkMode ? "border-green-950" : "border-green-100"}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? "text-green-400" : "text-green-600"}`}>
              Running Machine ({onMachines.length})
            </h2>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5 2xl:grid-cols-6 gap-2 overflow-y-auto max-h-[75vh] pr-1 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {onMachines.map((machine) => (
                <CompactMachineCard key={machine.machineNumber} machine={machine} darkMode={darkMode} />
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}

// পরিবর্তিত কম্প্যাক্ট কার্ড ডিজাইন (যা লিখিত Reason দেখাবে)
function CompactMachineCard({ machine, darkMode }) {
  // ম্যাপ থেকে লিখিত স্ট্যাটাস বা টেক্সট বের করা হচ্ছে
  const statusInfo = STATUS_MAP[machine.reasonNumber] || { label: machine.reasonNumber || "N/A" };

  return (
    <motion.div
      layoutId={`mach-${machine.machineNumber}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 35 }}
      className={`p-2 rounded-md border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      } ${
        machine.isOnline 
          ? (darkMode ? "border-green-500/20 hover:border-green-500/40" : "border-green-200 hover:border-green-400") 
          : (darkMode ? "border-red-500/20 hover:border-red-500/40" : "border-red-200 hover:border-red-400")
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-bold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
          #{machine.machineNumber}
        </span>
        <span className={`w-2 h-2 rounded-full ${machine.isOnline ? "bg-green-500" : "bg-red-500"}`} />
      </div>

      <div className={`text-[10px] font-mono truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        {machine.currentStatusDuration}
      </div>

      {!machine.isOnline && (
        <div className={`mt-1 pt-1 border-t flex flex-col gap-0.5 ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
          <span className={`text-[9px] uppercase tracking-tight ${darkMode ? "text-gray-500" : "text-gray-400"}`}>Reason</span>
          {/* এখানে সরাসরি সংখ্যার বদলে টেক্সট (label) প্রিন্ট করা হয়েছে এবং দীর্ঘ লেখা স্ক্রিনে সুন্দর দেখাতে truncate ব্যবহার করা হয়েছে */}
          <span 
            title={statusInfo.label}
            className={`text-[10px] font-bold px-1 py-0.5 rounded truncate block ${
              darkMode ? "text-red-400 bg-red-500/10" : "text-red-600 bg-red-100"
            }`}
          >
            {statusInfo.label}
          </span>
        </div>
      )}
    </motion.div>
  );
}