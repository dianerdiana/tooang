import { OperationalMetricsService } from './operational-metrics.service';

describe('OperationalMetricsService', () => {
  const metrics = new OperationalMetricsService();

  it('accepts bounded low-cardinality labels', () => {
    expect(() =>
      metrics.increment('http_server_requests_total', {
        route: '/places/:placeId',
        method: 'GET',
        statusClass: '2xx',
      }),
    ).not.toThrow();
  });

  it('rejects identifier labels, oversized values, and invalid observations', () => {
    expect(() =>
      metrics.increment('http_server_requests_total', { userId: 'usr_private' }),
    ).toThrow('bounded allowlisted');
    expect(() =>
      metrics.increment('http_server_requests_total', { outcome: 'x'.repeat(121) }),
    ).toThrow('bounded allowlisted');
    expect(() => metrics.observe('database_health', Number.NaN)).toThrow('finite');
  });
});
