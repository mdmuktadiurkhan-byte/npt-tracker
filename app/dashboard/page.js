'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MachineDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(true); // থিম স্টেট
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/npt-status" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Chart", href: "/chart" },
  ];

  const TARGET_MACHINE = "5";
  const REFRESH_INTERVAL = 10000; // ১০ সেকেন্ড পর পর রিফ্রেশ হবে (মিলিসেকেন্ডে)

  // সিস্টেম থিম ডিটেক্ট করার জন্য ইফেক্ট
  useEffect(() => {
    const systemThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkMode(systemThemeMediaQuery.matches);
    const handleThemeChange = (e) => setDarkMode(e.matches);
    systemThemeMediaQuery.addEventListener("change", handleThemeChange);
    return () => systemThemeMediaQuery.removeEventListener("change", handleThemeChange);
  }, []);

  // ডাটা ফেচিং এবং অটো-রিফ্রেশ ইফেক্ট
  useEffect(() => {
    async function fetchData(isInitial = false) {
      if (isInitial) setLoading(true); // প্রথমবার লোড হওয়ার সময় স্পিনার দেখাবে
      try {
        const res = await fetch('/api/npt'); 
        if (!res.ok) throw new Error('Failed to load data from the server.');
        const result = await res.json();
        setSummary(result);
        setError(null); // ডাটা সফলভাবে আসলে আগের এরর ক্লিয়ার হবে
      } catch (err) {
        setError(err.message);
      } finally {
        if (isInitial) setLoading(false);
      }
    }

    // প্রথমবার পেজ লোড হলে কল হবে
    fetchData(true);

    // নির্দিষ্ট সময় পর পর অটো কল হওয়ার জন্য টাইমার সেটআপ
    const interval = setInterval(() => {
      fetchData(false); // ব্যাকগ্রাউন্ডে ডাটা রিফ্রেশ হবে, ফুল স্ক্রিন লোডিং দেখাবে না
    }, REFRESH_INTERVAL);

    // কম্পোনেন্ট আনমাউন্ট হলে টাইমারটি ক্লিয়ার হবে
    return () => clearInterval(interval);
  }, []);

  const calculatePercentages = (onTimeMs, offTimeMs) => {
    const on = onTimeMs || 0;
    const off = offTimeMs || 0;
    const total = on + off;
    if (total === 0) return { onPct: '0%', offPct: '0%' };
    return {
      onPct: ((on / total) * 100).toFixed(1) + '%',
      offPct: ((off / total) * 100).toFixed(1) + '%'
    };
  };

  const formatDateWithMonthName = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Loading View
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${darkMode ? "bg-gray-950 text-gray-300" : "bg-gray-50 text-gray-600"}`}>
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-medium">Loading summary data, please wait...</p>
      </div>
    );
  }

  // Error View
  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen p-4 ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}>
        <div className={`border px-6 py-4 rounded-xl shadow-sm text-center max-w-md ${
          darkMode ? "bg-red-950/20 border-red-900 text-red-400" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <p className="font-bold text-lg mb-1">An unexpected error occurred</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Empty State View
  if (!summary || summary.totalMachines === 0 || !summary.data || Object.keys(summary.data).length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-screen p-4 ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}>
        <div className={`border p-8 rounded-2xl shadow-sm text-center max-w-md ${
          darkMode ? "bg-gray-900 border-gray-800 text-gray-300" : "bg-white border-gray-200 text-gray-700"
        }`}>
          <div className="text-gray-400 mb-3 text-5xl">📊</div>
          <p className="text-lg font-semibold">No data records found</p>
          <p className="text-sm text-gray-500 mt-1">The 'statuses' data collection appears to be empty.</p>
        </div>
      </div>
    );
  }

  const filteredMachineKeys = Object.keys(summary.data).filter(
    (machineNumber) => machineNumber === TARGET_MACHINE
  );

  if (filteredMachineKeys.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-screen p-4 ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}>
        <div className={`border p-8 rounded-2xl shadow-sm text-center max-w-md ${
          darkMode ? "bg-gray-900 border-gray-800 text-gray-300" : "bg-white border-gray-200 text-gray-700"
        }`}>
          <div className="text-amber-500 mb-3 text-5xl">⚠️</div>
          <p className="text-lg font-semibold">Machine {TARGET_MACHINE} Not Found</p>
          <p className="text-sm text-gray-500 mt-1">Currently, there are no activity records available for Machine {TARGET_MACHINE}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-8 min-h-screen font-sans transition-colors duration-300 ${
      darkMode ? "bg-gray-950 text-slate-100" : "bg-gray-50 text-gray-900"
    }`}>
      
      {/* হেডার পার্ট এবং নেভিগেশন */}
      <header className={`mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center max-w-6xl mx-auto border-b pb-3 ${
        darkMode ? "border-gray-800" : "border-gray-200"
      }`}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Machine Activity Dashboard
          </h1>
          <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Historical overview of total ON and OFF runtime parameters for Machine {TARGET_MACHINE}.
          </p>
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

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Total Metric Card */}
        <div className={`p-4 rounded-2xl border flex items-center gap-4 w-full sm:w-fit min-w-[200px] ${
          darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div className={`p-3 rounded-xl ${darkMode ? "bg-indigo-950 text-indigo-400" : "bg-blue-50 text-blue-600"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active View</p>
            <p className="text-2xl font-black">1 Machine</p>
          </div>
        </div>

        {/* Structured Machine Timelines */}
        <div className="grid grid-cols-1 gap-8">
          {filteredMachineKeys.map((machineNumber) => {
            const sortedData = [...summary.data[machineNumber]].sort(
              (a, b) => new Date(b.date) - new Date(a.date)
            );

            return (
              <div key={machineNumber} className={`rounded-2xl border overflow-hidden transition-all hover:shadow-md ${
                darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100 shadow-sm"
              }`}>
                
                {/* Component Item Title */}
                <div className={`px-6 py-4 border-b flex items-center gap-3 ${
                  darkMode ? "bg-gray-900/40 border-gray-800" : "bg-gradient-to-r from-gray-50 to-white border-gray-100"
                }`}>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                  <h2 className="text-base font-bold">
                    Machine ID: <span className="text-blue-500 font-mono text-xl">{machineNumber}</span>
                  </h2>
                </div>

                {/* Metrics Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className={darkMode ? "bg-gray-950/40" : "bg-gray-50/70"}>
                      <tr>
                        <th scope="col" className={`px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-green-500 uppercase tracking-wider">
                          🟢 Total ON Duration
                        </th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-red-500 uppercase tracking-wider">
                          🔴 Total OFF Duration
                        </th>
                      </tr>
                    </thead>
                    
                    <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
                      {sortedData.map((row, idx) => {
                        const { onPct, offPct } = calculatePercentages(row.onTimeMs, row.offTimeMs);

                        return (
                          <tr key={idx} className={darkMode ? "hover:bg-gray-800/40" : "hover:bg-gray-50/50"}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                              {formatDateWithMonthName(row.date)}
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${
                                  darkMode ? "bg-green-950/20 border-green-900 text-green-400" : "bg-green-50 border-green-200 text-green-700"
                                }`}>
                                  {row.onTime}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                  darkMode ? "bg-green-900/30 text-green-400" : "bg-green-100/50 text-green-600"
                                }`}>
                                  {onPct}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${
                                  darkMode ? "bg-red-950/20 border-red-900 text-red-400" : "bg-red-50 border-red-200 text-red-700"
                                }`}>
                                  {row.offTime}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                  darkMode ? "bg-red-900/30 text-red-400" : "bg-red-100/50 text-red-600"
                                }`}>
                                  {offPct}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}