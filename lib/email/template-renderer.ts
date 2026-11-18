/**
 * Replaces {{tag}} merge variables safely with sanitized values.
 */
export function substituteMergeTags(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined || val === null) return '';
    // Basic HTML escaping for safe insertion
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  });
}

/**
 * Wraps content in a standardized responsive HTML email container matching VOWS branding.
 */
export function wrapInBrandedEmailLayout(params: {
  title: string;
  bodyContent: string;
  studioName?: string;
  actionButton?: {
    label: string;
    url: string;
  };
}): string {
  const studioName = params.studioName || 'VOWS';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f4; margin: 0; padding: 0; color: #1c1917; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; border: 1px solid #e7e5e4; }
    .header { padding: 32px 32px 24px 32px; border-bottom: 1px solid #f5f5f4; text-align: center; }
    .logo-img { display: block; margin: 0 auto; max-height: 48px; width: auto; }
    .content { padding: 32px; font-size: 15px; line-height: 1.6; color: #44403c; }
    .content p { margin-top: 0; margin-bottom: 16px; }
    .button-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #1c1917; color: #ffffff !important; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 4px; letter-spacing: 0.5px; }
    .footer { padding: 24px 32px; background-color: #fafaf9; border-top: 1px solid #f5f5f4; text-align: center; font-size: 12px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://vows-studio-one.vercel.app/images/logo-light.png" alt="${studioName}" width="140" class="logo-img" />
    </div>
    <div class="content">
      ${params.bodyContent}
      ${
        params.actionButton
          ? `<div class="button-container"><a href="${params.actionButton.url}" class="btn" target="_blank">${params.actionButton.label}</a></div>`
          : ''
      }
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${studioName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
