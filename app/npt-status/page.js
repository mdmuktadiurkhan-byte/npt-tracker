"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ✅ ফিক্সড: প্রাথমিক ডাটা স্ট্যাটিক করা হয়েছে যাতে Server এবং Client-এর রেন্ডার ম্যাচ করে।
const initialMachines =[];

export default function MachineDashboard() {
  const [machines, setMachines] = useState(initialMachines);

  // API ফেচিং এবং লাইভ সিমুলেশন
  useEffect(() => {
    // ✅ কম্পোনেন্ট ক্লায়েন্টে মাউন্ট হওয়ার সাথে সাথেই ডাটা র‍্যান্ডমাইজ করা হচ্ছে
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
        // লাইভ অ্যানিমেশন টেস্ট করার জন্য প্রতি ৩ সেকেন্ডে ডাটা টগল হবে
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
    <div className="min-h-screen bg-gray-950 text-slate-100 p-4 font-sans selection:bg-indigo-500">
      <header className="mb-6 flex justify-between items-center max-w-[1800px] mx-auto border-b border-gray-800 pb-3">
        <h1 className="text-xl font-bold tracking-tight text-indigo-400">
          GMS NPT Tracker oo <span className="text-xs text-gray-500 font-normal">(Total: {machines.length})</span>
        </h1>
      </header>

      {/* মেইন ২-সাইডেড স্ক্রিন */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-[1800px] mx-auto">
        
        {/* বাম পাশ: OFF Machines */}
        <div className="bg-gray-900/60 p-4 rounded-xl border border-red-900/30">
          <div className="flex items-center gap-2 mb-3 border-b border-red-950 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
              Stop Machine ({offMachines.length})
            </h2>
          </div>
          
          {/* ২০০ কার্ডের জন্য ডেনসিটি গ্রিড */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5 2xl:grid-cols-6 gap-2 overflow-y-auto max-h-[75vh] pr-1 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {offMachines.map((machine) => (
                <CompactMachineCard key={machine.machineNumber} machine={machine} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ডান পাশ: ON Machines */}
        <div className="bg-gray-900/60 p-4 rounded-xl border border-green-900/30">
          <div className="flex items-center gap-2 mb-3 border-b border-green-950 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider">
              Running Machine ({onMachines.length})
            </h2>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5 2xl:grid-cols-6 gap-2 overflow-y-auto max-h-[75vh] pr-1 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {onMachines.map((machine) => (
                <CompactMachineCard key={machine.machineNumber} machine={machine} />
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}

// সুপার কম্প্যাক্ট কার্ড ডিজাইন
function CompactMachineCard({ machine }) {
  return (
    <motion.div
      layoutId={`mach-${machine.machineNumber}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 35 }}
      className={`p-2 rounded-md border text-left flex flex-col justify-between transition-colors bg-gray-900 relative overflow-hidden ${
        machine.isOnline 
          ? "border-green-500/20 hover:border-green-500/40" 
          : "border-red-500/20 hover:border-red-500/40"
      }`}
    >
      {/* টপ লাইন: আইডি এবং স্ট্যাটাস ডট */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-gray-200">#{machine.machineNumber}</span>
        <span className={`w-2 h-2 rounded-full ${machine.isOnline ? "bg-green-500" : "bg-red-500"}`} />
      </div>

      {/* মিডল লাইন: ডিউরেশন */}
      <div className="text-[10px] text-gray-400 font-mono truncate">
        {machine.currentStatusDuration}
      </div>

      {/* বটম লাইন: শুধুমাত্র অফলাইন থাকলে রিজন কোড দেখাবে */}
      {!machine.isOnline && (
        <div className="mt-1 pt-1 border-t border-gray-800 flex justify-between items-center">
          <span className="text-[9px] uppercase tracking-tight text-gray-500">Reason</span>
          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1 rounded">
            {machine.reasonNumber}
          </span>
        </div>
      )}
    </motion.div>
  );
}