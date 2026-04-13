import { notFound } from "next/navigation";
import { TenantService } from "@/lib/services/tenant.service";
import { TenantProvider } from "@/components/tenant-provider";

export default async function TenantLayout(props: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const slug = params.slug;
  const children = props.children;

  const tenant = await TenantService.getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <TenantProvider value={{ id: tenant.id, name: tenant.name, slug: tenant.slug }}>
      {children}
    </TenantProvider>
  );
}
