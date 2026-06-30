import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; 

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db('npttracker_db');

    // URL থেকে machine parameter টি নেওয়া হচ্ছে (যেমন: /api/machine-logs?machine=23)
    // যদি কিছু পাস না করা হয়, তবে ডিফল্ট হিসেবে '23' নম্বর মেশিনের ডেটা দেখাবে
    const { searchParams } = new URL(request.url);
    const machineNumber = searchParams.get('machine') || '23';

    // নির্দিষ্ট মেশিনের সকল ডেটা নতুন থেকে পুরাতন (Descending Order) ক্রমানুসারে খোঁজা হচ্ছে
    const logs = await db.collection('statuses')
      .find({ machineNumber: machineNumber })
      .sort({ updatedAt: -1 }) // -1 দেওয়ায় একদম লেটেস্ট ডেটা সবার উপরে দেখাবে
      .toArray();

    // ডেটা না পাওয়া গেলে
    if (!logs || logs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: `Machine ${machineNumber} এর কোনো ডেটা পাওয়া যায়নি!` 
      }, { status: 404 });
    }

    // বাংলাদেশ সময় (Asia/Dhaka) অনুযায়ী ডেটা ফরম্যাট করার হেল্পার ফাংশন
    const formattedLogs = logs.map(log => ({
      id: log._id,
      machineNumber: log.machineNumber,
      reasonNumber: log.reasonNumber || "0",
      isActive: log.isActive,
      utcTime: log.updatedAt,
      // আপনার বোঝার সুবিধার্থে বাংলাদেশ লোকাল টাইম ফরম্যাট যোগ করা হলো
      bdLocalTime: new Date(log.updatedAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
    }));

    // রেসপন্স পাঠানো
    return NextResponse.json({
      success: true,
      machineNumber: machineNumber,
      totalLogs: formattedLogs.length,
      data: formattedLogs
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