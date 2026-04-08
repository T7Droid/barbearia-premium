import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let appointments = await AppointmentService.list();

    if (payload.role !== "admin") {
      appointments = appointments.filter((a: any) => a.customerEmail === payload.email);
    }

    appointments.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao carregar agendamentos" }, { status: 500 });
  }
}
