import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("// Firebase SW desativado em favor do /sw.js", {
    headers: {
      "Content-Type": "application/javascript",
    },
  });
}
