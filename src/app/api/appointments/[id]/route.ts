import { NextRequest, NextResponse } from "next/server";
import { AppointmentService } from "@/lib/services/appointment.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const appointment = await AppointmentService.getById(id);
    
    if (!appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json({ error: "Erro interno ao buscar agendamento" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { AuthService } = require("@/lib/services/auth.service");
  const { TenantContext } = require("@/lib/services/tenant-context");

  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });

    const result = await AuthService.verifySession(request, tenant.id);
    if (!result.authenticated) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const appointment = await AppointmentService.getById(id);
    if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

    // Verificar se o usuário é o dono do agendamento ou se é um admin
    if (result.user.role !== "admin" && appointment.userId !== result.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const success = await AppointmentService.cancel(id, tenant.id);
    
    if (success) {
      return NextResponse.json({ success: true, message: "Agendamento cancelado com sucesso" });
    } else {
      return NextResponse.json({ error: "Falha ao cancelar agendamento" }, { status: 500 });
    }
  } catch (error) {
    console.error("PATCH /api/appointments/[id] Error:", error);
    return NextResponse.json({ error: "Erro interno ao processar cancelamento" }, { status: 500 });
  }
}
