import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';

export class AWSS3Service {
  private client: S3Client;
  constructor(accessKeyId?: string, secretAccessKey?: string) {
    if (!accessKeyId) throw Error('Cannot initialize S3 client. Access key not provided.');
    if (!secretAccessKey) throw Error('Cannot initialize S3 client. Secret key not provided.');
    this.client = new S3Client({
      credentials: { accessKeyId, secretAccessKey },
      region: 'ams3',
      endpoint: process.env.DO_SPACE_ENDPOINT
    });
  }

  async saveItem(options: { name: string; file: Buffer | string; bucket?: string }) {
    let data: Buffer;
    // data is a file path
    if (typeof options.file === 'string') {
      data = await fs.readFile(options.file);
    } else {
      // data is a buffer
      data = options.file;
    }
    const command = new PutObjectCommand({
      Bucket: options.bucket || 'training-gym',
      Body: data,
      Key: options.name
    });
    await this.client.send(command);
  }
}
