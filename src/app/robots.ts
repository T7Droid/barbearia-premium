import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/', 
        '/admin/', 
        '/barber/', 
        '/*/admin', 
        '/*/barber', 
        '/onboarding',
        '/login',
        '/cadastro'
      ],
    },
    sitemap: 'https://kingbarber.com.br/sitemap.xml',
  }
}
