const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://ndyzdxgrpraqlavxggoq.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5keXpkeGdycHJhcWxhdnhnZ29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgyMjY0NiwiZXhwIjoyMDkxMzk4NjQ2fQ.sDItUSiH31FssaJI2hqmIBDZeVkY-5wXH0DKvYEjlx4";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const email = "test_user_admin_" + Date.now() + "@example.com";
  console.log("Admin creating user:", email);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "Password123!",
    email_confirm: true,
    user_metadata: {
      full_name: "Test User Admin",
      tenant_id: "3f6ec142-739a-451f-8a45-d1a8f5659639"
    }
  });
  console.log("Data:", data ? "Success" : null);
  console.log("Error:", error);
}

test();
