const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://ndyzdxgrpraqlavxggoq.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5keXpkeGdycHJhcWxhdnhnZ29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjI2NDYsImV4cCI6MjA5MTM5ODY0Nn0.N7zJ9thGK7R6LP6UqUhqb9PWSnxLFP4l62n-pC14omk";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = "test_user_" + Date.now() + "@example.com";
  console.log("Signing up:", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: "Password123!",
    options: {
      data: {
        full_name: "Test User",
        tenant_id: "3f6ec142-739a-451f-8a45-d1a8f5659639"
      }
    }
  });
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
