import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import mongoose from "mongoose";

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/xpaces";

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("No database connection");
  }

  const collectionNames = ["floors", "seats", "rooms", "assignmenthistories", "buildings", "organizations"];
  console.log("=== COUNTS ===");
  for (const name of collectionNames) {
    const collections = await db.listCollections({ name }).toArray();
    if (collections.length === 0) {
      console.log(`${name}: (missing)`);
      continue;
    }
    console.log(`${name}:`, await db.collection(name).countDocuments());
  }

  const floors = await db.collection("floors").find({}).toArray();
  console.log("\n=== FLOORS ===");
  for (const floor of floors) {
    console.log({
      id: floor._id.toString(),
      name: floor.name,
      active: floor.active,
      buildingId: floor.buildingId?.toString(),
    });
  }

  const activeFloorIdSet = new Set(
    floors.filter((floor) => floor.active).map((floor) => floor._id.toString()),
  );

  const seats = await db.collection("seats").find({}).toArray();
  const rooms = await db.collection("rooms").find({}).toArray();
  const histories = await db.collection("assignmenthistories").find({}).toArray();
  const seatIdSet = new Set(seats.map((seat) => seat._id.toString()));

  const seatsOnInactiveFloors = seats.filter(
    (seat) => !activeFloorIdSet.has(seat.floorId.toString()),
  );
  const roomsOnInactiveFloors = rooms.filter(
    (room) => !activeFloorIdSet.has(room.floorId.toString()),
  );
  const historyMissingSeat = histories.filter(
    (entry) => !seatIdSet.has(entry.seatId.toString()),
  );
  const historyInactiveFloor = histories.filter(
    (entry) => !activeFloorIdSet.has(entry.floorId.toString()),
  );
  const occupiedOnInactive = seatsOnInactiveFloors.filter((seat) => seat.estado === "ocupado");

  console.log("\n=== INCONSISTENCIES ===");
  console.log("Seats on inactive/deleted floors:", seatsOnInactiveFloors.length);
  console.log("Rooms on inactive/deleted floors:", roomsOnInactiveFloors.length);
  console.log("Occupied seats on inactive floors:", occupiedOnInactive.length);
  console.log("Assignment history with missing seat:", historyMissingSeat.length);
  console.log("Assignment history on inactive floor:", historyInactiveFloor.length);

  if (historyMissingSeat.length > 0) {
    console.log("\nSample orphan history (missing seat):");
    for (const entry of historyMissingSeat.slice(0, 5)) {
      console.log({
        seatCode: entry.seatCode,
        persona: entry.persona,
        estado: entry.estado,
        floorId: entry.floorId.toString(),
        seatId: entry.seatId.toString(),
      });
    }
  }

  await mongoose.disconnect();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
