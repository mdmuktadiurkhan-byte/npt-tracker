//api/status
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; 

// --- POST METHOD ---
export async function POST(request) {
  try {
    const client = await clientPromise;
    const db = client.db('npttracker_db'); 

    const body = await request.json();
    const { statusValue, machineNumber, reasonNumber } = body; 

    // ভ্যালিডেশন
    if (!machineNumber) {
      return NextResponse.json(
        { message: 'Machine number is required!' },
        { status: 400 }
      );
    }

    // --- লজিক ১: রিমোটের ডাটা আপডেট (যখন statusValue পাঠানো হয়নি) ---
    if (statusValue === undefined) {
      // এই মেশিন নম্বরের সর্বশেষ "isActive: false" ডকুমেন্টটি খুঁজে বের করা
      const lastFalseStatus = await db.collection('statuses')
        .find({ machineNumber: machineNumber, isActive: false })
        .sort({ updatedAt: -1 }) // সর্বশেষ ডাটা পাওয়ার জন্য সর্ট করা
        .limit(1)
        .toArray();

      if (lastFalseStatus.length > 0) {
        const targetId = lastFalseStatus[0]._id;

        // ডকুমেন্টটির reasonNumber এবং updatedAt আপডেট করা
        const updateResult = await db.collection('statuses').updateOne(
          { _id: targetId },
          { 
            $set: { 
              reasonNumber: String(reasonNumber),
              updatedAt: new Date()
            } 
          }
        );

        return NextResponse.json(
          { message: 'Reason updated successfully for last inactive status!', data: updateResult },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { message: 'No inactive status found to update for this machine.' },
          { status: 404 }
        );
      }
    }

    // --- লজিক ২: নতুন স্ট্যাটাস ইনসার্ট (মেশিন ON/OFF হওয়ার সময়ের আগের লজিক) ---
    const finalReasonNumber = reasonNumber !== undefined ? String(reasonNumber) : "0";

    const insertResult = await db.collection('statuses').insertOne({
      machineNumber: machineNumber,
      reasonNumber: finalReasonNumber, 
      isActive: statusValue,
      updatedAt: new Date()
    });

    return NextResponse.json(
      { message: 'New status created successfully!', data: insertResult },
      { status: 201 }
    );

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}

// --- GET METHOD ---
export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db('npttracker_db');

    // ১. ডাটাবেজে থাকা সমস্ত ইউনিক মেশিন নম্বরের লিস্ট নেওয়া
    const uniqueMachines = await db.collection('statuses').distinct('machineNumber');

    if (!uniqueMachines || uniqueMachines.length === 0) {
      return NextResponse.json({ message: 'No machines found' }, { status: 404 });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const allMachinesReport = [];

    // মিলিসেকেন্ড থেকে ঘণ্টায় রূপান্তর করার হেল্পার ফাংশন
    const msToHoursAndMins = (ms) => {
      const totalMinutes = Math.floor(ms / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    };

    // ২. প্রতিটি মেশিনের জন্য লুপ চালিয়ে ডেটা ক্যালকুলেট করা
    for (const machineNumber of uniqueMachines) {
      
      // সবশেষ স্ট্যাটাস ও রিজন বের করা (updatedAt এর বদলে _id দিয়ে সর্ট করা হয়েছে)
      const latestLogs = await db.collection('statuses')
        .find({ machineNumber })
        .sort({ _id: -1 }) 
        .limit(1)
        .toArray();

      if (latestLogs.length === 0) continue;

      const currentLog = latestLogs[0];
      const isCurrentActive = currentLog.isActive;
      const currentReasonNumber = currentLog.reasonNumber; // বর্তমান রিজন নম্বর ট্র্যাক করা
      
      // সর্বশেষ অবস্থা কতক্ষণ ধরে আছে
      const currentStatusDuration = new Date() - new Date(currentLog.updatedAt);

      // গত ২৪ ঘণ্টার লগসমূহ (ডেটাবেজে updatedAt স্ট্রিং থাকায় .toISOString() ব্যবহার করা হয়েছে)
      const dayLogs = await db.collection('statuses')
        .find({
          machineNumber,
          updatedAt: { $gte: twentyFourHoursAgo.toISOString() }
        })
        .sort({ _id: 1 })
        .toArray();

      let totalOnTime = 0;
      let totalOffTime = 0;
      let lastTime = twentyFourHoursAgo;
      let lastState = isCurrentActive; 

      if (dayLogs.length > 0) {
        // প্রথম লগের আগের স্টেট জানার জন্য তার ঠিক আগের রেকর্ডটা চেক করা
        const priorLog = await db.collection('statuses')
          .find({ 
            machineNumber, 
            updatedAt: { $lt: twentyFourHoursAgo.toISOString() } 
          })
          .sort({ _id: -1 })
          .limit(1)
          .toArray();
        
        if (priorLog.length > 0) {
          lastState = priorLog[0].isActive;
        } else {
          lastState = dayLogs[0].isActive;
        }

        dayLogs.forEach((log) => {
          const currentTime = new Date(log.updatedAt);
          const duration = currentTime - lastTime;

          if (lastState) {
            totalOnTime += duration;
          } else {
            totalOffTime += duration;
          }

          lastTime = currentTime;
          lastState = log.isActive;
        });
      }

      // শেষ লগ থেকে একদম বর্তমান মুহূর্ত পর্যন্ত হিসাব যোগ করা
      const finalDuration = new Date() - lastTime;
      if (lastState) {
        totalOnTime += finalDuration;
      } else {
        totalOffTime += finalDuration;
      }

      // ড্যাশবোর্ডের অ্যারেতে পুশ করা
      allMachinesReport.push({
        machineNumber,
        isOnline: isCurrentActive,
        reasonNumber: currentReasonNumber || 'N/A',
        currentStatusDuration: msToHoursAndMins(currentStatusDuration),
        lastUpdated: currentLog.updatedAt,
        twentyFourHoursSummary: {
          onTime: msToHoursAndMins(totalOnTime),
          offTime: msToHoursAndMins(totalOffTime),
        }
      });
    }

    // মেশিন নম্বর অনুযায়ী সিরিয়াল সর্ট করা
    allMachinesReport.sort((a, b) => a.machineNumber.localeCompare(b.machineNumber, undefined, { numeric: true }));

    return NextResponse.json({ machines: allMachinesReport }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}