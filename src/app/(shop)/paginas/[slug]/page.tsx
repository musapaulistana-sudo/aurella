import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'
import { buildPageMetadata } from '@/lib/seo/metadata'

type PageProps = {
  params: Promise<{ slug: string }>
}

/** Remove parágrafos vazios e quebras em excesso que incham o layout. */
function normalizePageHtml(html: string): string {
  return html
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .trim()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: page } = await supabase
    .from('footer_pages')
    .select('title, meta_description')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!page) {
    return { title: 'Página não encontrada', robots: { index: false } }
  }

  return buildPageMetadata({
    title: page.title,
    description: page.meta_description,
    path: `/paginas/${slug}`,
  })
}

export default async function FooterContentPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: page } = await supabase
    .from('footer_pages')
    .select('title, meta_description, content')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!page) notFound()

  const content = page.content ? normalizePageHtml(page.content) : null

  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <header className="mb-5 max-w-3xl border-l-2 border-brand pl-4 md:mb-6 md:pl-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Institucional
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            {page.title}
          </h1>
          {page.meta_description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {page.meta_description}
            </p>
          )}
        </header>

        <article className="border border-border bg-surface px-5 py-5 md:px-8 md:py-6">
          {content ? (
            <div
              className="max-w-3xl text-[15px] leading-7 text-text-secondary
                [&_a]:font-medium [&_a]:text-brand [&_a]:underline-offset-2 [&_a:hover]:underline
                [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-text-primary [&_h1:first-child]:mt-0
                [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:border-l-2 [&_h2]:border-brand [&_h2]:pl-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:text-text-primary [&_h2:first-child]:mt-0
                [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-text-primary [&_h3:first-child]:mt-0
                [&_h4]:mb-1.5 [&_h4]:mt-4 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-text-primary
                [&_hr]:my-5 [&_hr]:border-border
                [&_li]:my-0.5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6
                [&_p]:mb-3 [&_p:last-child]:mb-0
                [&_strong]:font-semibold [&_strong]:text-text-primary
                [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-text-secondary">Conteúdo em breve.</p>
          )}
        </article>
      </div>
    </div>
  )
}
