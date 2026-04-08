import { NextRequest, NextResponse } from "next/server";
import { APPOINTMENTS_STORE } from "@/lib/mock-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);

  const db = process.env.DATABASE_URL;

  if (!db) {
    const appointment = APPOINTMENTS_STORE.get(id);
    if (!appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }
    return NextResponse.json(appointment);
  }

  return NextResponse.json({ error: "DB not configured" }, { status: 501 });
}
