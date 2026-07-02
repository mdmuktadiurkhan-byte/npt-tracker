import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db('npttracker_db');

    // URL থেকে কোয়েরি প্যারামিটার নেওয়া (যেমন: /api/machine-timeline?date=2026-06-30&machine=23)
    const { searchParams } = new URL(request.url);
    const machineNumber = searchParams.get('machine') || '5';
    const targetDateStr = searchParams.get('date'); // format: YYYY-MM-DD

    // ফিল্টার অবজেক্ট তৈরি
    let query = { machineNumber: machineNumber };

    // যদি ডেট পাস করা হয়, তবে ওই নির্দিষ্ট দিনের (BD Timezone অনুযায়ী) ডেটা ফিল্টার হবে
    // যদি ডেট পাস করা হয়, তবে ওই নির্দিষ্ট দিনের (BD Timezone অনুযায়ী) ডেটা ফিল্টার হবে
if (targetDateStr) {
  // বাংলাদেশ সময় অনুযায়ী দিনের শুরু (যেমন: 2026-07-02 00:00:00 GMT+0600)
  // এটি নিজে নিজেই UTC-তে কনভার্ট হয়ে সঠিক টাইম তৈরি করবে (যা আসলে আগের দিনের 18:00:00 UTC)
  const startOfDay = new Date(`${targetDateStr}T00:00:00+06:00`);
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999+06:00`);
  
  query.updatedAt = { $gte: startOfDay, $lte: endOfDay };
}

    // ডেটা পুরাতন থেকে নতুন (Ascending) ক্রমানুসারে সর্ট করা দরকার টাইমলাইন বানানোর জন্য
    const logs = await db.collection('statuses')
      .find(query)
      .sort({ updatedAt: 1 }) 
      .toArray();

    if (!logs || logs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: `Machine ${machineNumber} এর কোনো ডেটা পাওয়া যায়নি!` 
      }, { status: 404 });
    }

    // --- টাইমলাইন ব্লক প্রসেসিং অ্যালগরিদম ---
    const timelineData = [];
    let currentBlock = null;

    logs.forEach((log) => {
      const logTime = new Date(log.updatedAt);
      const reason = log.isActive ? "0" : (log.reasonNumber || "9"); // isActive true হলে অটোমেটিক "0" (Machine On)

      // প্রথম রেকর্ডের জন্য ব্লক শুরু করা
      if (!currentBlock) {
        currentBlock = {
          machineNumber: log.machineNumber,
          reasonNumber: reason,
          isActive: log.isActive,
          startTime: logTime,
          endTime: logTime // সাময়িকভাবে এটাই এন্ড টাইম
        };
      } else {
        // যদি পর পর একই স্ট্যাটাস এবং একই রিজন আসে, তবে কারেন্ট ব্লকের এন্ড টাইম বাড়িয়ে দেওয়া হবে
        if (currentBlock.isActive === log.isActive && currentBlock.reasonNumber === reason) {
          currentBlock.endTime = logTime;
        } else {
          // স্ট্যাটাস বা রিজন পরিবর্তন হলে আগের ব্লকটি পুশ করে নতুন ব্লক শুরু হবে
          timelineData.push({
            ...currentBlock,
            bdStartTime: currentBlock.startTime.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
            bdEndTime: currentBlock.endTime.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
            durationMs: currentBlock.endTime - currentBlock.startTime // মিলিসেকেন্ডে ডিউরেশন
          });

          currentBlock = {
            machineNumber: log.machineNumber,
            reasonNumber: reason,
            isActive: log.isActive,
            startTime: logTime,
            endTime: logTime
          };
        }
      }
    });

    // শেষ ব্লকটি পুশ করা
    if (currentBlock) {
      timelineData.push({
        ...currentBlock,
        bdStartTime: currentBlock.startTime.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
        bdEndTime: currentBlock.endTime.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
        durationMs: currentBlock.endTime - currentBlock.startTime
      });
    }

    // রেসপন্স পাঠানো
    return NextResponse.json({
      success: true,
      machineNumber: machineNumber,
      totalTimelineBlocks: timelineData.length,
      data: timelineData
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error', 
      error: error.message 
    }, { status: 500 });
  }
}