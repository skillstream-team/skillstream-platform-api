"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingFileUploadService = void 0;
// src/modules/messaging/services/file-upload.service.ts
const client_s3_1 = require("@aws-sdk/client-s3");
class MessagingFileUploadService {
    constructor() {
        this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'skillstream-media';
        const base = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL;
        this.publicBaseUrl = base && base.replace(/\/+$/, '') ? base.replace(/\/+$/, '') : null;
        this.s3Client = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
            },
        });
    }
    async uploadFile(data) {
        const key = this.generateKey(data.conversationId, data.filename);
        const command = new client_s3_1.PutObjectCommand({
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
    async deleteFile(key) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });
        await this.s3Client.send(command);
    }
    generateKey(conversationId, filename) {
        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const prefix = conversationId ? `messages/${conversationId}` : 'messages/general';
        return `${prefix}/${timestamp}-${sanitizedFilename}`;
    }
}
exports.MessagingFileUploadService = MessagingFileUploadService;
