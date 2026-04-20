import { supabaseAdmin } from "./src/lib/supabase";

async function check() {
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("id, unit_id, units(name)")
    .limit(5);

  console.log(JSON.stringify(data, null, 2));
}

check();
