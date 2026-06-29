// /models/Status.js
import mongoose from 'mongoose';

const StatusSchema = new mongoose.Schema({
  machineNumber: {
    type: String,
    required: true,
  },

  reasonNumber: {
    type: String, // প্রয়োজন হলে Number ব্যবহার করতে পারেন
    
  },

  isActive: {
    type: Boolean,
    required: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Status || mongoose.model('Status', StatusSchema);