import { MetadataRoute } from 'next'
import { TenantService } from '@/lib/services/tenant.service'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://kingbarber.com.br'
  
  // Buscar todas as barbearias ativas do banco
  const tenants = await TenantService.listAllActiveTenants()
  
  const tenantUrls = tenants.map((tenant) => ({
    url: `${baseUrl}/${tenant.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/home`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/termos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...tenantUrls,
  ]
}
