import { Schema, model, models, Types } from "mongoose";

const buildingSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

buildingSchema.index({ organizationId: 1, active: 1 });

export type BuildingDocument = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const BuildingModel = models.Building ?? model("Building", buildingSchema);
