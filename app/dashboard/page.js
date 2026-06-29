'use client';

import { useEffect, useState } from 'react';

export default function MachineDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/npt'); 
        if (!res.ok) throw new Error('Failed to load data from the server.');
        const result = await res.json();
        setSummary(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Percentage Calculation Helper Function
  const calculatePercentages = (onTime, offTime) => {
    // অন এবং অফ টাইম যদি স্ট্রিং আকারে থাকে (যেমন: "12" বা "12h"), তা থেকে সংখ্যা বের করার জন্য parseFloat ব্যবহার করা হয়েছে
    const on = parseFloat(onTime) || 0;
    const off = parseFloat(offTime) || 0;
    const total = on + off;

    if (total === 0) return { onPct: '0%', offPct: '0%' };

    const onPct = ((on / total) * 100).toFixed(1) + '%';
    const offPct = ((off / total) * 100).toFixed(1) + '%';

    return { onPct, offPct };
  };

  // Loading View
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading summary data, please wait...</p>
      </div>
    );
  }

  // Error View
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm text-center max-w-md">
          <p className="font-bold text-lg mb-1">An unexpected error occurred</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Empty State View
  if (!summary || summary.totalMachines === 0 || !summary.data || Object.keys(summary.data).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm text-center max-w-md">
          <div className="text-gray-400 mb-3 text-5xl">📊</div>
          <p className="text-gray-700 text-lg font-semibold">No data records found</p>
          <p className="text-gray-500 text-sm mt-1">The 'statuses' data collection appears to be empty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen font-sans">
      
      {/* Header Summary section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
            Machine Activity Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historical overview of total ON and OFF runtime parameters per machine unit.
          </p>
        </div>
        
        {/* Total Metric Card */}
        <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4 min-w-[200px]">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Machines</p>
            <p className="text-3xl font-black text-gray-800">{summary.totalMachines}</p>
          </div>
        </div>
      </div>

      {/* Structured Machine Timelines */}
      <div className="grid grid-cols-1 gap-8">
        {Object.keys(summary.data).map((machineNumber) => (
          <div key={machineNumber} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
            
            {/* Component Item Title */}
            <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <h2 className="text-lg font-bold text-gray-700">
                Machine ID: <span className="text-blue-600 font-mono text-xl">{machineNumber}</span>
              </h2>
            </div>

            {/* Metrics Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-green-600 uppercase tracking-wider">
                      🟢 Total ON Duration
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-red-600 uppercase tracking-wider">
                      🔴 Total OFF Duration
                    </th>
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-100">
                  {summary.data[machineNumber].map((row, idx) => {
                    // প্রতিটি রো-এর জন্য পার্সেন্টেজ ক্যালকুলেট করা হচ্ছে
                    const { onPct, offPct } = calculatePercentages(row.onTime, row.offTime);

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        {/* Date Output */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                          {row.date}
                        </td>
                        
                        {/* Active ON Runtime Label & Percentage */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200 shadow-2xs">
                              {row.onTime}
                            </span>
                            <span className="text-xs font-semibold text-green-600 bg-green-100/50 px-2 py-0.5 rounded-md">
                              {onPct}
                            </span>
                          </div>
                        </td>
                        
                        {/* Inactive OFF Runtime Label & Percentage */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
                              {row.offTime}
                            </span>
                            <span className="text-xs font-semibold text-red-600 bg-red-100/50 px-2 py-0.5 rounded-md">
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
        ))}
      </div>

    </div>
  );
}