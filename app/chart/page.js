"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Server-Side Rendering (SSR) ডিজেবল করে ApexCharts ইমপোর্ট করা হচ্ছে
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ১০টি রিজন (N/A এবং No Operation Data সহ) এবং কালার ম্যাপিং
const REASON_MAP = {
  "0": { name: "Machine On", color: "#00E396" },            // Green
  "1": { name: "Maintenance", color: "#008FFB" },           // Blue
  "2": { name: "Needle Breakage", color: "#FEB019" },       // Orange
  "3": { name: "No Order / No Program", color: "#775DD0" },   // Purple
  "4": { name: "No Yarn", color: "#FF4560" },               // Red
  "5": { name: "Power", color: "#00D9E9" },                 // Cyan
  "6": { name: "Program Change", color: "#A5A5A5" },        // Gray
  "7": { name: "Roll Cutting", color: "#E2C044" },          // Yellow
  "8": { name: "Yarn Breakage", color: "#FF00FF" },         // Magenta
  "9": { name: "N/A", color: "#FF1A1A" },                   // Dark Red
  "10": { name: "No operation data", color: "#FFAAAA" }     // Light Pink (ফাঁকা ব্লকের জন্য)
};

export default function MachineTracker() {
  const [machineNumber, setMachineNumber] = useState('23');
  const [targetDate, setTargetDate] = useState('2026-06-30'); 
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // রাত ১২:০০ থেকে রাত ১১:৫৯ পর্যন্ত টাইমস্ট্যাম্প
  const getXAxisRange = () => {
    const minTime = new Date(`${targetDate}T00:00:00`).getTime();
    const maxTime = new Date(`${targetDate}T23:59:59`).getTime();
    return { minTime, maxTime };
  };

  const { minTime, maxTime } = getXAxisRange();

  // ডাটার মাঝখানের ফাঁকা (সাদা) অংশগুলোকে "No operation data" দিয়ে ভরাট করার ফাংশন
  const fillTimelineGaps = (rawBlocks, minT, maxT) => {
    if (rawBlocks.length === 0) {
      // যদি সারাদিনে কোনো ডাটায় না থাকে, তবে পুরো ২৪ ঘণ্টাই No operation data দেখাবে
      return [{
        x: `M-${machineNumber}`,
        y: [minT, maxT],
        fillColor: REASON_MAP["10"].color,
        reasonName: REASON_MAP["10"].name
      }];
    }

    const fullTimeline = [];
    let currentTime = minT;

    rawBlocks.forEach((block) => {
      const blockStart = new Date(block.startTime).getTime();
      const blockEnd = new Date(block.endTime).getTime();
      const reasonConfig = REASON_MAP[block.reasonNumber] || REASON_MAP["9"];

      // যদি কারেন্ট টাইম থেকে ব্লকের শুরুর সময়ের মাঝে গ্যাপ থাকে, সেখানে No Operation Data বসবে
      if (blockStart > currentTime + 1000) { 
        fullTimeline.push({
          x: `M-${block.machineNumber}`,
          y: [currentTime, blockStart],
          fillColor: REASON_MAP["10"].color,
          reasonName: REASON_MAP["10"].name
        });
      }

      // আসল ডাটা ব্লকটি পুশ করা
      fullTimeline.push({
        x: `M-${block.machineNumber}`,
        y: [blockStart, blockEnd],
        fillColor: reasonConfig.color,
        reasonName: reasonConfig.name
      });

      currentTime = blockEnd;
    });

    // শেষ ব্লকের পর থেকে রাত ১১:৫৯ পর্যন্ত যদি গ্যাপ থাকে
    if (currentTime < maxT - 1000) {
      fullTimeline.push({
        x: `M-${machineNumber}`,
        y: [currentTime, maxT],
        fillColor: REASON_MAP["10"].color,
        reasonName: REASON_MAP["10"].name
      });
    }

    return fullTimeline;
  };

  const fetchTimelineData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reason?machine=${machineNumber}&date=${targetDate}`);
      const result = await res.json();

      if (result.success && result.data) {
        // গ্যাপ ফিলিং অ্যালগরিদম অ্যাপ্লাই করা হচ্ছে
        const completedData = fillTimelineGaps(result.data, minTime, maxTime);
        setChartData([{ data: completedData }]);
      } else {
        // API থেকে ডাটা না আসলেও পুরো স্ক্রিন ফাঁকা না রেখে "No operation data" দিয়ে ভরে রাখা হবে
        const emptyDay = fillTimelineGaps([], minTime, maxTime);
        setChartData([{ data: emptyDay }]);
      }
    } catch (err) {
      setError('সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।');
      const emptyDay = fillTimelineGaps([], minTime, maxTime);
      setChartData([{ data: emptyDay }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [machineNumber, targetDate]);

  // ApexCharts অপশনস কনফিগারেশন
  const chartOptions = {
    chart: {
      type: 'rangeBar',
      toolbar: { show: false }, // টপ টুলবার হাইড করা হলো
      zoom: { enabled: false },  // ১. জুম সম্পূর্ণ বন্ধ করা হলো
      animations: { enabled: false },
      selection: { enabled: false } // ১. ড্র্যাগ ও সিলেকশন সম্পূর্ণ বন্ধ
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '55%',
        rangeBarGroupRows: true 
      }
    },
    xaxis: {
      type: 'datetime',
      min: minTime, 
      max: maxTime, 
      labels: {
        datetimeUTC: false,
        // ২. টাইম ১২ ঘণ্টার AM/PM ফরম্যাটে দেখানোর লজিক
        formatter: function(value) {
          const date = new Date(value);
          let hours = date.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12; // 0 টা কে ১২ বানানো
          return hours + ampm; // যেমন: 12AM, 2PM, 6PM
        },
        style: {
          colors: '#333',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: { style: { colors: '#333', fontWeight: 'bold' } }
    },
    // ৩. কাস্টম ডার্ক পপআপ টুলটিপ (সব ব্লকের জন্য কাজ করবে)
    tooltip: {
      enabled: true,
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const data = w.config.series[seriesIndex].data[dataPointIndex];
        
        const startDate = new Date(data.y[0]);
        const endDate = new Date(data.y[1]);

        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        const startFormatted = startDate.toLocaleString('en-US', dateOptions);
        const endFormatted = endDate.toLocaleString('en-US', dateOptions);

        const diffMs = endDate - startDate;
        const diffSec = Math.floor(diffMs / 1000);
        let durationStr = `${diffSec}sec`;
        
        if (diffSec >= 60) {
          const diffMin = Math.floor(diffSec / 60);
          const remSec = diffSec % 60;
          durationStr = remSec > 0 ? `${diffMin}min ${remSec}sec` : `${diffMin}min`;
        }

        // কাস্টম টেক্সট ও কালার কন্ডিশন
        let statusText = "Machine Off";
        let statusColor = "#FF1A1A";

        if (data.reasonName === "Machine On") {
          statusText = "Machine On";
          statusColor = "#00E396";
        } else if (data.reasonName === "No operation data") {
          statusText = "No Operation";
          statusColor = "#FFAAAA";
        }

        const reasonColor = (data.reasonName === "N/A" || data.reasonName === "No operation data") ? "#FEB019" : "#FFFFFF";

        return `
          <div style="
            background: #1C1C1E; 
            color: #FFFFFF; 
            padding: 12px 16px; 
            border-radius: 8px; 
            box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.4);
            font-family: Arial, sans-serif;
            font-size: 13px;
            line-height: 1.6;
            border: none;
          ">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px; border-bottom: 1px solid #2C2C2E; padding-bottom: 4px;">
              Machine Status
            </div>
            <div>
              <span style="color: #A5A5A5;">Status:</span> 
              <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
            </div>
            <div>
              <span style="color: #A5A5A5;">Start:</span> ${startFormatted}
            </div>
            <div>
              <span style="color: #A5A5A5;">End:</span> ${endFormatted}
            </div>
            <div>
              <span style="color: #A5A5A5;">Duration:</span> ${durationStr}
            </div>
            <div>
              <span style="color: #A5A5A5;">Reason:</span> 
              <span style="color: ${reasonColor}; font-weight: bold;">${data.reasonName}</span>
            </div>
          </div>
        `;
      }
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* ফিল্টার বার */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, color: '#333', fontSize: '20px' }}>Knitting Machine NPT Tracker</h2>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <div>
            <label style={{ marginRight: '5px', fontWeight: 'bold', color: '#333' }}>Machine:</label>
            <input 
              type="text" 
              value={machineNumber} 
              onChange={(e) => setMachineNumber(e.target.value)}
              style={{ padding: '6px', width: '60px', borderRadius: '4px', border: '1px solid #ccc', color: '#333', textAlign: 'center' }}
            />
          </div>
          <div>
            <label style={{ marginRight: '5px', fontWeight: 'bold', color: '#333' }}>Date:</label>
            <input 
              type="date" 
              value={targetDate} 
              onChange={(e) => setTargetDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', color: '#333' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* চার্ট এরিয়া */}
        <div style={{ flex: 1, minWidth: '60%', background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          {loading && <p style={{ color: '#333' }}>লোড হচ্ছে...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          
          {!loading && (
            <Chart 
              options={chartOptions} 
              series={chartData} 
              type="rangeBar" 
              height={260} 
            />
          )}
        </div>

        {/* সাইড লেজেন্ড গাইড */}
        <div style={{ width: '280px', background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '8px', color: '#333' }}>Status & Reasons</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {Object.keys(REASON_MAP).map((key) => (
              <li key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', fontSize: '13px', color: '#333' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '18px', 
                  height: '18px', 
                  backgroundColor: REASON_MAP[key].color, 
                  borderRadius: '4px', 
                  marginRight: '12px' 
                }}></span>
                {REASON_MAP[key].name}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}