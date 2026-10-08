import { buildGoogleMerchantFeedXml } from '@/lib/feed/build-google-merchant-feed'

/** Cache curto: invalidado também via revalidatePath ao salvar produtos. */
export const revalidate = 300

export async function GET() {
  const result = await buildGoogleMerchantFeedXml()

  if ('error' in result) {
    return new Response(result.error, { status: result.status })
  }

  return new Response(result.xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'Content-Disposition': 'inline; filename="google-merchant.xml"',
    },
  })
}
