import {
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleXIcon,
  Clock3Icon,
  CookingPotIcon,
  type LucideIcon,
  StoreIcon,
} from 'lucide-react';

import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';

const CUSTOMER_ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

type CustomerOrderStatus = (typeof CUSTOMER_ORDER_STATUS)[keyof typeof CUSTOMER_ORDER_STATUS];

type StatusPresentation = { label: string; tone: StatusBadgeTone; icon: LucideIcon };

const customerOrderStatusPresentation: Record<CustomerOrderStatus, StatusPresentation> = {
  PENDING: { label: 'Pending', tone: 'warning', icon: Clock3Icon },
  CONFIRMED: { label: 'Confirmed', tone: 'info', icon: CheckCircle2Icon },
  PREPARING: { label: 'Preparing', tone: 'info', icon: CookingPotIcon },
  READY: { label: 'Ready', tone: 'success', icon: CheckCircle2Icon },
  COMPLETED: { label: 'Completed', tone: 'success', icon: CheckCircle2Icon },
  CANCELLED: { label: 'Cancelled', tone: 'destructive', icon: CircleXIcon },
  EXPIRED: { label: 'Expired', tone: 'neutral', icon: Clock3Icon },
};

function CustomerOrderStatusBadge({ status }: { status: CustomerOrderStatus }) {
  const presentation = customerOrderStatusPresentation[status];
  const Icon = presentation.icon;
  return (
    <StatusBadge tone={presentation.tone} aria-label={`Order status: ${presentation.label}`}>
      <Icon className='size-3.5' aria-hidden />
      {presentation.label}
    </StatusBadge>
  );
}

type OpenState = 'OPEN' | 'CLOSED' | 'ORDERING_DISABLED';

const openStatePresentation: Record<OpenState, StatusPresentation> = {
  OPEN: { label: 'Open', tone: 'success', icon: StoreIcon },
  CLOSED: { label: 'Closed', tone: 'neutral', icon: Clock3Icon },
  ORDERING_DISABLED: { label: 'Ordering unavailable', tone: 'warning', icon: CircleAlertIcon },
};

function PlaceOpenStateBadge({ state }: { state: OpenState }) {
  const presentation = openStatePresentation[state];
  const Icon = presentation.icon;
  return (
    <StatusBadge tone={presentation.tone} aria-label={`Place status: ${presentation.label}`}>
      <Icon className='size-3.5' aria-hidden />
      {presentation.label}
    </StatusBadge>
  );
}

function PlaceOrderingStateBadge({ enabled }: { enabled: boolean }) {
  const presentation: StatusPresentation = enabled
    ? { label: 'Ordering available', tone: 'success', icon: CheckCircle2Icon }
    : openStatePresentation.ORDERING_DISABLED;
  const Icon = presentation.icon;

  return (
    <StatusBadge tone={presentation.tone} aria-label={`Ordering status: ${presentation.label}`}>
      <Icon className='size-3.5' aria-hidden />
      {presentation.label}
    </StatusBadge>
  );
}

export {
  CUSTOMER_ORDER_STATUS,
  type CustomerOrderStatus,
  CustomerOrderStatusBadge,
  customerOrderStatusPresentation,
  type OpenState,
  openStatePresentation,
  PlaceOpenStateBadge,
  PlaceOrderingStateBadge,
};
