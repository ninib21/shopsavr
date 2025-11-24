import Tesseract from 'tesseract.js';
import { ParsedReceiptData } from './receiptService';

/**
 * Extract text from receipt image using OCR
 */
export async function extractTextFromImage(
  imageBuffer: Buffer
): Promise<string> {
  try {
    const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          // Progress logging can be added here
        }
      },
    });

    return data.text;
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract text from receipt image');
  }
}

/**
 * Parse receipt text into structured data
 */
export function parseReceiptText(text: string): ParsedReceiptData {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

  const result: ParsedReceiptData = {
    items: [],
  };

  // Extract store name (usually first line or contains "STORE", "WALMART", etc.)
  const storePatterns = [
    /^(WALMART|TARGET|AMAZON|BEST BUY|HOME DEPOT|LOWE'S|MACY'S|NIKE|ADIDAS)/i,
    /^([A-Z\s&]+)\s*$/,
  ];

  for (const line of lines.slice(0, 5)) {
    for (const pattern of storePatterns) {
      const match = line.match(pattern);
      if (match) {
        result.storeName = match[0].trim();
        break;
      }
    }
    if (result.storeName) break;
  }

  // Extract date
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2},?\s+\d{2,4}/i,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          result.date = new Date(match[1]);
          if (!isNaN(result.date.getTime())) {
            break;
          }
        } catch (e) {
          // Invalid date, continue
        }
      }
    }
    if (result.date) break;
  }

  // Extract total amount
  const totalPatterns = [
    /TOTAL[:\s]*\$?(\d+\.\d{2})/i,
    /AMOUNT[:\s]*\$?(\d+\.\d{2})/i,
    /TOTAL DUE[:\s]*\$?(\d+\.\d{2})/i,
    /\$(\d+\.\d{2})\s*$/,
  ];

  for (const line of lines.reverse()) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        result.totalAmount = parseFloat(match[1]);
        break;
      }
    }
    if (result.totalAmount) break;
  }

  // Extract items (lines with prices)
  const itemPattern = /^(.+?)\s+\$?(\d+\.\d{2})$/;
  const items: Array<{ name: string; price: number }> = [];

  for (const line of lines) {
    // Skip header/footer lines
    if (
      line.match(/TOTAL|SUBTOTAL|TAX|DISCOUNT|STORE|RECEIPT|THANK/i) ||
      line.length < 5
    ) {
      continue;
    }

    const match = line.match(itemPattern);
    if (match) {
      const name = match[1].trim();
      const price = parseFloat(match[2]);

      // Filter out obvious non-items
      if (
        name.length > 2 &&
        price > 0 &&
        price < 10000 &&
        !name.match(/^[0-9]+$/)
      ) {
        items.push({ name, price });
      }
    }
  }

  result.items = items;
  result.itemsCount = items.length;

  return result;
}

/**
 * Process receipt image: OCR + parsing
 */
export async function processReceiptImage(
  imageBuffer: Buffer
): Promise<ParsedReceiptData> {
  // Extract text using OCR
  const text = await extractTextFromImage(imageBuffer);

  // Parse text into structured data
  const parsedData = parseReceiptText(text);

  return parsedData;
}

