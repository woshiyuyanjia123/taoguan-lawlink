import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    {
      name: "TaoGuan LawLink",
      brand: "韬冠律所",
      version: "2.1.0",
      status: "ok",
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      }
    }
  );
}
