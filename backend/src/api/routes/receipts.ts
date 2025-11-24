import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import {
  uploadReceiptImage,
  updateReceiptWithParsedData,
  getUserReceipts,
  getReceiptById,
  deleteReceipt,
} from '../../services/receiptService';
import { processReceiptImage } from '../../services/receiptParser';
import { getPriceMatchResults } from '../../services/priceMatcher';

const router: Router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * POST /api/receipts/upload
 * Upload and process receipt image
 */
router.post(
  '/upload',
  authenticateToken,
  upload.single('receipt'),
  async (req: Request, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Receipt image is required',
        });
        return;
      }

      // Upload to S3
      const uploadResult = await uploadReceiptImage(
        req.userId,
        req.file.buffer,
        req.file.mimetype
      );

      // Process receipt in background (async)
      processReceiptImage(req.file.buffer)
        .then((parsedData) => {
          updateReceiptWithParsedData(uploadResult.receiptId, parsedData);
        })
        .catch((error) => {
          console.error('Receipt processing error:', error);
        });

      res.status(201).json({
        success: true,
        data: uploadResult,
        message: 'Receipt uploaded successfully',
      });
    } catch (error) {
      console.error('Upload receipt error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload receipt',
      });
    }
  }
);

/**
 * GET /api/receipts
 * Get user's receipts
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const receipts = await getUserReceipts(req.userId);

    res.json({
      success: true,
      data: receipts,
      count: receipts.length,
    });
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get receipts',
    });
  }
});

/**
 * GET /api/receipts/:id
 * Get receipt by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const receipt = await getReceiptById(req.params.id, req.userId);

    res.json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Receipt not found') {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get receipt',
    });
  }
});

/**
 * GET /api/receipts/:id/matches
 * Get price matches for receipt
 */
router.get('/:id/matches', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Verify receipt belongs to user
    await getReceiptById(req.params.id, req.userId);

    const matches = await getPriceMatchResults(req.params.id);

    res.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Receipt not found') {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    console.error('Get price matches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price matches',
    });
  }
});

/**
 * DELETE /api/receipts/:id
 * Delete receipt
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    await deleteReceipt(req.params.id, req.userId);

    res.json({
      success: true,
      message: 'Receipt deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Receipt not found') {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    console.error('Delete receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete receipt',
    });
  }
});

export default router;

