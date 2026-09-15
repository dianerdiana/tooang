import { Injectable } from '@nestjs/common';

export const OPERATIONAL_METRICS = [
  'http_server_requests_total',
  'http_server_request_duration_ms',
  'auth_failures_total',
  'authorization_denials_total',
  'auth_refresh_reuse_total',
  'checkout_outcomes_total',
  'order_state_transitions_total',
  'order_expired_total',
  'provider_operation_failures_total',
  'database_health',
  'lifecycle_job_outcomes_total',
] as const;

export type OperationalMetric = (typeof OPERATIONAL_METRICS)[number];
export type MetricTags = Readonly<Record<string, string>>;

const ALLOWED_TAGS = new Set([
  'route',
  'method',
  'statusClass',
  'permission',
  'operation',
  'provider',
  'outcome',
]);

function assertBoundedTags(tags: MetricTags): void {
  for (const [key, value] of Object.entries(tags)) {
    if (!ALLOWED_TAGS.has(key) || !value || value.length > 120) {
      throw new Error('Operational metric tags must be bounded allowlisted values');
    }
  }
}

@Injectable()
export class OperationalMetricsService {
  increment(_name: OperationalMetric, _tags: MetricTags = {}): void {
    assertBoundedTags(_tags);
    // Default no-export adapter. Replace this provider with a telemetry adapter in deployment.
  }

  observe(_name: OperationalMetric, _value: number, _tags: MetricTags = {}): void {
    if (!Number.isFinite(_value)) throw new Error('Operational metric values must be finite');
    assertBoundedTags(_tags);
    // Default no-export adapter. Replace this provider with a telemetry adapter in deployment.
  }
}
