import { NextRequest, NextResponse } from "next/server";
import { BarberService } from "@/lib/services/barber.service";
import { AuthService } from "@/lib/services/auth.service";
import { supabaseAdmin } from "@/lib/supabase";

import { TenantContext } from "@/lib/services/tenant-context";

async function checkAdmin(request: NextRequest, tenantId?: string) {
  const result = await AuthService.verifySession(request, tenantId);
  return result.authenticated && result.user?.role === "admin";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const tenant = await TenantContext.getTenant(request);
  const auth = await AuthService.verifySession(request, tenant?.id);

  if (!tenant || !auth.authenticated) {
    return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
  }

  const id = parseInt(idStr);

  // Buscar o barbeiro para verificar o proprietário
  const { data: barberRecord } = await supabaseAdmin
    .from("barbers")
    .select("user_id")
    .eq("id", id)
    .single();

  const isOwner = barberRecord?.user_id === auth.user.id;
  const isAdmin = auth.user.role === "admin";

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Não autorizado a editar este perfil" }, { status: 403 });
  }

  try {
    const id = parseInt(idStr);
    const body = await request.json();

    // Garantir que o barbeiro pertence ao tenant antes de atualizar
    const { name, description, imageUrl, active, unitIds, serviceIds, loginData, weeklyHours, commissionPercentage } = body;

    let userId = undefined;

    // 1. Criar login se não tiver e for solicitado
    if (loginData?.email && loginData?.password) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: loginData.email,
        password: loginData.password,
        email_confirm: true,
        user_metadata: { role: "barber", full_name: name }
      });

      if (!authError) {
        userId = authData.user.id;
        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          full_name: name,
          email: loginData.email,
          role: "barber",
          tenant_id: tenant.id
        });
      }
    }

    const updateFields: any = {
      name,
      description,
      image_url: imageUrl,
      active
    };
    if (commissionPercentage !== undefined) {
      updateFields.commission_percentage = commissionPercentage;
    }
    if (userId) updateFields.user_id = userId;
    if (weeklyHours) updateFields.weekly_hours = weeklyHours;

    const { data: updatedBarber, error } = await supabaseAdmin
      .from("barbers")
      .update(updateFields)
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (error) throw error;

    // 2. Sincronizar Unidades
    if (Array.isArray(unitIds)) {
      await supabaseAdmin.from("barber_units").delete().eq("barber_id", id);
      if (unitIds.length > 0) {
        const associations = unitIds.map(uId => ({ barber_id: id, unit_id: uId }));
        await supabaseAdmin.from("barber_units").insert(associations);
      }
    }

    // 3. Sincronizar Serviços
    if (Array.isArray(serviceIds)) {
      await supabaseAdmin.from("barber_services").delete().eq("barber_id", id);
      if (serviceIds.length > 0) {
        const svcAssociations = serviceIds.map(sId => ({ barber_id: id, service_id: Number(sId) }));
        await supabaseAdmin.from("barber_services").insert(svcAssociations);
      }
    }

    return NextResponse.json(updatedBarber);
  } catch (error: any) {
    console.error(`API Error (PUT /api/barbers/${idStr}):`, error);
    return NextResponse.json({ 
      error: "Erro ao atualizar barbeiro", 
      details: error.message 
    }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const tenant = await TenantContext.getTenant(request);

  if (!tenant || !(await checkAdmin(request, tenant.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const id = parseInt(idStr);
    
    // Garantir que o barbeiro pertence ao tenant antes de deletar
    const { error } = await supabaseAdmin
      .from("barbers")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`API Error (DELETE /api/barbers/${idStr}):`, error);
    return NextResponse.json({ 
      error: "Erro ao excluir barbeiro", 
      details: error.message 
    }, { status: 400 });
  }
}
