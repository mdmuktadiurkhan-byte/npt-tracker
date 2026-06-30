'use client';

import React, { useState, useEffect } from 'react';

// স্ট্যাটাস এবং কালার লেজেন্ডের ম্যাপিং
const STATUS_MAP = {
  "0": { label: "Machine On", color: "#00E676" }, // উজ্জ্বল সবুজ
  "1": { label: "Maintenance", color: "#2979FF" }, // নীল
  "2": { label: "Needle Breakage", color: "#FFAB91" }, // হালকা কমলা
  "3": { label: "No Order / No Program", color: "#A5D6A7" }, // ধূসর সবুজ
  "4": { label: "No Yarn", color: "#FFE082" }, // হালকা হলুদ
  "5": { label: "Power", color: "#00E5FF" }, // সায়ান/আকাশি
  "6": { label: "Program Change", color: "#C5CAE9" }, // হালকা বেগুনী
  "7": { label: "Roll Cutting", color: "#E6EE9C" }, // লেবু সবুজ
  "9": { label: "Yarn Breakage", color: "#E040FB" }, // বেগুনী
  "8": { label: "N/A", color: "#FF1744" }, // লাল
};

export default function KnittingMachineTracker() {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [machineNumber, setMachineNumber] = useState('23');
  const [targetDate, setTargetDate] = useState('2026-06-30');

  // ১. এপিআই থেকে ডেটা ফেচ করার ফাংশন
  const fetchTrackerData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/reason?machine=${machineNumber}&date=${targetDate}`);
      const json = await res.json();
      
      if (json.success && json.data) {
        const processedBlocks = [];
        const apiData = json.data;

        for (let i = 0; i < apiData.length; i++) {
          const current = apiData[i];
          const startMs = new Date(current.startTime).getTime();
          
          let endMs = current.endTime ? new Date(current.endTime).getTime() : null;
          let isLiveBlock = false;

          // যদি এটি একদম শেষ ডাটা ব্লক হয়
          if (i === apiData.length - 1) {
            // ১. যদি endTime না থাকে 
            // ২. অথবা যদি endTime আর startTime একবারে সমান হয় (অর্থাৎ এখনও রানিং কিন্তু এপিআই সেম টাইম দিচ্ছে)
            // ৩. অথবা মেশিনটি সক্রিয় (isActive === true) থাকে
            if (!current.endTime || endMs === startMs || current.isActive) {
              endMs = new Date().getTime(); // বর্তমান রিয়েল টাইম অ্যাসাইন করা হচ্ছে
              isLiveBlock = true;
            }
          } else {
            // যদি পরের কোনো ব্লক থাকে, তবে তার startTime-ই হবে এই ব্লকের endTime
            endMs = new Date(apiData[i + 1].startTime).getTime();
          }

          let duration = endMs - startMs;
          if (duration <= 0) {
            duration = 1000; 
          }

          processedBlocks.push({
            ...current,
            computedStartMs: startMs,
            computedEndMs: endMs,
            computedDurationMs: duration,
            isLiveBlock: isLiveBlock, // রিয়েল-টাইম ট্র্যাকিং ফ্ল্যাগ
            color: current.isActive ? STATUS_MAP["0"].color : (STATUS_MAP[current.reasonNumber]?.color || "#FFAB91")
          });
        }

        setTimelineData(processedBlocks);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // ২. ইনিশিয়াল লোড এবং ইনপুট চেঞ্জের জন্য এফেক্ট
  useEffect(() => {
    fetchTrackerData(true);
  }, [machineNumber, targetDate]);

  // ৩. প্রতি ১০ সেকেন্ড পর পর এপিআই অটো-রিফ্রেশ (Polling)
  useEffect(() => {
    const apiInterval = setInterval(() => {
      fetchTrackerData(false); // ব্যাকগ্রাউন্ডে রিফ্রেশ হবে, কোনো 'Loading...' স্ক্রিন আসবে না
    }, 10000); // ১০ সেকেন্ড পরপর ডাটাবেজ চেক করবে

    return () => clearInterval(apiInterval);
  }, [machineNumber, targetDate]);

  // ৪. প্রতি সেকেন্ডে স্ক্রিনের শেষ ব্লকের মিনিট-সেকেন্ড রিয়েল-টাইমে লাইভ বাড়ানোর এফেক্ট (Live Tick)
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const nowMs = new Date().getTime();

      setTimelineData(prevBlocks => {
        if (!prevBlocks || prevBlocks.length === 0) return prevBlocks;
        
        const updatedBlocks = [...prevBlocks];
        const lastIndex = updatedBlocks.length - 1;
        const lastBlock = { ...updatedBlocks[lastIndex] };

        // যদি শেষ ব্লকটি লাইভ ট্র্যাকিং মোডে থাকে, তবে ঘড়ির সাথে সাথে এর এন্ড-টাইম ও ডিউরেশন বাড়বে
        if (lastBlock.isLiveBlock) {
          lastBlock.computedEndMs = nowMs;
          lastBlock.computedDurationMs = Math.max(nowMs - lastBlock.computedStartMs, 1000);
          updatedBlocks[lastIndex] = lastBlock;
        }
        
        return updatedBlocks;
      });
    }, 1000); // প্রতি ১ সেকেন্ডে রান হয়ে টাইম যোগ করবে

    return () => clearInterval(clockInterval);
  }, []);

  const totalDurationDay = 24 * 60 * 60 * 1000;
  const timeLabels = ["12AM", "2AM", "5AM", "8AM", "10AM", "1PM", "3PM", "6PM", "9PM", "11PM"];

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}min ${seconds}sec`;
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

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 font-sans text-gray-800">
      <div className="bg-white p-6 rounded-xl shadow-sm max-w-7xl mx-auto border border-gray-100">
        
        {/* হেডার পার্ট */}
        <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-4 mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-700">Knitting Machine NPT Tracker</h2>
            <p className="text-xs text-green-600 font-medium animate-pulse mt-0.5">● Live Monitoring Connected</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Machine:</span>
              <input 
                type="text" 
                value={machineNumber} 
                onChange={(e) => setMachineNumber(e.target.value)}
                className="border border-gray-300 w-16 p-1.5 text-center rounded-lg font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Date:</span>
              <input 
                type="date" 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)}
                className="border border-gray-300 p-1.5 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* মেইন গ্রিড */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* গ্যান্ট চার্ট এরিয়া */}
          <div className="lg:col-span-3 border border-gray-100 rounded-xl px-6 pb-12 pt-32 bg-[#FCFDFE] relative">
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-400">Loading Tracker Chart...</div>
            ) : (
              <div className="min-w-[750px] relative">
                
                <div className="flex items-center relative">
                  <div className="w-16 text-xs font-bold text-gray-700 shrink-0">
                    M-5
                  </div>

                  {/* টাইমলাইন মেইন ট্র্যাকবার */}
                  <div className="flex-1 h-24 bg-gray-50 rounded-sm relative flex border border-gray-200">
                    {timelineData.map((block, index) => {
                      const widthPercent = (block.computedDurationMs / totalDurationDay) * 100;
                      
                      const statusInfo = block.isActive 
                        ? STATUS_MAP["0"] 
                        : (STATUS_MAP[block.reasonNumber] || { label: "No operation data", color: "#FFAB91" });

                      return (
                        <div
                          key={index}
                          style={{ 
                            width: `${Math.max(widthPercent, 0.15)}%`, 
                            backgroundColor: block.color 
                          }}
                          className="h-full cursor-pointer group relative"
                        >
                          {/* ================= ফিক্সড টুলটিপ (Hover Tooltip) ================= */}
                          <div className="absolute -top-40 left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#1E1E1E] text-gray-300 text-[13px] p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[9999] w-64 pointer-events-none border border-gray-800">
                            
                            <div className="space-y-1.5">
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
                          {/* ========================================================================= */}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* এক্স-অক্ষ (X-Axis) টাইম লেবেল */}
                <div className="absolute left-16 right-0 -bottom-10 flex justify-between text-xs text-gray-500 font-medium">
                  {timeLabels.map((label, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="w-[1px] h-1.5 bg-gray-300 mb-1"></div>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* ডানপাশের স্ট্যাটাস লেজেন্ড */}
          <div className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm h-fit">
            <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Status & Reasons</h3>
            <div className="space-y-3">
              {Object.entries(STATUS_MAP).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3 text-xs font-medium text-gray-600">
                  <div 
                    className="w-4 h-4 rounded-md shadow-sm shrink-0 border border-black/5" 
                    style={{ backgroundColor: value.color }}
                  ></div>
                  <span>{value.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}