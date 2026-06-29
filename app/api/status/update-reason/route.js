import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function PUT(request) {
  try {
    // Request body theke JSON data extract kora
    const body = await request.json();
    const { machineNumber, reasonNumber } = body;

    // Validation: Data check kora
    if (!machineNumber || reasonNumber === undefined) {
      return NextResponse.json(
        { success: false, message: "machineNumber and reasonNumber are required." },
        { status: 400 }
      );
    }

    // 1. Database connection nawa
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('statuses'); // Mongoose model dynamic vabe 'statuses' name collection toiri kore

    // 2. Sorbosesh (latest) document khuje ber kora jeti 'isActive: false'
    // .sort({ updatedAt: -1 }) ebong .limit(1) diye shobcheye sesher data-ti ana hoyeche
    const latestOfflineStatus = await collection
      .find({ machineNumber: machineNumber, isActive: false })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray();

    // Jodi kono offline data na paowa jay
    if (!latestOfflineStatus || latestOfflineStatus.length === 0) {
      return NextResponse.json(
        { success: false, message: "No offline status found for this machine to update." },
        { status: 404 }
      );
    }

    // Khuje paowa target document er ID extract kora
    const targetDocumentId = latestOfflineStatus[0]._id;

    // 3. Nirdishto oi unique _id dhore 'reasonNumber' update kora
    const updateResult = await collection.updateOne(
      { _id: targetDocumentId },
      { 
        $set: { 
          reasonNumber: reasonNumber,
          updatedAt: new Date() // Server time onusare update er somoy tracking
        } 
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Latest offline status reason updated successfully.",
        modifiedCount: updateResult.modifiedCount
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating reason:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}