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



export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db('npttracker_db');

    // ১. সমস্ত ডেটা টাইম অনুযায়ী সর্ট করে নিয়ে আসা
    const logs = await db.collection('statuses').find({}).sort({ machineNumber: 1, updatedAt: 1 }).toArray();

    if (!logs || logs.length === 0) {
      return NextResponse.json({ totalMachines: 0, data: {} }, { status: 200 });
    }

    const machineSummary = {};
    const uniqueMachines = new Set();
    const now = new Date(); // বর্তমান সময়

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

    // নির্দিষ্ট মেশিনের কোনো তারিখের অবজেক্ট ইনিশিয়ালাইজ করার হেল্পার
    const initDayData = (machine, dateStr) => {
      if (!machineSummary[machine]) machineSummary[machine] = {};
      if (!machineSummary[machine][dateStr]) {
        machineSummary[machine][dateStr] = { totalOnTimeMs: 0, totalOffTimeMs: 0 };
      }
    };

    // টাইমজোন অনুযায়ী নির্দিষ্ট টাইমের ডেট স্ট্রিং (YYYY-MM-DD) বের করার হেল্পার
    const getDateString = (dateObj) => {
      return dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    };

    // মেশিনের গ্রুপ তৈরি করা (State Machine-এর সুবিধার্থে)
    const logsByMachine = {};
    logs.forEach(log => {
      if (!logsByMachine[log.machineNumber]) logsByMachine[log.machineNumber] = [];
      logsByMachine[log.machineNumber].push(log);
      uniqueMachines.add(log.machineNumber);
    });

    // প্রতিটি মেশিনের জন্য টাইমলাইন প্রসেস করা
    for (const machine of uniqueMachines) {
      const mLogs = logsByMachine[machine] || [];
      if (mLogs.length === 0) continue;

      let lastStatus = mLogs[0].isActive;
      let lastTimestamp = new Date(mLogs[0].updatedAt).getTime();
      let lastDateStr = getDateString(new Date(lastTimestamp));

      // প্রথম লগের দিনটি ইনিশিয়াজাল করা
      initDayData(machine, lastDateStr);

      // আমরা প্রথম লগের দিনটিকে রাত ১২টা থেকেই শুরু ধরবো, পূর্বের কোনো ডেটা না থাকলে প্রথম লগের স্ট্যাটাসই প্রযোজ্য হবে
      const firstLogDate = new Date(lastTimestamp);
      const tzOffset = 6 * 60 * 60 * 1000; // BD Time UTC+6
      const firstLogBDTime = new Date(firstLogDate.getTime() + tzOffset);
      const startOfDayBD = new Date(Date.UTC(firstLogBDTime.getUTCFullYear(), firstLogBDTime.getUTCMonth(), firstLogBDTime.getUTCDate()));
      const startOfDayTimestamp = startOfDayBD.getTime() - tzOffset;

      const earlyDuration = lastTimestamp - startOfDayTimestamp;
      if (earlyDuration > 0) {
        if (lastStatus === true) {
          machineSummary[machine][lastDateStr].totalOnTimeMs += earlyDuration;
        } else {
          machineSummary[machine][lastDateStr].totalOffTimeMs += earlyDuration;
        }
      }

      // ২. লগের মধ্যবর্তী সময় ক্যালকুলেট করা (তারিখ পরিবর্তনের হিসাব সহ)
      for (let i = 1; i < mLogs.length; i++) {
        const currentTimestamp = new Date(mLogs[i].updatedAt).getTime();
        const currentDateStr = getDateString(new Date(currentTimestamp));

        let tempTimestamp = lastTimestamp;

        // যদি লগটি নতুন কোনো দিনে চলে যায় (তারিখ পরিবর্তন হয়)
        while (getDateString(new Date(tempTimestamp)) !== currentDateStr) {
          const currentDayObj = new Date(tempTimestamp);
          const currentDayBD = new Date(currentDayObj.getTime() + tzOffset);
          
          // ওই দিনের ঠিক রাত ১২টার (পরের দিনের শুরু) টাইমস্ট্যাম্প বের করা
          const nextDayStartBD = new Date(Date.UTC(currentDayBD.getUTCFullYear(), currentDayBD.getUTCMonth(), currentDayBD.getUTCTimeDate ? currentDayBD.getUTCDate() + 1 : currentDayBD.getUTCDate() + 1));
          const nextMidnightTimestamp = nextDayStartBD.getTime() - tzOffset;

          const activeDayStr = getDateString(new Date(tempTimestamp));
          initDayData(machine, activeDayStr);

          // ওই দিনের শেষ মুহূর্ত পর্যন্ত সময় যোগ করা
          const chunk = nextMidnightTimestamp - tempTimestamp;
          if (lastStatus === true) {
            machineSummary[machine][activeDayStr].totalOnTimeMs += chunk;
          } else {
            machineSummary[machine][activeDayStr].totalOffTimeMs += chunk;
          }

          tempTimestamp = nextMidnightTimestamp;
        }

        // একই তারিখে অবশিষ্ট সময়টুকু যোগ করা
        const remainingChunk = currentTimestamp - tempTimestamp;
        initDayData(machine, currentDateStr);
        if (lastStatus === true) {
          machineSummary[machine][currentDateStr].totalOnTimeMs += remainingChunk;
        } else {
          machineSummary[machine][currentDateStr].totalOffTimeMs += remainingChunk;
        }

        // পরবর্তী লুপের জন্য স্ট্যাটাস আপডেট
        lastStatus = mLogs[i].isActive;
        lastTimestamp = currentTimestamp;
        lastDateStr = currentDateStr;
      }

      // ৩. শেষ লগের পর থেকে একদম বর্তমান সময় (Now) পর্যন্ত হিসাব করা
      let tempTimestamp = lastTimestamp;
      const currentTimestampNow = now.getTime();
      const targetDateStr = getDateString(now);

      while (getDateString(new Date(tempTimestamp)) !== targetDateStr && tempTimestamp < currentTimestampNow) {
        const currentDayObj = new Date(tempTimestamp);
        const currentDayBD = new Date(currentDayObj.getTime() + tzOffset);
        const nextDayStartBD = new Date(Date.UTC(currentDayBD.getUTCFullYear(), currentDayBD.getUTCMonth(), currentDayBD.getUTCDate() + 1));
        const nextMidnightTimestamp = nextDayStartBD.getTime() - tzOffset;

        if (nextMidnightTimestamp > currentTimestampNow) break;

        const activeDayStr = getDateString(new Date(tempTimestamp));
        initDayData(machine, activeDayStr);

        const chunk = nextMidnightTimestamp - tempTimestamp;
        if (lastStatus === true) {
          machineSummary[machine][activeDayStr].totalOnTimeMs += chunk;
        } else {
          machineSummary[machine][activeDayStr].totalOffTimeMs += chunk;
        }

        tempTimestamp = nextMidnightTimestamp;
      }

      // বর্তমান দিনের শেষ অংশটুকু যোগ করা
      if (currentTimestampNow > tempTimestamp) {
        const remainingNowChunk = currentTimestampNow - tempTimestamp;
        const activeDayStr = getDateString(new Date(tempTimestamp));
        initDayData(machine, activeDayStr);

        if (lastStatus === true) {
          machineSummary[machine][activeDayStr].totalOnTimeMs += remainingNowChunk;
        } else {
          machineSummary[machine][activeDayStr].totalOffTimeMs += remainingNowChunk;
        }
      }
    }

    // ৪. ফাইনাল আউটপুট অবজেক্ট ফরম্যাট করা
    const finalData = {};
    for (const machine in machineSummary) {
      finalData[machine] = [];
      for (const date in machineSummary[machine]) {
        const dayData = machineSummary[machine][date];
        finalData[machine].push({
          date,
          onTime: formatDuration(dayData.totalOnTimeMs),
          offTime: formatDuration(dayData.totalOffTimeMs),
          onTimeMs: dayData.totalOnTimeMs,
          offTimeMs: dayData.totalOffTimeMs,
        });
      }
      // তারিখ অনুযায়ী সর্ট করে ফ্রন্টএন্ডে পাঠানো
      finalData[machine].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return NextResponse.json({
      totalMachines: uniqueMachines.size,
      data: finalData,
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}