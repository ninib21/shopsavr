import { PrismaClient } from '@prisma/client';
import { S3 } from 'aws-sdk';
import env from '../config/env';

const prisma = new PrismaClient();

// Initialize S3 client
const s3 = new S3({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION || 'us-east-1',
});

export interface ReceiptUploadResult {
  receiptId: string;
  imageUrl: string;
  uploadStatus: 'success' | 'failed';
}

export interface ParsedReceiptData {
  storeName?: string;
  totalAmount?: number;
  items?: Array<{
    name: string;
    price: number;
    quantity?: number;
  }>;
  date?: Date;
  itemsCount?: number;
}

/**
 * Upload receipt image to S3
 */
export async function uploadReceiptImage(
  userId: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<ReceiptUploadResult> {
  const fileName = `receipts/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const bucketName = env.AWS_S3_BUCKET || 'shopsavr-receipts';

  try {
    const uploadResult = await s3
      .upload({
        Bucket: bucketName,
        Key: fileName,
        Body: imageBuffer,
        ContentType: mimeType,
        ACL: 'private',
      })
      .promise();

    // Create receipt record in database
    const receipt = await prisma.receipt.create({
      data: {
        userId,
        imageUrl: uploadResult.Location,
      },
    });

    return {
      receiptId: receipt.id,
      imageUrl: uploadResult.Location,
      uploadStatus: 'success',
    };
  } catch (error) {
    console.error('Receipt upload error:', error);
    throw new Error('Failed to upload receipt image');
  }
}

/**
 * Update receipt with parsed data
 */
export async function updateReceiptWithParsedData(
  receiptId: string,
  parsedData: ParsedReceiptData
): Promise<void> {
  await prisma.receipt.update({
    where: { id: receiptId },
    data: {
      storeName: parsedData.storeName,
      totalAmount: parsedData.totalAmount,
      extractedData: parsedData as any,
    },
  });
}

/**
 * Get user receipts
 */
export async function getUserReceipts(userId: string) {
  return prisma.receipt.findMany({
    where: { userId },
    orderBy: { scannedAt: 'desc' },
    select: {
      id: true,
      imageUrl: true,
      storeName: true,
      totalAmount: true,
      scannedAt: true,
    },
  });
}

/**
 * Get receipt by ID
 */
export async function getReceiptById(receiptId: string, userId: string) {
  const receipt = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      userId,
    },
  });

  if (!receipt) {
    throw new Error('Receipt not found');
  }

  return receipt;
}

/**
 * Delete receipt
 */
export async function deleteReceipt(receiptId: string, userId: string): Promise<void> {
  const receipt = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      userId,
    },
  });

  if (!receipt) {
    throw new Error('Receipt not found');
  }

  // Delete from S3 (extract key from URL)
  if (receipt.imageUrl) {
    try {
      const urlParts = receipt.imageUrl.split('/');
      const s3Key = urlParts.slice(-2).join('/'); // receipts/userId/filename
      await s3
        .deleteObject({
          Bucket: env.AWS_S3_BUCKET || 'shopsavr-receipts',
          Key: s3Key,
        })
        .promise();
    } catch (error) {
      console.error('Failed to delete from S3:', error);
    }
  }

  // Delete from database
  await prisma.receipt.delete({
    where: { id: receiptId },
  });
}

