/**
 * VOWS — File Upload Safety & Anti-Abuse Validator
 * Reference: SECURITY_PLAN §8 ("Storage security"), §15 ("Upload abuse")
 */

export interface FileUploadValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
}

const DISALLOWED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'php3', 'php4', 'php5',
  'pl', 'py', 'js', 'mjs', 'cjs', 'vbs', 'scr', 'msi', 'com', 'jar',
  'dll', 'jsp', 'asp', 'aspx', 'cgi',
]);

const ALLOWED_DOCUMENT_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_MEDIA_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/svg+xml',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export function validateFileUpload(params: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  bucket: 'documents' | 'portfolio' | 'public_assets';
  fileContentText?: string;
}): FileUploadValidationResult {
  const { filename, mimeType, sizeBytes, bucket, fileContentText } = params;

  // 1. Check file size (Documents: 15MB, Portfolio/Media: 100MB)
  const maxBytes = bucket === 'documents' ? 15 * 1024 * 1024 : 100 * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    return {
      valid: false,
      error: `File size ${(sizeBytes / (1024 * 1024)).toFixed(1)}MB exceeds maximum allowed limit of ${maxBytes / (1024 * 1024)}MB.`,
    };
  }

  // 2. Check filename extension
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) {
    return { valid: false, error: 'File must have a valid extension.' };
  }

  const extension = parts[parts.length - 1];

  // Anti-double-extension protection (e.g. invoice.php.jpg or album.jpg.exe)
  if (parts.length > 2) {
    for (let i = 1; i < parts.length - 1; i++) {
      if (DISALLOWED_EXTENSIONS.has(parts[i])) {
        return {
          valid: false,
          error: 'Double extensions containing executable types are prohibited.',
        };
      }
    }
  }

  // Disallow executable extensions
  if (DISALLOWED_EXTENSIONS.has(extension)) {
    return { valid: false, error: `Files with .${extension} extension are prohibited for security.` };
  }

  // 3. MIME type verification
  if (bucket === 'documents') {
    if (!ALLOWED_DOCUMENT_MIMES.has(mimeType)) {
      return {
        valid: false,
        error: `MIME type "${mimeType}" is not permitted for studio document storage.`,
      };
    }
  } else {
    if (!ALLOWED_MEDIA_MIMES.has(mimeType)) {
      return {
        valid: false,
        error: `MIME type "${mimeType}" is not permitted for media storage.`,
      };
    }
  }

  // 4. SVG Anti-XSS check (if SVG payload is uploaded)
  if (extension === 'svg' || mimeType === 'image/svg+xml') {
    if (fileContentText) {
      const lower = fileContentText.toLowerCase();
      if (
        lower.includes('<script') ||
        lower.includes('javascript:') ||
        lower.includes('onload=') ||
        lower.includes('onerror=') ||
        lower.includes('onclick=')
      ) {
        return {
          valid: false,
          error: 'SVG contains active script elements or event handlers and was blocked.',
        };
      }
    }
  }

  // Sanitized clean filename (strip path traversal characters like ../)
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.');

  return { valid: true, sanitizedFilename };
}
