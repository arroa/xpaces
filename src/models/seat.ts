import { Schema, model, models, Types } from "mongoose";

const seatSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
    code: { type: String, required: true, trim: true },
    position: {
      x: { type: Number, default: null },
      y: { type: Number, default: null },
    },
    grupo: { type: String, default: "" },
    equipo: { type: String, default: "" },
    empresa: { type: String, default: "" },
    persona: { type: String, default: "" },
    estado: { type: String, enum: ["disponible", "ocupado"], default: "disponible" },
  },
  { timestamps: true },
);

seatSchema.index({ floorId: 1, code: 1 }, { unique: true });

export type SeatDocument = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  floorId: Types.ObjectId;
  code: string;
  position: { x: number | null; y: number | null };
  grupo: string;
  equipo: string;
  empresa: string;
  persona: string;
  estado: "disponible" | "ocupado";
  createdAt: Date;
  updatedAt: Date;
};

export const SeatModel = models.Seat ?? model("Seat", seatSchema);
