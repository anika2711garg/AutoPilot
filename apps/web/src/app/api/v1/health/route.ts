import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "DIG-AI-NextJS-Fullstack Engine",
    timestamp: new Date().toISOString(),
  });
}
