import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await AppointmentService.createCheckoutSession(body);
    return NextResponse.json(session);
  } catch (error) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: "Erro ao iniciar checkout" }, { status: 400 });
  }
}
