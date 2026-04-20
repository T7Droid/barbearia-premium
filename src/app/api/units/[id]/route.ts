import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase Admin not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    
    // Filtramos apenas os campos que podem ser editados na unidade
    const { 
      name, 
      address, 
      number, 
      city, 
      state, 
      postal_code, 
      google_maps_link 
    } = body;

    const { data, error } = await supabaseAdmin
      .from("units")
      .update({
        name,
        address,
        number,
        city,
        state,
        postal_code,
        google_maps_link
      })
      .eq("id", id)
      .eq("tenant_id", tenant.id) // Segurança extra: garante que a unidade pertence ao tenant
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`API Error (PUT /api/units/${(await params).id}):`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase Admin not configured" }, { status: 500 });
  }

  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const auth = await AuthService.verifySession(request, tenant.id);
  if (!auth.authenticated || auth.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from("units")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`API Error (DELETE /api/units/${(await params).id}):`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
