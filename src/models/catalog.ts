import { Schema, model, models, Types } from "mongoose";

const catalogSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    type: { type: String, enum: ["grupo", "equipo", "empresa"], required: true },
    value: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

catalogSchema.index({ organizationId: 1, type: 1, value: 1 }, { unique: true });

export type CatalogDocument = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  type: "grupo" | "equipo" | "empresa";
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

export const CatalogModel = models.Catalog ?? model("Catalog", catalogSchema);
