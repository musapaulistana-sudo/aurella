'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import {
  needsStableShopifyLoader,
  productImageLoader,
} from '@/lib/media/product-image-loader'

type SafeProductImageProps = Omit<ImageProps, 'onError' | 'src' | 'loader'> & {
  src: string
  fallbackLabel?: string
}

/**
 * next/image falha com 404 quando a origem (ex. Shopify CDN) morreu.
 * Mostra placeholder em vez do ícone partido do browser.
 * Shopify: loader com w=1200 fixo para não depender do resize do ecrã.
 */
export function SafeProductImage({
  src,
  alt,
  fallbackLabel = 'Sem imagem',
  className,
  ...props
}: SafeProductImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-muted text-xs text-text-muted">
        {fallbackLabel}
      </div>
    )
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      className={className}
      loader={needsStableShopifyLoader(src) ? productImageLoader : undefined}
      onError={() => setFailed(true)}
    />
  )
}
