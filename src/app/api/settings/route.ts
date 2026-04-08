import { NextResponse, NextRequest } from "next/server";
import { SETTINGS } from "@/lib/mock-store";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  return NextResponse.json(SETTINGS);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
  }

  try {
    const newSettings = await request.json();

    if (typeof newSettings.isPointsEnabled === "boolean") {
      SETTINGS.isPointsEnabled = newSettings.isPointsEnabled;
    }
    if (typeof newSettings.cancellationWindowDays === "number") {
      SETTINGS.cancellationWindowDays = newSettings.cancellationWindowDays;
    }
    if (typeof newSettings.isPrepaymentRequired === "boolean") {
      SETTINGS.isPrepaymentRequired = newSettings.isPrepaymentRequired;
    }
    if (newSettings.businessStartTime) {
      SETTINGS.businessStartTime = newSettings.businessStartTime;
    }
    if (newSettings.businessEndTime) {
      SETTINGS.businessEndTime = newSettings.businessEndTime;
    }
    if (typeof newSettings.slotInterval === "number") {
      SETTINGS.slotInterval = newSettings.slotInterval;
    }

    return NextResponse.json(SETTINGS);
  } catch (error) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
