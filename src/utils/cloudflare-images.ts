/**
 * Optional Cloudflare Images integration for avatars and thumbnails.
 * When CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are set,
 * use this to upload images and get optimized delivery URLs (resizing, WebP, etc.).
 */

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

export function isCloudflareImagesConfigured(): boolean {
  return Boolean(accountId && apiToken);
}

export interface CloudflareImagesUploadResult {
  id: string;
  /** Use this URL for display (e.g. avatar or thumbnail). Prefer "public" or first variant. */
  url: string;
  variants: string[];
}

export async function uploadImageToCloudflareImages(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<CloudflareImagesUploadResult> {
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Images is not configured (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN)');
  }

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(file)], { type: contentType }), filename);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: form as any,
    }
  );

  const data = await response.json();
  if (!data.success || !data.result) {
    const msg = data.errors?.[0]?.message || data.messages?.[0]?.message || 'Cloudflare Images upload failed';
    throw new Error(msg);
  }

  const result = data.result;
  const variants: string[] = result.variants || [];
  const publicVariant = variants.find((v: string) => v.includes('/public'));
  const url = publicVariant || variants[0] || result.variants?.[0];

  return {
    id: result.id,
    url: url || '',
    variants,
  };
}

export async function deleteCloudflareImage(imageId: string): Promise<void> {
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Images is not configured');
  }
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiToken}` },
    }
  );
  const data = await response.json();
  if (!data.success && data.errors?.[0]?.code !== 7003) {
    const msg = data.errors?.[0]?.message || 'Cloudflare Images delete failed';
    throw new Error(msg);
  }
}
