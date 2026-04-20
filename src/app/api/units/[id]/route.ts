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
      google_maps_link,
      weekly_hours
    } = body;

    const { data: unit, error } = await supabaseAdmin
      .from("units")
      .update({
        name,
        address,
        number,
        city,
        state,
        postal_code,
        google_maps_link,
        weekly_hours
      })
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (error) throw error;

    // --- SINCRONIZAÇÃO EM CASCATA: Unit -> Barbers ---
    if (weekly_hours && unit) {
      console.log(`[API /api/units/${id}] Cascading update for unit: ${unit.name}`);
      
      // 1. Buscar IDs dos barbeiros vinculados a esta unidade
      const { data: links } = await supabaseAdmin
        .from("barber_units")
        .select("barber_id")
        .eq("unit_id", id);
      
      if (links && links.length > 0) {
        const barberIds = links.map(l => l.barber_id);
        
        // 2. Buscar registros dos barbeiros
        const { data: barbers } = await supabaseAdmin
          .from("barbers")
          .select("id, weekly_hours")
          .in("id", barberIds);
        
        if (barbers && barbers.length > 0) {
          const shopHours = weekly_hours;
          const barberUpdates = barbers.map(barber => {
            const bHours = barber.weekly_hours || {};
            const newBHours = { ...bHours };

            Object.keys(shopHours).forEach(day => {
              const sDay = shopHours[day] || { active: false, start: "00:00", end: "23:59" };
              const bDay = newBHours[day] || { active: false, start: "09:00", end: "18:00" };

              // Regra 1: Se unidade fecha, barbeiro desativa nesse dia
              if (!sDay.active) {
                bDay.active = false;
              } else if (bDay.active) {
                // Regra 2: Clipping (Encurtar se barbershop ficou mais restrita)
                if (bDay.start < sDay.start) bDay.start = sDay.start;
                if (bDay.end > sDay.end) bDay.end = sDay.end;

                // Regra 3: Sanidade
                if (bDay.start >= bDay.end) bDay.active = false;
              }
              newBHours[day] = bDay;
            });

            return {
              id: barber.id,
              weekly_hours: newBHours,
              updated_at: new Date().toISOString()
            };
          });

          // Atualização em lote
          await supabaseAdmin.from("barbers").upsert(barberUpdates);
          console.log(`[API /api/units/${id}] Synchronized ${barbers.length} barbers.`);
        }
      }
    }

    return NextResponse.json(unit);
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
