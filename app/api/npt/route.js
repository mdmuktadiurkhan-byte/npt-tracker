import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; 

// --- POST METHOD --- (যা আছে তাই থাকবে)
export async function POST(request) {
  try {
    const client = await clientPromise;
    const db = client.db('npttracker_db'); 

    const body = await request.json();
    const { statusValue, machineNumber, reasonNumber } = body; 

    if (!machineNumber) {
      return NextResponse.json({ message: 'Machine number is required!' }, { status: 400 });
    }

    const result = await db.collection('statuses').insertOne({
      machineNumber: machineNumber,
      reasonNumber: reasonNumber, 
      isActive: statusValue,
      updatedAt: new Date()
    });

    return NextResponse.json({ message: 'Status updated successfully!', data: result }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

// --- SRE COMPATIBLE GET METHOD --- (আপনার ফরমেট অনুযায়ী পরিবর্তিত)
export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db('npttracker_db');

    // ১. সমস্ত ডেটা টাইম অনুযায়ী সর্ট করে তুলে আনা
    const logs = await db.collection('statuses').find({}).sort({ machineNumber: 1, updatedAt: 1 }).toArray();

    if (!logs || logs.length === 0) {
      return NextResponse.json({ totalMachines: 0, data: {} }, { status: 200 });
    }

    const machineSummary = {};
    const uniqueMachines = new Set();

    // মিলিসেকেন্ড ফরম্যাটার হেল্পার
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

    // ২. প্রতিটি লগের মধ্যবর্তী সময় ক্যালকুলেট করা (তারিখ ভিত্তিক)
    logs.forEach((log) => {
      const machine = log.machineNumber;
      uniqueMachines.add(machine);

      const dateStr = new Date(log.updatedAt).toISOString().split('T')[0]; // YYYY-MM-DD

      if (!machineSummary[machine]) {
        machineSummary[machine] = {};
      }
      if (!machineSummary[machine][dateStr]) {
        machineSummary[machine][dateStr] = {
          totalOnTimeMs: 0,
          totalOffTimeMs: 0,
          lastStatus: null,
          lastTimestamp: null,
        };
      }

      const currentDayData = machineSummary[machine][dateStr];
      const currentTimestamp = new Date(log.updatedAt).getTime();

      if (currentDayData.lastTimestamp !== null) {
        const duration = currentTimestamp - currentDayData.lastTimestamp;
        if (currentDayData.lastStatus === true) {
          currentDayData.totalOnTimeMs += duration;
        } else {
          currentDayData.totalOffTimeMs += duration;
        }
      }

      currentDayData.lastStatus = log.isActive;
      currentDayData.lastTimestamp = currentTimestamp;
    });

    // ৩. আপনার চাওয়া অবজেক্ট স্ট্রাকচারে রূপান্তর (`data: { "25": [...] }`)
    const finalData = {};
    for (const machine in machineSummary) {
      finalData[machine] = [];
      for (const date in machineSummary[machine]) {
        const dayData = machineSummary[machine][date];
        finalData[machine].push({
          date,
          onTime: formatDuration(dayData.totalOnTimeMs),
          offTime: formatDuration(dayData.totalOffTimeMs),
        });
      }
    }

    // আপনার ড্যাশবোর্ডের সাথে মিল রেখে রেসপন্স পাঠানো হচ্ছে
    return NextResponse.json({
      totalMachines: uniqueMachines.size,
      data: finalData, 
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}