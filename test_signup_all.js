const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://ndyzdxgrpraqlavxggoq.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5keXpkeGdycHJhcWxhdnhnZ29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjI2NDYsImV4cCI6MjA5MTM5ODY0Nn0.N7zJ9thGK7R6LP6UqUhqb9PWSnxLFP4l62n-pC14omk";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = "test_anon_all_" + Date.now() + "@example.com";
  console.log("Anon creating user with all fields:", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: "Password123!",
    options: {
      data: {
        full_name: "Test User All",
        tenant_id: "3f6ec142-739a-451f-8a45-d1a8f5659639",
        role: "client",
        phone: "11999999999",
        notifications_enabled: false,
        push_notifications_enabled: false
      }
    }
  });
  console.log("Error:", error);
}

test();
