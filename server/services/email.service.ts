import { getAdminClient } from '@/lib/supabase/admin';
import { getValidAccessToken } from '@/lib/gmail/oauth';
import { buildMimeMessage, encodeBase64Url } from '@/lib/gmail/mime';
import { SendEmailParams, EmailSendResult } from '@/lib/gmail/types';

const DAILY_SOFT_BUDGET = 400;

/**
 * Sends an email via connected Gmail account with idempotency, attachments, and retry handling.
 */
export async function sendEmailService(
  params: SendEmailParams,
  actorId: string
): Promise<EmailSendResult> {
  const supabase = getAdminClient();

  // 1. Idempotency Check
  const { data: existingLog } = await supabase
    .from('email_send_log')
    .select('*')
    .eq('idempotency_key', params.idempotencyKey)
    .maybeSingle();

  if (existingLog) {
    if (existingLog.status === 'sent') {
      return {
        messageId: existingLog.gmail_message_id || 'cached-id',
        idempotencyKey: params.idempotencyKey,
        sentAt: existingLog.sent_at,
      };
    }
  }

  // 2. Soft Daily Budget Check (400 sends/day per D-03)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: dailySendsCount } = await supabase
    .from('email_send_log')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', todayStart.toISOString())
    .eq('status', 'sent');

  if ((dailySendsCount || 0) >= DAILY_SOFT_BUDGET) {
    throw new Error(
      `Daily email transmission limit reached (${dailySendsCount}/${DAILY_SOFT_BUDGET}). Please download and deliver the PDF manually.`
    );
  }

  // 3. Retrieve valid access token
  const { accessToken, senderEmail, fromName, replyTo } = await getValidAccessToken();

  // 4. Construct RFC 2822 MIME message
  const mimeMessage = buildMimeMessage({
    from: senderEmail,
    fromName: fromName || undefined,
    to: params.to,
    replyTo: replyTo || undefined,
    subject: params.subject,
    htmlBody: params.htmlBody,
    attachment: params.attachment,
  });

  const raw = encodeBase64Url(mimeMessage);

  // 5. Send via Google REST API with retry on 429/5xx
  let messageId: string | null = null;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      });

      if (response.ok) {
        const data = await response.json();
        messageId = data.id;
        break;
      }

      const status = response.status;
      const errorText = await response.text();
      lastError = `Gmail API returned ${status}: ${errorText}`;

      // Retry on 429 (rate limit) or 5xx (server error)
      if ((status === 429 || status >= 500) && attempt < 3) {
        const backoffMs = attempt * 500;
        await new Promise((res) => setTimeout(res, backoffMs));
        continue;
      }

      break;
    } catch (err: any) {
      lastError = err.message || 'Network error communicating with Gmail';
      if (attempt < 3) {
        await new Promise((res) => setTimeout(res, attempt * 500));
        continue;
      }
    }
  }

  const nowIso = new Date().toISOString();

  if (!messageId) {
    // Record failed attempt in send log
    await supabase.from('email_send_log').upsert(
      {
        document_type: params.documentType || null,
        document_id: params.documentId || null,
        client_id: params.clientId || null,
        recipient: params.to,
        subject: params.subject,
        sender_email: senderEmail,
        status: 'failed',
        error: lastError,
        idempotency_key: params.idempotencyKey,
        sent_by: actorId,
        sent_at: nowIso,
      },
      { onConflict: 'idempotency_key' }
    );

    throw new Error(
      `Failed to deliver email through Gmail (${lastError}). Please download PDF directly.`
    );
  }

  // Record successful send
  await supabase.from('email_send_log').upsert(
    {
      document_type: params.documentType || null,
      document_id: params.documentId || null,
      client_id: params.clientId || null,
      recipient: params.to,
      subject: params.subject,
      sender_email: senderEmail,
      gmail_message_id: messageId,
      status: 'sent',
      error: null,
      idempotency_key: params.idempotencyKey,
      sent_by: actorId,
      sent_at: nowIso,
    },
    { onConflict: 'idempotency_key' }
  );

  return {
    messageId,
    idempotencyKey: params.idempotencyKey,
    sentAt: nowIso,
  };
}
