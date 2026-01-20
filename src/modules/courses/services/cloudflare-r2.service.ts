import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadFileDto {
  file: Buffer;
  filename: string;
  contentType: string;
  collectionId: string;
  type: 'pdf' | 'image' | 'document' | 'zip' | 'other';
}

export interface FileResponseDto {
  key: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

export class CloudflareR2Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'skillstream-media';
    
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(data: UploadFileDto): Promise<FileResponseDto> {
    const key = this.generateKey(data.collectionId, data.type, data.filename);
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: data.file,
      ContentType: data.contentType,
      Metadata: {
        collectionId: data.collectionId.toString(),
        type: data.type,
        originalFilename: data.filename,
      },
    });

    await this.s3Client.send(command);

    return {
      key,
      url: `https://${this.bucketName}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`,
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

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getFileUrl(key: string): Promise<string> {
    return `https://${this.bucketName}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
  }

  private generateKey(courseId: string, type: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `courses/${courseId}/${type}/${timestamp}_${sanitizedFilename}`;
  }

  // Get file metadata
  async getFileMetadata(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }

  // List files for a course
  async listCourseFiles(courseId: string, type?: string) {
    // This would require implementing a list operation
    // For now, we'll rely on database records
    throw new Error('List operation not implemented - use database queries instead');
  }
}
