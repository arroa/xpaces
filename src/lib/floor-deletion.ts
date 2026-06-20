import type { Types } from "mongoose";

import { deleteCloudinaryImage } from "@/lib/cloudinary-upload";
import { AssignmentHistoryModel } from "@/models/assignment-history";
import type { FloorDocument } from "@/models/floor";
import { RoomModel } from "@/models/room";
import { SeatModel } from "@/models/seat";

export type FloorDeletionSummary = {
  occupiedSeats: number;
  assignedSeats: number;
  placedSeats: number;
  placedRooms: number;
  historyCount: number;
};

export async function getFloorDeletionSummary(
  floorId: Types.ObjectId | string,
): Promise<FloorDeletionSummary> {
  const [occupiedSeats, assignedSeats, placedSeats, placedRooms, historyCount] =
    await Promise.all([
      SeatModel.countDocuments({ floorId, estado: "ocupado" }),
      SeatModel.countDocuments({ floorId, persona: { $nin: ["", null] } }),
      SeatModel.countDocuments({
        floorId,
        "position.x": { $ne: null },
        "position.y": { $ne: null },
      }),
      RoomModel.countDocuments({
        floorId,
        "position.x": { $ne: null },
        "position.y": { $ne: null },
      }),
      AssignmentHistoryModel.countDocuments({ floorId }),
    ]);

  return { occupiedSeats, assignedSeats, placedSeats, placedRooms, historyCount };
}

export async function cascadeDeleteFloorData(
  floor: Pick<FloorDocument, "_id" | "imagePublicId">,
) {
  if (floor.imagePublicId) {
    await deleteCloudinaryImage(floor.imagePublicId).catch(() => undefined);
  }

  await Promise.all([
    SeatModel.deleteMany({ floorId: floor._id }),
    RoomModel.deleteMany({ floorId: floor._id }),
    AssignmentHistoryModel.deleteMany({ floorId: floor._id }),
  ]);
}
