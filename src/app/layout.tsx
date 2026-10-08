import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getSeoSettings } from '@/lib/seo/get-seo-settings'
import { getSiteUrl } from '@/lib/seo/site-url'
import './globals.css'

export const revalidate = 60

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings()
  const siteUrl = getSiteUrl()

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: {
      default: seo.defaultTitle,
      template: seo.titleTemplate,
    },
    description: seo.description,
    robots: { index: true, follow: true },
    verification: {
      google: '1P5vws9yhb-uIqC09m65EQ0Y6QasFKFoI_Av5byXkas',
    },
    openGraph: {
      locale: 'pt_PT',
      type: 'website',
      siteName: seo.siteName,
      title: seo.defaultTitle,
      description: seo.description,
      ...(seo.ogImageUrl ? { images: [{ url: seo.ogImageUrl, alt: seo.siteName }] } : {}),
    },
    ...(seo.faviconUrl
      ? {
          icons: {
            icon: [{ url: '/icon', type: 'image/png' }, { url: '/favicon.ico' }],
            shortcut: '/favicon.ico',
            apple: '/apple-icon',
          },
        }
      : {
          icons: {
            icon: '/icon',
            apple: '/apple-icon',
          },
        }),
  }
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
