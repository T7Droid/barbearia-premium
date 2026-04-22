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
          // 3. Processar cada barbeiro
          console.log(`[API /api/units/${id}] Preparando atualizações para ${barbers.length} barbeiros`);
          
          const barberUpdates = barbers.map(barber => {
            const bHours = barber.weekly_hours || {};
            const newBHours = { ...bHours };
            const uIdStr = String(id);

            // Obtém as horas do barbeiro para esta unidade especificamente
            const unitHours = newBHours[uIdStr] || {};
            const newUnitHours = { ...unitHours };
            
            const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const shopHours = weekly_hours;

            VALID_DAYS.forEach(day => {
              const sDay = shopHours[day];
              if (!sDay) return;

              const bDay = newUnitHours[day] ? { ...newUnitHours[day] } : { active: false, start: sDay.start, end: sDay.end };

              if (!sDay.active) {
                bDay.active = false;
                bDay.start = sDay.start;
                bDay.end = sDay.end;
              } else {
                if (bDay.start < sDay.start) bDay.start = sDay.start;
                if (bDay.end > sDay.end) bDay.end = sDay.end;

                if (bDay.start >= bDay.end) bDay.active = false;
                
                if (!bDay.active) {
                  bDay.start = sDay.start;
                  bDay.end = sDay.end;
                }
              }
              newUnitHours[day] = bDay;
            });

            console.log(`[API /api/units/${id}] Processando barbeiro ${barber.id}`);
            console.log(`[API /api/units/${id}] Horários originais:`, JSON.stringify(bHours));

            newBHours[uIdStr] = newUnitHours;
            console.log(`[API /api/units/${id}] Novos horários calculados:`, JSON.stringify(newBHours));

            return {
              id: barber.id,
              weekly_hours: newBHours
            };
          });

          // 4. Executar atualizações individuais (V2 - Sem Upsert)
          console.log(`[API /api/units/${id}] SINCRONIZANDO V2: Iniciando atualizações para ${barberUpdates.length} barbeiros`);
          
          for (const update of barberUpdates) {
            const { error: updateError } = await supabaseAdmin
              .from("barbers")
              .update({ 
                weekly_hours: update.weekly_hours
              })
              .eq("id", update.id);
            
            if (updateError) {
              console.error(`[API /api/units/${id}] Erro ao atualizar barbeiro ${update.id}:`, updateError);
            } else {
              console.log(`[API /api/units/${id}] Barbeiro ${update.id} sincronizado com sucesso.`);
            }
          }
          console.log(`[API /api/units/${id}] Processo de sincronização finalizado.`);
        } else {
          console.log(`[API /api/units/${id}] Nenhum barbeiro encontrado para os links fornecidos.`);
        }
      } else {
        console.log(`[API /api/units/${id}] Nenhum barbeiro vinculado a esta unidade.`);
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
