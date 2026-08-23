import { NextResponse } from "next/server";
import { estado } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await estado());
}
