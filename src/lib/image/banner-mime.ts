const ALLOWED_INPUT = ['image/jpeg', 'image/png', 'image/webp'] as const

export function isAllowedBannerMime(type: string): boolean {
  return (ALLOWED_INPUT as readonly string[]).includes(type)
}
