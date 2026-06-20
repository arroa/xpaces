import { Schema, model, models, Types } from "mongoose";

import type { XpacesRole } from "@/lib/roles";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    clerkUserId: { type: String, required: true, unique: true },
    roles: { type: [String], required: true, default: [] },
    active: { type: Boolean, required: true, default: true },
    displayName: { type: String, default: "" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
  },
  { timestamps: true },
);

userSchema.index({ active: 1 });
userSchema.index({ organizationId: 1 });

export type UserDocument = {
  _id: Types.ObjectId;
  email: string;
  clerkUserId: string;
  roles: XpacesRole[];
  active: boolean;
  displayName: string;
  organizationId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

export const UserModel = models.User ?? model("User", userSchema);
