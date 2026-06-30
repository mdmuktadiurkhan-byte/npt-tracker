'use client';

import React, { useState, useEffect } from 'react';

export default function MachineDashboard() {
  const [machineNumber, setMachineNumber] = useState('23');
  const [groupedData, setGroupedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API থেকে ডেটা নিয়ে আসার ফাংশন
  const fetchLogs = async (machine) => {
    setLoading(true);
    setError(null);
    try {
      // আপনার তৈরি করা API রুট (প্রয়োজনে রুট পাথ ঠিক করে নিন, যেমন: /api/machine-logs)
      // ১৭ নম্বর লাইনে এটি পরিবর্তন করুন:
const res = await fetch(`/api/one-machine?machine=${machine}`);
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'ডেটা লোড করতে সমস্যা হয়েছে');
      }

      // তারিখ অনুযায়ী ডেটা গ্রুপ এবং সামারি তৈরি করার লজিক
      processAndGroupData(result.data);
    } catch (err) {
      setError(err.message);
      setGroupedData({});
    } finally {
      setLoading(false);
    }
  };

  // ডেটা প্রসেস করে দিনভিত্তিক সামারি ও লগ আলাদা করার ফাংশন
  const processAndGroupData = (logs) => {
    const groups = {};

    // ১. প্রথমে লগের সিকোয়েন্স সোজা করার জন্য পুরাতন থেকে নতুন ক্রমানুসারে সাজাই (ক্যালকুলেশনের সুবিধার্থে)
    const sortedLogs = [...logs].reverse();

    // ২. প্রতিটি লগ প্রসেস করি
    sortedLogs.forEach((log, index) => {
      // bdLocalTime থেকে শুধু তারিখটা আলাদা করি (YYYY-MM-DD)
      const dateKey = log.bdLocalTime.split(',')[0]; 

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          totalOnTimeMs: 0,
          totalOffTimeMs: 0,
          logsList: [], // ওই দিনের প্রতিটা লগের ডিটেইলস
          lastTimestamp: null,
          lastStatus: null
        };
      }

      const currentDay = groups[dateKey];
      const currentTimestamp = new Date(log.utcTime).getTime();

      // দুই লগের মাঝখানের সময় হিসাব
      if (currentDay.lastTimestamp !== null) {
        const duration = currentTimestamp - currentDay.lastTimestamp;
        if (currentDay.lastStatus === true) {
          currentDay.totalOnTimeMs += duration;
        } else {
          currentDay.totalOffTimeMs += duration;
        }
      }

      currentDay.lastStatus = log.isActive;
      currentDay.lastTimestamp = currentTimestamp;

      // লগের লিস্টে পুশ করি (UI তে দেখানোর জন্য আবার লেটেস্টটা উপরে রাখবো)
      currentDay.logsList.unshift(log);
    });

    // ৩. শেষ লগের পর থেকে বর্তমান সময় পর্যন্ত সময় যোগ করা (আজকের দিনের জন্য)
    const nowTimestamp = new Date().getTime();
    const todayStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }).split(',')[0];

    if (groups[todayStr] && groups[todayStr].lastTimestamp !== null) {
      const trailingDuration = nowTimestamp - groups[todayStr].lastTimestamp;
      if (trailingDuration > 0) {
        if (groups[todayStr].lastStatus === true) {
          groups[todayStr].totalOnTimeMs += trailingDuration;
        } else {
          groups[todayStr].totalOffTimeMs += trailingDuration;
        }
      }
    }

    setGroupedData(groups);
  };

  // মিলিসেকেন্ড থেকে সুন্দর ফরম্যাট (Hours, Minutes, Seconds) বানানোর হেল্পার
  const formatDuration = (ms) => {
    if (ms <= 0) return "0s";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let result = "";
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0) result += `${minutes}m `;
    result += `${seconds}s`;
    return result.trim();
  };

  // পেজ লোড হলে ডেটা কল হবে
  useEffect(() => {
    fetchLogs(machineNumber);
  }, [machineNumber]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl shadow-sm mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">মেশিন অ্যাক্টিভিটি ট্র্যাকার</h1>
            <p className="text-sm text-gray-500 mt-1">তারিখ অনুযায়ী সকল ডেটা এবং সামারি রিপোর্ট</p>
          </div>
          
          {/* Machine Selection Input */}
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <label className="font-medium text-gray-700">মেশিন নম্বর:</label>
            <input 
              type="text" 
              value={machineNumber} 
              onChange={(e) => setMachineNumber(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 w-24 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
            <button 
              onClick={() => fetchLogs(machineNumber)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && <div className="text-center py-10 font-medium text-gray-600">ডেটা লোড হচ্ছে, দয়া করে অপেক্ষা করুন...</div>}
        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center border border-red-200 mb-6 font-medium">{error}</div>}

        {/* Date-wise Main List */}
        {!loading && !error && Object.keys(groupedData).length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl shadow-sm text-gray-500">কোনো ডেটা পাওয়া যায়নি।</div>
        )}

        {/* দিনভিত্তিক লুপ */}
        {Object.values(groupedData).reverse().map((dayData) => (
          <div key={dayData.date} className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden border border-gray-200">
            
            {/* ১. তারিখ ও সামারি সেকশন (Summary Section) */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                📅 তারিখ: <span className="text-gray-800">{dayData.date}</span>
              </h2>
              
              {/* Summary Cards */}
              <div className="flex gap-4">
                <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-1.5 rounded-lg text-sm">
                  <span className="font-semibold block sm:inline">Total ON Time:</span> {formatDuration(dayData.totalOnTimeMs)}
                </div>
                <div className="bg-orange-100 border border-orange-200 text-orange-800 px-4 py-1.5 rounded-lg text-sm">
                  <span className="font-semibold block sm:inline">Total OFF Time:</span> {formatDuration(dayData.totalOffTimeMs)}
                </div>
              </div>
            </div>

            {/* ২. লগের বিস্তারিত টেবিল (Detailed Logs Table) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
                    <th className="px-6 py-3">সময় (Local Time)</th>
                    <th className="px-6 py-3">স্ট্যাটাস</th>
                    <th className="px-6 py-3">কারণ নম্বর (Reason)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {dayData.logsList.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium">
                        {log.bdLocalTime.split(',')[1]?.trim() || log.bdLocalTime}
                      </td>
                      <td className="px-6 py-3.5">
                        {log.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> ON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span> OFF
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-500">
                        {log.reasonNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        ))}

      </div>
    </div>
  );
}