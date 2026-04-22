import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { data, error } = await supabaseAdmin!
    .from("appointments")
    .select("id, unit_id, unit_name, appointment_date, appointment_time, total_duration, status, barber_id")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ data, error });
}
