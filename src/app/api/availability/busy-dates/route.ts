import { TenantContext } from "@/lib/services/tenant-context";

export async function GET(request: NextRequest) {
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Parâmetros start e end são obrigatórios" }, { status: 400 });
  }

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  try {
    // 1. Buscar configurações do tenant
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("tenant_id", tenant.id)
      .single();

    if (settingsError || !settings) throw new Error("Configurações não encontradas");

    const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const interval = settings.slot_interval || 45;

    // 2. Buscar agendamentos no intervalo
    const appointments = await AppointmentService.getBookedSlotsInRange(start, end);

    // Agrupar agendamentos por data
    const bookedCountByDate: Record<string, number> = {};
    appointments.forEach(a => {
      bookedCountByDate[a.appointment_date] = (bookedCountByDate[a.appointment_date] || 0) + 1;
    });

    // 3. Iterar por cada dia no intervalo e verificar se está "cheio" ou "fechado"
    const dates = eachDayOfInterval({
      start: parseISO(start),
      end: parseISO(end)
    });

    const busyDates: string[] = [];

    dates.forEach(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayName = daysMap[date.getDay()];
      const dayConfig = settings.weekly_hours?.[dayName] || { active: false };

      // Se o dia estiver fechado, marca como ocupado/indisponível
      if (!dayConfig.active || !dayConfig.start || !dayConfig.end) {
        busyDates.push(dateStr);
        return;
      }

      // Calcular total de slots possíveis
      const [startH, startM] = dayConfig.start.split(":").map(Number);
      const [endH, endM] = dayConfig.end.split(":").map(Number);
      
      const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      const maxSlots = Math.floor(totalMinutes / interval);

      // Ver se está lotado
      const currentBookings = bookedCountByDate[dateStr] || 0;
      if (currentBookings >= maxSlots) {
        busyDates.push(dateStr);
      }
    });

    return NextResponse.json(busyDates);
  } catch (error: any) {
    console.error("Busy Dates Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
