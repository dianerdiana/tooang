import { useEffect, useRef, useState } from 'react';

import { CustomerAlert } from '@/components/ui/customer-alert';

import {
  consumeProtectedActionIntent,
  type ConsumeProtectedActionIntentOptions,
  type ConsumeProtectedActionIntentResult,
  type ProtectedActionIntent,
} from '@/utils/auth/protected-action-intent';

type ProtectedActionRecoveryOptions = Omit<ConsumeProtectedActionIntentOptions, 'storage' | 'now' | 'origin'>;

const recoveryCopy: Record<ProtectedActionIntent['kind'], { title: string; description: string }> = {
  'add-to-cart': {
    title: 'Your item draft was restored',
    description: 'Review the quantity and note, then choose Add to cart when you are ready.',
  },
  checkout: {
    title: 'Your checkout place was restored',
    description: 'Review the current cart and checkout details before placing the order.',
  },
  orders: {
    title: 'You are back in your orders',
    description: 'Your order history is ready to review.',
  },
  account: {
    title: 'You are back in your account',
    description: 'Continue with the account area you selected.',
  },
  review: {
    title: 'Your review goal was restored',
    description: 'Choose an eligible completed order, then confirm the review details before submitting.',
  },
};

function useProtectedActionRecovery(options: ProtectedActionRecoveryOptions) {
  const [result, setResult] = useState<ConsumeProtectedActionIntentResult>({ status: 'missing' });
  const consumed = useRef(false);
  const { currentUrl, intentId, menuItemId, placeId, placeSlug } = options;

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;
    setResult(consumeProtectedActionIntent({ currentUrl, intentId, menuItemId, placeId, placeSlug }));
  }, [currentUrl, intentId, menuItemId, placeId, placeSlug]);

  return result;
}

type ProtectedActionRecoveryNoticeProps = {
  result: ConsumeProtectedActionIntentResult;
  focusRestoredDraft?: boolean;
};

function ProtectedActionRecoveryNotice({ result, focusRestoredDraft = false }: ProtectedActionRecoveryNoticeProps) {
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result.status !== 'consumed') return;
    if (focusRestoredDraft) {
      noticeRef.current?.focus();
      return;
    }
    document.querySelector<HTMLElement>('#main-content h1')?.focus();
  }, [focusRestoredDraft, result]);

  if (result.status === 'missing') return null;
  if (result.status === 'mismatch') {
    return (
      <CustomerAlert
        tone='warning'
        title='The saved action could not be restored'
        description='The saved place or item no longer matches this page. Nothing was submitted.'
        live
      />
    );
  }

  const copy = recoveryCopy[result.intent.kind];
  return (
    <div ref={noticeRef} tabIndex={focusRestoredDraft ? -1 : undefined}>
      <CustomerAlert tone='info' title={copy.title} description={copy.description} live />
    </div>
  );
}

export {
  ProtectedActionRecoveryNotice,
  type ProtectedActionRecoveryNoticeProps,
  type ProtectedActionRecoveryOptions,
  useProtectedActionRecovery,
};
