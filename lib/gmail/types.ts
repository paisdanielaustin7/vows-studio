export type GmailConnectionStatus = 'connected' | 'needs_reconnect' | 'disconnected';

export interface GmailStatus {
  status: GmailConnectionStatus;
  googleEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  documentType?: 'quotation' | 'invoice' | 'receipt' | 'credit_note' | 'contract' | 'invitation' | 'password_reset';
  documentId?: string;
  clientId?: string;
  attachment?: {
    filename: string;
    content: Buffer;
    contentType: string;
  };
  idempotencyKey: string;
}

export interface EmailSendResult {
  messageId: string;
  idempotencyKey: string;
  sentAt: string;
}
