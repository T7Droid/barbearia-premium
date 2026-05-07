import { NextRequest, NextResponse } from "next/server";
import { ServiceService } from "@/lib/services/service.service";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";

console.log(">>> [SECURITY_DEBUG] Carregando a versão ULTRA-ATUALIZADA de services/[id]/route.ts");

async function checkAdmin(request: NextRequest, serviceId?: number) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) return false;
  
  const result = await AuthService.verifySession(request, tenant.id);
  if (!result.authenticated || result.user?.role !== "admin") return false;

  // Se um serviceId foi fornecido, garantir que pertence a este tenant
  if (serviceId) {
    const { data: service } = await ServiceService.getById(serviceId);
    // Nota: ServiceService.getById retorna o serviço mas não checamos tenant lá.
    // Vamos buscar direto no supabaseAdmin para checar o tenant_id.
    const { data: serviceData } = await (require("@/lib/supabase").supabaseAdmin)
      .from("services")
      .select("tenant_id")
      .eq("id", serviceId)
      .single();
    
    if (!serviceData || serviceData.tenant_id !== tenant.id) {
      return false;
    }
  }

  return true;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  const currentTenant = await TenantContext.getTenant(request);

  if (!(await checkAdmin(request, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Validar unitIds se fornecidos
    if (currentTenant && Array.isArray(body.unitIds) && body.unitIds.length > 0) {
      const { data: validUnits } = await (require("@/lib/supabase").supabaseAdmin)
        .from("units")
        .select("id")
        .eq("tenant_id", currentTenant.id)
        .in("id", body.unitIds);
      
      const validUnitIds = (validUnits || []).map((u: any) => u.id);
      body.unitIds = body.unitIds.filter((uId: any) => validUnitIds.includes(uId));
    }

    const updatedService = await ServiceService.update(id, body);
    return NextResponse.json(updatedService);
  } catch (error: any) {
    console.error(`API Error (PUT /api/services/${id}):`, error);
    return NextResponse.json({ error: "Erro ao atualizar serviço", details: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);

  if (!(await checkAdmin(request, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await ServiceService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`API Error (DELETE /api/services/${id}):`, error);
    return NextResponse.json({ error: "Erro ao excluir serviço", details: error.message }, { status: 400 });
  }
}
