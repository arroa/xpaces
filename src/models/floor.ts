import { Schema, model, models, Types } from "mongoose";

const floorSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    totalSeats: { type: Number, required: true, min: 1, max: 150 },
    totalRooms: { type: Number, required: true, min: 0, max: 99 },
    active: { type: Boolean, required: true, default: true },
    layoutPositionSpace: {
      type: String,
      enum: ["container", "image"],
      default: "container",
    },
  },
  { timestamps: true },
);

floorSchema.index({ buildingId: 1, active: 1 });
floorSchema.index({ organizationId: 1 });

export type FloorDocument = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  buildingId: Types.ObjectId;
  name: string;
  imageUrl: string;
  imagePublicId: string;
  totalSeats: number;
  totalRooms: number;
  active: boolean;
  layoutPositionSpace: "container" | "image";
  createdAt: Date;
  updatedAt: Date;
};

export const FloorModel = models.Floor ?? model("Floor", floorSchema);
