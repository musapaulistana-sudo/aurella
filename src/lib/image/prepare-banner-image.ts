import { isAllowedBannerMime } from '@/lib/image/banner-mime'

const MAX_BYTES = 5 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export type PreparedBannerImage = {
  buffer: Buffer
  width: number | null
  height: number | null
  size: number
  mimeType: string
  extension: string
}

function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

function readWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF') return null
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null

  const chunk = buffer.toString('ascii', 12, 16)
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return {
      width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
      height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
    }
  }
  if (chunk === 'VP8L' && buffer.length >= 25) {
    const bits = buffer[21] | (buffer[22] << 8) | (buffer[23] << 16) | (buffer[24] << 24)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
  }
  return null
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null

  let offset = 2
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) return null
    const marker = buffer[offset + 1]
    if (marker === 0xc0 || marker === 0xc2 || marker === 0xc1) {
      if (offset + 9 >= buffer.length) return null
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      }
    }
    const len = buffer.readUInt16BE(offset + 2)
    if (len < 2) return null
    offset += 2 + len
  }
  return null
}

function readDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/png') return readPngDimensions(buffer)
  if (mimeType === 'image/webp') return readWebpDimensions(buffer)
  if (mimeType === 'image/jpeg') return readJpegDimensions(buffer)
  return null
}

export async function prepareBannerImage(file: File): Promise<PreparedBannerImage> {
  if (!isAllowedBannerMime(file.type)) {
    throw new Error('Formato não permitido. Use JPEG, PNG ou WebP.')
  }

  if (file.size > MAX_BYTES) {
    throw new Error('Imagem muito grande. Máximo 5 MB.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const dims = readDimensions(buffer, file.type)
  const extension = EXT_BY_MIME[file.type] ?? 'jpg'

  return {
    buffer,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    size: buffer.byteLength,
    mimeType: file.type,
    extension,
  }
}
