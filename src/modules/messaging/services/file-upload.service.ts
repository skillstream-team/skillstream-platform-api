// src/modules/messaging/services/file-upload.service.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { FileUploadDto, FileUploadResponseDto } from '../dtos/message.dto';

export class MessagingFileUploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicBaseUrl: string | null;

  constructor() {
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'skillstream-media';
    const base = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL;
    this.publicBaseUrl = base && base.replace(/\/+$/, '') ? base.replace(/\/+$/, '') : null;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(data: FileUploadDto): Promise<FileUploadResponseDto> {
    const key = this.generateKey(data.conversationId, data.filename);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: data.file,
      ContentType: data.contentType,
      Metadata: {
        conversationId: data.conversationId || 'general',
        originalFilename: data.filename,
      },
    });

    await this.s3Client.send(command);

    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl}/${key}`
      : `https://${this.bucketName}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

    return {
      key,
      url,
      filename: data.filename,
      size: data.file.length,
      contentType: data.contentType,
      uploadedAt: new Date(),
    };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  private generateKey(conversationId: string | undefined, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const prefix = conversationId ? `messages/${conversationId}` : 'messages/general';
    return `${prefix}/${timestamp}-${sanitizedFilename}`;
  }
}

