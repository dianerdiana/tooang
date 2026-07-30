import { CheckCircle2Icon, CircleXIcon, Clock3Icon, CookingPotIcon, type LucideIcon } from 'lucide-react';

import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';

import { ORDER_STATUS, type OrderStatus } from '../types/order.type';

type OrderStatusPresentation = {
  label: string;
  tone: StatusBadgeTone;
  icon: LucideIcon;
  attentionClassName?: string;
};

export const orderStatusPresentation: Record<OrderStatus, OrderStatusPresentation> = {
  [ORDER_STATUS.PENDING]: {
    label: 'Pending',
    tone: 'warning',
    icon: Clock3Icon,
    attentionClassName: 'border-warning/60 bg-warning/10 shadow-sm',
  },
  [ORDER_STATUS.CONFIRMED]: { label: 'Confirmed', tone: 'primary', icon: CheckCircle2Icon },
  [ORDER_STATUS.PREPARING]: { label: 'Preparing', tone: 'primary', icon: CookingPotIcon },
  [ORDER_STATUS.READY]: {
    label: 'Ready',
    tone: 'success',
    icon: CheckCircle2Icon,
    attentionClassName: 'border-success/60 bg-success/10 shadow-sm',
  },
  [ORDER_STATUS.COMPLETED]: { label: 'Completed', tone: 'success', icon: CheckCircle2Icon },
  [ORDER_STATUS.CANCELLED]: { label: 'Cancelled', tone: 'destructive', icon: CircleXIcon },
  [ORDER_STATUS.EXPIRED]: { label: 'Expired', tone: 'neutral', icon: Clock3Icon },
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const presentation = orderStatusPresentation[status];
  const Icon = presentation.icon;

  return (
    <StatusBadge tone={presentation.tone} aria-label={`Order status: ${presentation.label}`}>
      <Icon className='size-3.5' aria-hidden />
      {presentation.label}
    </StatusBadge>
  );
}

export { OrderStatusBadge };
