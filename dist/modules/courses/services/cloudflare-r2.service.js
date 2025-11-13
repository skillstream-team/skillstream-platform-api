"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareR2Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
class CloudflareR2Service {
    constructor() {
        this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'skillstream-media';
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
        const key = this.generateKey(data.courseId, data.type, data.filename);
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: data.file,
            ContentType: data.contentType,
            Metadata: {
                courseId: data.courseId.toString(),
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
    async deleteFile(key) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });
        await this.s3Client.send(command);
    }
    async getSignedUrl(key, expiresIn = 3600) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });
        return await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn });
    }
    async getFileUrl(key) {
        return `https://${this.bucketName}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
    }
    generateKey(courseId, type, filename) {
        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `courses/${courseId}/${type}/${timestamp}_${sanitizedFilename}`;
    }
    // Get file metadata
    async getFileMetadata(key) {
        try {
            const command = new client_s3_1.GetObjectCommand({
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
        }
        catch (error) {
            throw new Error(`Failed to get file metadata: ${error}`);
        }
    }
    // List files for a course
    async listCourseFiles(courseId, type) {
        // This would require implementing a list operation
        // For now, we'll rely on database records
        throw new Error('List operation not implemented - use database queries instead');
    }
}
exports.CloudflareR2Service = CloudflareR2Service;
