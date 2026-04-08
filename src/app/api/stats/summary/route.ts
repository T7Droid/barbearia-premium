import { NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";

export async function GET() {
  try {
    const stats = await AppointmentService.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats Error:", error);
    return NextResponse.json({ error: "Erro ao carregar estatísticas" }, { status: 500 });
  }
}
