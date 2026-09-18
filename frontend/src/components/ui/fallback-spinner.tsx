import { LoadingState } from '@/components/ui/loading-state';

type FallbackSpinnerProps = {
  fullscreen?: boolean;
};

export function FallbackSpinner({ fullscreen = false }: FallbackSpinnerProps) {
  return <LoadingState fullscreen={fullscreen} label='Loading application' />;
}
