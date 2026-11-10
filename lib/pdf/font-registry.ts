import path from 'node:path';
import { Font } from '@react-pdf/renderer';

let fontsRegistered = false;

export function registerFonts(): void {
  if (fontsRegistered) return;

  try {
    const regularPath = path.resolve(process.cwd(), 'lib/pdf/fonts/Carlito-Regular.ttf');
    const boldPath = path.resolve(process.cwd(), 'lib/pdf/fonts/Carlito-Bold.ttf');

    Font.register({
      family: 'Carlito',
      fonts: [
        { src: regularPath, fontWeight: 'normal' },
        { src: boldPath, fontWeight: 'bold' },
      ],
    });

    // Disable hyphenation for clean financial line items
    Font.registerHyphenationCallback((word) => [word]);

    fontsRegistered = true;
  } catch (err) {
    console.error('Failed to register PDF fonts:', err);
  }
}
