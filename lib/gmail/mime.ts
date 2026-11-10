/**
 * Builds an RFC 2822 compliant MIME message string for sending via Gmail API.
 */
export function buildMimeMessage(params: {
  from: string;
  fromName?: string | null;
  to: string;
  replyTo?: string | null;
  subject: string;
  htmlBody: string;
  attachment?: {
    filename: string;
    content: Buffer;
    contentType: string;
  };
}): string {
  const boundary = `====_vows_boundary_${Date.now()}_====`;
  const fromHeader = params.fromName
    ? `"${params.fromName.replace(/"/g, '\\"')}" <${params.from}>`
    : params.from;

  const headers: string[] = [
    `From: ${fromHeader}`,
    `To: ${params.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject, 'utf-8').toString('base64')}?=`,
    `MIME-Version: 1.0`,
  ];

  if (params.replyTo) {
    headers.push(`Reply-To: ${params.replyTo}`);
  }

  if (params.attachment) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    headers.push(''); // blank line separating headers from body

    const parts: string[] = [
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      '',
      Buffer.from(params.htmlBody, 'utf-8').toString('base64'),
      '',
      `--${boundary}`,
      `Content-Type: ${params.attachment.contentType}; name="${params.attachment.filename}"`,
      `Content-Disposition: attachment; filename="${params.attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      '',
      params.attachment.content.toString('base64'),
      `--${boundary}--`,
    ];

    return headers.join('\r\n') + '\r\n' + parts.join('\r\n');
  }

  // Without attachment
  headers.push(`Content-Type: text/html; charset=UTF-8`);
  headers.push(`Content-Transfer-Encoding: base64`);
  headers.push('');
  headers.push(Buffer.from(params.htmlBody, 'utf-8').toString('base64'));

  return headers.join('\r\n');
}

/**
 * Encodes a MIME message string to base64url format for Gmail API.
 */
export function encodeBase64Url(mimeString: string): string {
  return Buffer.from(mimeString, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
