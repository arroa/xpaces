import { Schema, model, models, Types } from "mongoose";

const floorSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    totalSeats: { type: Number, required: true, min: 1, max: 99 },
    totalRooms: { type: Number, required: true, min: 0, max: 99 },
    active: { type: Boolean, required: true, default: true },
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
  createdAt: Date;
  updatedAt: Date;
};

export const FloorModel = models.Floor ?? model("Floor", floorSchema);
