import { Schema, model, models, Types } from "mongoose";

const viewerFloorAccessSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
  },
  { timestamps: true },
);

viewerFloorAccessSchema.index({ userId: 1, floorId: 1 }, { unique: true });
viewerFloorAccessSchema.index({ organizationId: 1, userId: 1 });
viewerFloorAccessSchema.index({ floorId: 1 });

export type ViewerFloorAccessDocument = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  floorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ViewerFloorAccessModel =
  models.ViewerFloorAccess ?? model("ViewerFloorAccess", viewerFloorAccessSchema);
