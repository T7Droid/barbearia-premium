import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";

export async function GET(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });

  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin!
    .from("blocked_days")
    .select("*")
    .eq("tenant_id", tenant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });

  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const { date, unitIds, forceCancel } = await request.json();

    if (!date || !unitIds || !Array.isArray(unitIds)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // 1. Verificar agendamentos existentes se não for "forceCancel"
    if (!forceCancel) {
      const { data: existingAppts, error: apptError } = await supabaseAdmin!
        .from("appointments")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("appointment_date", date)
        .in("unit_id", unitIds)
        .neq("status", "cancelled");

      if (apptError) throw apptError;

      if (existingAppts && existingAppts.length > 0) {
        return NextResponse.json({ 
          hasAppointments: true, 
          count: existingAppts.length 
        }, { status: 200 });
      }
    } else {
      // Cancelar agendamentos existentes
      const { error: cancelError } = await supabaseAdmin!
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("tenant_id", tenant.id)
        .eq("appointment_date", date)
        .in("unit_id", unitIds);

      if (cancelError) throw cancelError;
    }

    // 2. Criar os bloqueios
    const blocksToInsert = unitIds.map(unitId => ({
      tenant_id: tenant.id,
      unit_id: unitId,
      date: date
    }));

    const { error: insertError } = await supabaseAdmin!
      .from("blocked_days")
      .upsert(blocksToInsert, { onConflict: "tenant_id, unit_id, date" });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Blocked Days POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });

  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const unitId = searchParams.get("unitId");

  if (!date || !unitId) {
    return NextResponse.json({ error: "Data e Unidade são obrigatórios" }, { status: 400 });
  }

  const { error } = await supabaseAdmin!
    .from("blocked_days")
    .delete()
    .eq("tenant_id", tenant.id)
    .eq("date", date)
    .eq("unit_id", unitId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
