import { useEffect, useRef, useState } from 'react';

import { Loader2Icon } from 'lucide-react';

import { FormDescription, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';

import { REVIEW_COMMENT_MAX_LENGTH, reviewDraftSchema, reviewUnicodeLength } from '../schemas/reviews.schema';
import type { ReviewUpdateInput } from '../types/reviews.type';

import { StarRatingInput } from './star-rating-input';

type ReviewFormDialogProps = {
  trigger: React.ReactNode;
  title: string;
  description: string;
  submitLabel: string;
  initialRating?: number;
  initialComment?: string | null;
  pending?: boolean;
  error?: unknown;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: Required<Pick<ReviewUpdateInput, 'rating' | 'comment'>>) => Promise<void>;
};

export function ReviewFormDialog({
  trigger,
  title,
  description,
  submitLabel,
  initialRating = 0,
  initialComment = '',
  pending = false,
  error,
  open: controlledOpen,
  onOpenChange,
  onSubmit,
}: ReviewFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment ?? '');
  const [fieldErrors, setFieldErrors] = useState<{ rating?: string; comment?: string }>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (next) {
      setRating(initialRating);
      setComment(initialComment ?? '');
      setFieldErrors({});
    }
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (error && open) summaryRef.current?.focus();
  }, [error, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    const parsed = reviewDraftSchema.safeParse({ rating, comment });
    if (!parsed.success) {
      const nextErrors: { rating?: string; comment?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'rating' || field === 'comment') && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setFieldErrors(nextErrors);
      if (nextErrors.rating) {
        document.getElementsByName(`rating-${title}`)[0]?.focus();
      } else {
        commentRef.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    try {
      await onSubmit({ rating: parsed.data.rating, comment: parsed.data.comment ?? null });
      setOpen(false);
    } catch {
      // The mutation error is rendered above while the current draft remains intact.
    }
  };

  const presentation = error ? getCustomerErrorPresentation(error) : undefined;
  const commentLength = reviewUnicodeLength(comment.normalize('NFC').trim());
  const inputName = `rating-${title}`;

  return (
    <Sheet open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side='bottom'
        className='max-h-[92vh] rounded-t-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border'
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form className='min-h-0 overflow-y-auto px-card' noValidate aria-busy={pending || undefined} onSubmit={submit}>
          <div className='grid gap-5 pb-4'>
            {presentation && (
              <CustomerAlert
                ref={summaryRef}
                tabIndex={-1}
                tone={presentation.tone === 'conflict' ? 'warning' : 'error'}
                title={presentation.title}
                description={presentation.description}
                live
              />
            )}

            <FormField error={fieldErrors.rating}>
              <FormLabel asChild>
                <span>Rating</span>
              </FormLabel>
              <StarRatingInput
                name={inputName}
                value={rating}
                onChange={(value) => {
                  setRating(value);
                  setFieldErrors((current) => ({ ...current, rating: undefined }));
                }}
                disabled={pending}
                invalid={Boolean(fieldErrors.rating)}
              />
              <FormDescription>Choose from 1 to 5 stars.</FormDescription>
              <FormMessage />
            </FormField>

            <FormField id={`${inputName}-comment`} error={fieldErrors.comment}>
              <FormLabel>Comment (optional)</FormLabel>
              <textarea
                ref={commentRef}
                id={`${inputName}-comment`}
                className='min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
                value={comment}
                disabled={pending}
                aria-invalid={Boolean(fieldErrors.comment) || undefined}
                aria-describedby={`${inputName}-comment-description ${inputName}-comment-message`}
                onChange={(event) => {
                  setComment(event.target.value);
                  setFieldErrors((current) => ({ ...current, comment: undefined }));
                }}
              />
              <FormDescription>
                {commentLength.toLocaleString()}/{REVIEW_COMMENT_MAX_LENGTH.toLocaleString()} characters
              </FormDescription>
              <FormMessage />
            </FormField>
          </div>
          <SheetFooter className='sticky bottom-0 -mx-card border-t bg-surface'>
            <Button type='button' variant='outline' disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={pending}>
              {pending && <Loader2Icon className='animate-spin motion-reduce:animate-none' aria-hidden />}
              {pending ? 'Saving…' : submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
