'use client';

import * as React from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

/**
 * Reusable Cloudflare Turnstile widget (Decision D-11).
 * In local dev / test environments without NEXT_PUBLIC_TURNSTILE_SITE_KEY,
 * emits a dev pass-through token so forms work seamlessly without blocking E2E/dev flows.
 */
export function TurnstileWidget({ onVerify, onExpire, className }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const onVerifyRef = React.useRef(onVerify);
  const onExpireRef = React.useRef(onExpire);

  onVerifyRef.current = onVerify;
  onExpireRef.current = onExpire;

  React.useEffect(() => {
    if (!siteKey) {
      onVerifyRef.current('bypass-local-dev-token');
      return;
    }

    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: (token: string) => onVerifyRef.current(token),
        'expired-callback': () => {
          onVerifyRef.current('');
          onExpireRef.current?.();
        },
        'error-callback': () => {
          onVerifyRef.current('');
        },
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );
      if (existingScript) {
        existingScript.addEventListener('load', renderWidget);
      } else {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}
