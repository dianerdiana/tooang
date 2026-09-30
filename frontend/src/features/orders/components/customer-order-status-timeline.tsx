import {
  CheckCircle2Icon,
  CircleIcon,
  CircleXIcon,
  Clock3Icon,
  CookingPotIcon,
  type LucideIcon,
  PackageCheckIcon,
} from 'lucide-react';

import { cn } from '@/utils/utils';

import { ORDER_STATUS, type OrderDetail } from '../types/order.type';

type TimelineItem = {
  id: string;
  label: string;
  state: 'reached' | 'current' | 'upcoming' | 'terminal';
  timestamp?: string | null;
  detail?: string;
  icon: LucideIcon;
};

const fulfillmentStages: TimelineItem[] = [
  { id: 'confirmed', label: 'Confirmed', state: 'upcoming', icon: CheckCircle2Icon },
  { id: 'preparing', label: 'Preparing', state: 'upcoming', icon: CookingPotIcon },
  { id: 'ready', label: 'Ready', state: 'upcoming', icon: PackageCheckIcon },
  { id: 'completed', label: 'Completed', state: 'upcoming', icon: CheckCircle2Icon },
];

const stageRank = {
  [ORDER_STATUS.CONFIRMED]: 0,
  [ORDER_STATUS.PREPARING]: 1,
  [ORDER_STATUS.READY]: 2,
  [ORDER_STATUS.COMPLETED]: 3,
} as const;

export function buildCustomerOrderTimeline(order: OrderDetail, pendingExpiryElapsed = false): TimelineItem[] {
  const placed: TimelineItem = {
    id: 'placed',
    label: 'Order placed',
    state: 'reached',
    timestamp: order.createdAt,
    icon: CheckCircle2Icon,
  };

  if (order.status === ORDER_STATUS.PENDING) {
    return [
      placed,
      {
        id: 'pending',
        label: pendingExpiryElapsed ? 'Confirmation overdue' : 'Awaiting confirmation',
        state: 'current',
        detail: pendingExpiryElapsed
          ? 'The displayed status may be stale and is being refreshed.'
          : 'The place has not confirmed this order yet.',
        icon: Clock3Icon,
      },
    ];
  }

  if (order.status === ORDER_STATUS.EXPIRED) {
    return [
      placed,
      {
        id: 'expired',
        label: 'Expired',
        state: 'terminal',
        timestamp: order.expiresAt,
        detail: 'The order ended before confirmation. Later fulfillment stages do not apply.',
        icon: Clock3Icon,
      },
    ];
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    return [
      placed,
      ...(order.confirmedAt
        ? [
            {
              id: 'confirmed',
              label: 'Confirmed',
              state: 'reached' as const,
              timestamp: order.confirmedAt,
              icon: CheckCircle2Icon,
            },
          ]
        : []),
      {
        id: 'cancelled',
        label: 'Cancelled',
        state: 'terminal',
        timestamp: order.cancelledAt,
        detail: 'The order ended here. Later fulfillment stages do not apply.',
        icon: CircleXIcon,
      },
    ];
  }

  const currentRank = stageRank[order.status];
  return [
    placed,
    ...fulfillmentStages.map((stage, index): TimelineItem => {
      const reached = index < currentRank;
      const current = index === currentRank;
      const timestamp =
        stage.id === 'confirmed' ? order.confirmedAt : stage.id === 'completed' ? order.completedAt : undefined;
      return {
        ...stage,
        state: current ? 'current' : reached ? 'reached' : 'upcoming',
        timestamp,
        ...(reached && timestamp === undefined
          ? { detail: 'Reached; the API does not provide a timestamp for this stage.' }
          : {}),
        ...(current && timestamp === undefined
          ? { detail: 'Current status; the API does not provide a timestamp for this stage.' }
          : {}),
      };
    }),
  ];
}

const exactDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function CustomerOrderStatusTimeline({
  order,
  pendingExpiryElapsed = false,
}: {
  order: OrderDetail;
  pendingExpiryElapsed?: boolean;
}) {
  const items = buildCustomerOrderTimeline(order, pendingExpiryElapsed);

  return (
    <section className='rounded-surface border bg-surface p-5' aria-labelledby='order-progress-title'>
      <h2 id='order-progress-title' className='text-lg font-semibold'>
        Order progress
      </h2>
      <ol className='mt-5' aria-label='Order status timeline'>
        {items.map((item, index) => {
          const Icon = item.icon ?? CircleIcon;
          const active = item.state === 'current' || item.state === 'terminal';
          const muted = item.state === 'upcoming';
          return (
            <li key={item.id} className='relative grid grid-cols-[2rem_1fr] gap-3 pb-6 last:pb-0'>
              {index < items.length - 1 && (
                <span
                  className={cn('absolute top-7 bottom-0 left-[0.9375rem] w-px', muted ? 'bg-border' : 'bg-primary/45')}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'relative z-10 flex size-8 items-center justify-center rounded-full border bg-surface',
                  item.state === 'terminal' && 'border-destructive/50 text-destructive',
                  item.state === 'current' && 'border-primary bg-primary-subtle text-primary',
                  item.state === 'reached' && 'border-success/50 text-success',
                  muted && 'border-border text-muted-foreground',
                )}
                aria-hidden
              >
                <Icon className='size-4' />
              </span>
              <div className='min-w-0 pt-1'>
                <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
                  <p className={cn('font-medium', muted && 'text-muted-foreground')}>{item.label}</p>
                  {active && <span className='text-xs font-semibold uppercase tracking-wide'>{item.state}</span>}
                </div>
                {item.timestamp && (
                  <time className='mt-1 block text-sm text-muted-foreground' dateTime={item.timestamp}>
                    {exactDateTime(item.timestamp)}
                  </time>
                )}
                {item.detail && <p className='mt-1 text-sm text-muted-foreground'>{item.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export { CustomerOrderStatusTimeline, type TimelineItem };
