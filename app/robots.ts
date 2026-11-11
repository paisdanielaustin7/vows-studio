import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vowsstudio.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/crm/', '/admin/', '/api/', '/dev/', '/(auth)/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
