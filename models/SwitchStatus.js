import mongoose from "mongoose";

const SwitchStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["ON", "OFF"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SwitchStatus ||
  mongoose.model("SwitchStatus", SwitchStatusSchema);