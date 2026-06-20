import { NextResponse } from "next/server";

import { connectMongo } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectMongo();
    return NextResponse.json({
      ok: true,
      mongo: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, mongo: "error", message }, { status: 503 });
  }
}
