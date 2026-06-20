import { Schema, model, models, Types } from "mongoose";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

organizationSchema.index({ active: 1 });

export type OrganizationDocument = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const OrganizationModel =
  models.Organization ?? model("Organization", organizationSchema);
