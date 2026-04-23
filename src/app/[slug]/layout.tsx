import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { TenantService } from "@/lib/services/tenant.service";
import { TenantProvider } from "@/components/tenant-provider";

export default async function TenantLayout(props: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  let slug = params.slug;
  const children = props.children;

  // Fallback: Tentar pegar do header se o params.slug estiver vazio ou falhar
  if (!slug) {
    const headersList = await headers();
    slug = headersList.get("x-tenant-slug") || "";
  }

  const tenant = await TenantService.getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <TenantProvider value={{ 
      id: tenant.id, 
      name: tenant.name, 
      slug: tenant.slug,
      mpConnected: tenant.mp_connected
    }}>
      {children}
    </TenantProvider>
  );
}
