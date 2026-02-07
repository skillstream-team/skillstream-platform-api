# Cloudflare storage: Images + Stream (+ R2 for non-image files)

The platform uses **Cloudflare Images** for all image uploads and **Cloudflare Stream** for video. Non-image files (PDFs, documents, zips) use **Cloudflare R2**.

| Content type | Service |
|--------------|---------|
| **Images** (avatars, thumbnails, course/lesson images, message image attachments) | **Cloudflare Images** (when configured) |
| **Non-image files** (PDFs, documents, zips) | **Cloudflare R2** |
| **Videos** (lesson videos, live streams) | **Cloudflare Stream** |

When Cloudflare Images is not configured, image uploads fall back to R2.

---

## What you need to provide

### 1. Cloudflare Images + Stream (shared credentials)

Images and Stream use the **same** account ID and API token. In the [Cloudflare dashboard](https://dash.cloudflare.com/): enable **Images** and **Stream**, then create an API token with **Images Write** and **Stream Edit** (or use a custom token with both permissions).

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID. |
| `CLOUDFLARE_API_TOKEN` | API token with **Images Write** and **Stream Edit**. |

When set:
- Every **image** upload (profile picture, thumbnails, course/lesson images, message image attachments) goes to **Cloudflare Images** (resizing, WebP, CDN).
- **Lesson videos** and **live streams** are created and played via **Cloudflare Stream**.

**I only have Account ID, Account Hash, and Image Delivery URL.**  
- **Account ID** and **Account Hash** are not enough for this app to *upload* or *delete* images. The backend calls Cloudflare’s REST API for upload/delete, which requires an **API token** (not the hash).  
- **Account hash** and **image delivery URL** are used only for *serving* images. After an upload, the API returns full delivery URLs, so the app doesn’t need the hash or delivery URL in env.  
- **To enable uploads:** Create an API token with Images + Stream permissions. Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in your env.

---

### 3. R2 (for non-image files only)

Used for **PDFs, documents, zips** (course materials, lesson resources, message attachments that are not images).

Create an R2 bucket and **R2 API token** (read/write) in the dashboard.

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID. |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 API token access key. |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 API token secret key. |
| `CLOUDFLARE_R2_BUCKET_NAME` | Bucket name (e.g. `skillstream-media`). |

**Public URLs for R2:** If you serve non-image files from a custom domain, set:

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_R2_PUBLIC_BASE_URL` | Base URL for public read (e.g. `https://media.skillstream.world`). No trailing slash. |

---

## Where each service is used

| Feature | With Images configured | Without Images |
|---------|------------------------|----------------|
| Profile picture (avatar) | **Cloudflare Images** (POST /api/users/me/upload-image) | R2 (avatars folder) |
| Course/lesson thumbnails | **Cloudflare Images** (resources/upload when image) | R2 |
| Course materials (images) | **Cloudflare Images** (media materials) | R2 |
| Course materials (PDFs, etc.) | R2 | R2 |
| Lesson resources (images) | **Cloudflare Images** | R2 |
| Lesson resources (non-image) | R2 | R2 |
| Message attachments (images) | **Cloudflare Images** | R2 |
| Message attachments (non-image) | R2 | R2 |
| Lesson videos | **Cloudflare Stream** | **Cloudflare Stream** |
| Live streams | **Cloudflare Stream** | **Cloudflare Stream** |

---

## Summary

- **Images + Stream** → same credentials: set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (token needs Images Write + Stream Edit).
- **Non-image files** → R2 (set R2 env vars; optional `CLOUDFLARE_R2_PUBLIC_BASE_URL` for public URLs).

No other storage (local disk, S3) is used for these uploads.
