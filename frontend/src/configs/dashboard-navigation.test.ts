import { describe, expect, it } from 'vitest';

import { baseDashboardNavigation } from './dashboard-navigation';

describe('baseDashboardNavigation', () => {
  it('provides grouped route data outside the dashboard layout', () => {
    expect(baseDashboardNavigation).toHaveLength(1);
    expect(baseDashboardNavigation[0]).toMatchObject({
      id: 'general',
      label: 'General',
      items: [{ id: 'overview', label: 'Overview', to: '/dashboard', exact: true }],
    });
  });
});
