import { NextRequest, NextResponse } from "next/server";
import { ServiceService } from "@/lib/services/service.service";
import { AuthService } from "@/lib/services/auth.service";

import { TenantContext } from "@/lib/services/tenant-context";

async function checkAdmin(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) return false;
  
  const result = await AuthService.verifySession(request, tenant.id);
  return result.authenticated && result.user?.role === "admin";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();

    const updatedService = await ServiceService.update(id, body);
    return NextResponse.json(updatedService);
  } catch (error: any) {
    console.error(`API Error (PUT /api/services/${(await params).id}):`, error);
    return NextResponse.json({ error: "Erro ao atualizar serviço", details: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    await ServiceService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`API Error (DELETE /api/services/${(await params).id}):`, error);
    return NextResponse.json({ error: "Erro ao excluir serviço", details: error.message }, { status: 400 });
  }
}
