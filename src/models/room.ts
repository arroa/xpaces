import { Schema, model, models, Types } from "mongoose";

const roomSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
    code: { type: String, required: true, trim: true },
    position: {
      x: { type: Number, default: null },
      y: { type: Number, default: null },
    },
    capacidad: { type: Number, required: true, min: 1 },
    medios: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

roomSchema.index({ floorId: 1, code: 1 }, { unique: true });

export type RoomDocument = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  floorId: Types.ObjectId;
  code: string;
  position: { x: number | null; y: number | null };
  capacidad: number;
  medios: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const RoomModel = models.Room ?? model("Room", roomSchema);
