import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import { getSeoSettings } from '@/lib/seo/get-seo-settings'
import { getSiteUrl } from '@/lib/seo/site-url'
import './globals.css'

const CLARITY_PROJECT_ID = 'z08z6wk9bs'

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
      google: [
        '1P5vws9yhb-uIqC09m65EQ0Y6QasFKFoI_Av5byXkas',
        'KZPpLuQ8RzjXYsa1xUkXSzKKKJ5mHxrmUjYJMTA_IqY',
      ],
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
      <body className="min-h-full">
        <Script id="store-clarity" strategy="beforeInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
        </Script>
        {children}
      </body>
    </html>
  )
}
