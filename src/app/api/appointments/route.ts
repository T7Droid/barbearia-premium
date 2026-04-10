import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";
import { AuthService } from "@/lib/services/auth.service";

export async function GET(request: NextRequest) {
  const result = await AuthService.verifySession(request);
  if (!result.authenticated || !result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = result;

  try {
    let appointments = await AppointmentService.list();

    if (user.role !== "admin") {
      appointments = appointments.filter((a: any) => a.customerEmail === user.email);
    }

    appointments.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao carregar agendamentos" }, { status: 500 });
  }
}
