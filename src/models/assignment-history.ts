import { Schema, model, models, Types } from "mongoose";

const assignmentHistorySchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
    seatId: { type: Schema.Types.ObjectId, ref: "Seat", required: true },
    seatCode: { type: String, required: true },
    persona: { type: String, default: "" },
    grupo: { type: String, default: "" },
    equipo: { type: String, default: "" },
    empresa: { type: String, default: "" },
    estado: { type: String, enum: ["disponible", "ocupado"], required: true },
    action: { type: String, enum: ["assign", "release", "move", "update"], required: true },
    changedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

assignmentHistorySchema.index({ seatId: 1, createdAt: -1 });
assignmentHistorySchema.index({ floorId: 1, createdAt: -1 });

export type AssignmentHistoryDocument = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  floorId: Types.ObjectId;
  seatId: Types.ObjectId;
  seatCode: string;
  persona: string;
  grupo: string;
  equipo: string;
  empresa: string;
  estado: "disponible" | "ocupado";
  action: "assign" | "release" | "move" | "update";
  changedByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const AssignmentHistoryModel =
  models.AssignmentHistory ?? model("AssignmentHistory", assignmentHistorySchema);
