-- ==========================================================================
-- RLS Policies para isolamento multi-tenant do Barber-Premium
-- Execute este script no Supabase Dashboard > SQL Editor
-- ==========================================================================

-- -------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES (Para evitar recursão infinita no RLS)
-- -------------------------------------------------------------------------

-- Função para verificar se o usuário é admin de um tenant específico
CREATE OR REPLACE FUNCTION public.check_is_admin(t_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id::text = auth.uid()::text 
    AND tenant_id::text = t_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para verificar se o usuário é membro (admin ou barbeiro) de um tenant
CREATE OR REPLACE FUNCTION public.check_is_member(t_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id::text = auth.uid()::text 
    AND tenant_id::text = t_id
    AND role IN ('admin', 'barber')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para verificar se o usuário é o barbeiro logado
CREATE OR REPLACE FUNCTION public.check_is_barber_owner(b_id bigint)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.barbers
    WHERE id = b_id AND user_id::text = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==========================================================================
-- TABELA: appointments
-- ==========================================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_view_own_appointments" ON public.appointments;
CREATE POLICY "client_view_own_appointments"
ON public.appointments FOR SELECT
USING (
  user_id::text = auth.uid()::text
  OR customer_email = auth.jwt() ->> 'email'
);

DROP POLICY IF EXISTS "admin_view_tenant_appointments" ON public.appointments;
CREATE POLICY "admin_view_tenant_appointments"
ON public.appointments FOR SELECT
USING (check_is_member(tenant_id::text));

DROP POLICY IF EXISTS "barber_view_own_appointments" ON public.appointments;
CREATE POLICY "barber_view_own_appointments"
ON public.appointments FOR SELECT
USING (check_is_barber_owner(barber_id));

DROP POLICY IF EXISTS "anyone_can_insert_appointment" ON public.appointments;
CREATE POLICY "anyone_can_insert_appointment"
ON public.appointments FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_tenant_appointments" ON public.appointments;
CREATE POLICY "admin_update_tenant_appointments"
ON public.appointments FOR UPDATE
USING (check_is_admin(tenant_id::text));

DROP POLICY IF EXISTS "client_cancel_own_appointment" ON public.appointments;
CREATE POLICY "client_cancel_own_appointment"
ON public.appointments FOR UPDATE
USING (user_id::text = auth.uid()::text)
WITH CHECK (status = 'cancelled');


-- ==========================================================================
-- TABELA: settings
-- ==========================================================================

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON public.settings;
CREATE POLICY "public_read_settings"
ON public.settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "admin_update_own_settings" ON public.settings;
CREATE POLICY "admin_update_own_settings"
ON public.settings FOR UPDATE
USING (check_is_admin(tenant_id::text));


-- ==========================================================================
-- TABELA: barbers
-- ==========================================================================

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_barbers" ON public.barbers;
CREATE POLICY "public_read_barbers"
ON public.barbers FOR SELECT
USING (true);

DROP POLICY IF EXISTS "admin_manage_tenant_barbers" ON public.barbers;
CREATE POLICY "admin_manage_tenant_barbers"
ON public.barbers FOR ALL
USING (check_is_admin(tenant_id::text));

DROP POLICY IF EXISTS "barber_update_own_profile" ON public.barbers;
CREATE POLICY "barber_update_own_profile"
ON public.barbers FOR UPDATE
USING (user_id::text = auth.uid()::text);


-- ==========================================================================
-- TABELA: services
-- ==========================================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_services" ON public.services;
CREATE POLICY "public_read_services"
ON public.services FOR SELECT
USING (true);

DROP POLICY IF EXISTS "admin_manage_tenant_services" ON public.services;
CREATE POLICY "admin_manage_tenant_services"
ON public.services FOR ALL
USING (check_is_admin(tenant_id::text));


-- ==========================================================================
-- TABELA: units
-- ==========================================================================

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_units" ON public.units;
CREATE POLICY "public_read_units"
ON public.units FOR SELECT
USING (true);

DROP POLICY IF EXISTS "admin_manage_tenant_units" ON public.units;
CREATE POLICY "admin_manage_tenant_units"
ON public.units FOR ALL
USING (check_is_admin(tenant_id::text));


-- ==========================================================================
-- TABELA: blocked_days
-- ==========================================================================

ALTER TABLE public.blocked_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_blocked_days" ON public.blocked_days;
CREATE POLICY "public_read_blocked_days"
ON public.blocked_days FOR SELECT
USING (true);

DROP POLICY IF EXISTS "admin_manage_blocked_days" ON public.blocked_days;
CREATE POLICY "admin_manage_blocked_days"
ON public.blocked_days FOR ALL
USING (check_is_admin(tenant_id::text));


-- ==========================================================================
-- TABELAS DE JUNÇÃO (M2M) - RECURSION PROOF
-- ==========================================================================

-- service_units
ALTER TABLE public.service_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_service_units" ON public.service_units;
CREATE POLICY "public_read_service_units" ON public.service_units FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_manage_service_units" ON public.service_units;
CREATE POLICY "admin_manage_service_units" ON public.service_units FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id::text = auth.uid()::text AND role = 'admin'
  )
);
-- Nota: Usando subquery simples em tenant_memberships é seguro se a política da tenant_memberships não for recursiva.
-- Mas por segurança, vamos usar a função:
DROP POLICY IF EXISTS "admin_manage_service_units" ON public.service_units;
CREATE POLICY "admin_manage_service_units" ON public.service_units FOR ALL USING (
  -- Como não temos tenant_id nesta tabela, usamos uma lógica genérica de admin
  EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id::text = auth.uid()::text AND role = 'admin'
  )
);

-- barber_units
ALTER TABLE public.barber_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_barber_units" ON public.barber_units;
CREATE POLICY "public_read_barber_units" ON public.barber_units FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_manage_barber_units" ON public.barber_units;
CREATE POLICY "admin_manage_barber_units" ON public.barber_units FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id::text = auth.uid()::text AND role = 'admin'
  )
);

-- barber_services
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_barber_services" ON public.barber_services;
CREATE POLICY "public_read_barber_services" ON public.barber_services FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_manage_barber_services" ON public.barber_services;
CREATE POLICY "admin_manage_barber_services" ON public.barber_services FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id::text = auth.uid()::text AND role = 'admin'
  )
);


-- ==========================================================================
-- TABELA: profiles
-- ==========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_profile" ON public.profiles;
CREATE POLICY "users_view_own_profile"
ON public.profiles FOR SELECT
USING (id::text = auth.uid()::text);

-- Admins podem ver perfis de usuários que são membros de algum tenant onde ele é admin
DROP POLICY IF EXISTS "admin_view_tenant_profiles" ON public.profiles;
CREATE POLICY "admin_view_tenant_profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_memberships m1
    JOIN public.tenant_memberships m2 ON m1.tenant_id = m2.tenant_id
    WHERE m1.user_id = public.profiles.id
    AND m2.user_id::text = auth.uid()::text
    AND m2.role = 'admin'
  )
);

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile"
ON public.profiles FOR UPDATE
USING (id::text = auth.uid()::text);


-- ==========================================================================
-- TABELA: tenant_memberships (POLÍTICAS NÃO-RECURSIVAS)
-- ==========================================================================

ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_memberships" ON public.tenant_memberships;
CREATE POLICY "users_view_own_memberships"
ON public.tenant_memberships FOR SELECT
USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "admin_manage_tenant_memberships" ON public.tenant_memberships;
CREATE POLICY "admin_manage_tenant_memberships"
ON public.tenant_memberships FOR ALL
USING (check_is_admin(tenant_id::text));
