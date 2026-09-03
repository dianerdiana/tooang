import * as React from 'react';

import { useRouterState } from '@tanstack/react-router';

import { Progress } from './progress';

export const TopLoadingBar = () => {
  const isPending = useRouterState({
    select: (state) => state.status === 'pending' || state.isLoading,
  });

  const [value, setValue] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(false);

  const isLoading = isPending;

  React.useEffect(() => {
    let incTimer: number | undefined;
    let doneTimer: number | undefined;

    if (isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);
      setValue((v) => (v === 0 ? 10 : v));

      incTimer = window.setInterval(() => {
        setValue((v) => {
          const remaining = 90 - v;
          const next = v + remaining * 0.15 * Math.random();
          return next >= 90 ? 90 : next;
        });
      }, 300);
    } else {
      setValue((v) => {
        if (v > 0) {
          doneTimer = window.setTimeout(() => {
            setIsVisible(false);
            window.setTimeout(() => setValue(0), 200);
          }, 300);
          return 100;
        }
        return 0;
      });
    }

    return () => {
      if (incTimer) window.clearInterval(incTimer);
      if (doneTimer) window.clearTimeout(doneTimer);
    };
  }, [isLoading]);

  if (!isVisible && value === 0) return null;

  return (
    <div
      className={`fixed left-0 top-0 z-50 w-full transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <Progress value={value} className='h-1 rounded-none bg-transparent' />
    </div>
  );
};
