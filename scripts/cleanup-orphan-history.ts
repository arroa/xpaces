import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import mongoose from "mongoose";

import { connectMongo } from "../src/lib/mongodb";
import { AssignmentHistoryModel } from "../src/models/assignment-history";
import { FloorModel } from "../src/models/floor";
import { SeatModel } from "../src/models/seat";

async function main() {
  await connectMongo();

  const activeFloors = await FloorModel.find({ active: true }).select("_id").lean();
  const activeFloorIds = activeFloors.map((floor) => floor._id);

  const seats = await SeatModel.find({}).select("_id").lean();
  const seatIds = seats.map((seat) => seat._id);

  const orphanByFloor = await AssignmentHistoryModel.deleteMany({
    floorId: { $nin: activeFloorIds },
  });
  const orphanBySeat = await AssignmentHistoryModel.deleteMany({
    seatId: { $nin: seatIds },
  });

  console.log("Historial huérfano por planta inactiva:", orphanByFloor.deletedCount);
  console.log("Historial huérfano por puesto inexistente:", orphanBySeat.deletedCount);

  await mongoose.disconnect();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
