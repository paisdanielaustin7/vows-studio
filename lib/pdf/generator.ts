import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { registerFonts } from './font-registry';

/**
 * Renders a React-PDF document element into a Node.js Buffer.
 */
export async function renderPdfToBuffer(
  document: React.ReactElement
): Promise<Buffer> {
  // Ensure font registration (Carlito with ₹ glyph)
  registerFonts();

  const instance = pdf(document as any);
  const stream = await instance.toBuffer();

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
