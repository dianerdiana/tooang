import type { MouseEvent, ReactNode } from 'react';

import { Link, useNavigate } from '@tanstack/react-router';

import { createProtectedActionIntent, type ProtectedActionIntentInput } from '@/utils/auth/protected-action-intent';

type ProtectedActionLoginLinkProps = {
  children: ReactNode;
  className?: string;
  intent: ProtectedActionIntentInput;
  ariaCurrent?: 'page';
};

function ProtectedActionLoginLink({ children, className, intent, ariaCurrent }: ProtectedActionLoginLinkProps) {
  const navigate = useNavigate();
  const fallbackRedirect = intent.returnTo ?? '/';

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const storedIntent = createProtectedActionIntent(intent);
    void navigate({
      to: '/login',
      search: {
        redirect: storedIntent?.returnTo ?? fallbackRedirect,
        ...(storedIntent ? { intent: storedIntent.id } : {}),
      },
    });
  };

  return (
    <Link
      to='/login'
      search={{ redirect: fallbackRedirect }}
      className={className}
      aria-current={ariaCurrent}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}

export { ProtectedActionLoginLink, type ProtectedActionLoginLinkProps };
