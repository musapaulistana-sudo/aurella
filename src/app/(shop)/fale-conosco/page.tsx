import type { Metadata } from 'next'
import { ContactPageView } from '@/components/contact/ContactPageView'
import { getContactPageData } from '@/lib/contact/get-contact-page-data'
import { buildPageMetadata } from '@/lib/seo/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const data = await getContactPageData()
  const storeName = data.storeName || 'Loja'

  return buildPageMetadata({
    title: `Contacto | ${storeName}`,
    description:
      data.intro ??
      'Contacte-nos. Esclareça dúvidas sobre encomendas, produtos e apoio ao cliente.',
    path: '/fale-conosco',
  })
}

export default async function FaleConoscoPage() {
  const data = await getContactPageData()
  return <ContactPageView data={data} />
}
