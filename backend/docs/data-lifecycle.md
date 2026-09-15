# Data lifecycle

The data-lifecycle worker anonymizes accepted account-deletion requests at 30 days and performs bounded cleanup of authentication sessions, audit logs, terminal orders, and checkout idempotency records. Jobs use database time, row locking, bounded batches, and SYSTEM audit actors so repeated or concurrent cycles are safe.

The current schema has no anonymous-analytics or payment-metadata store. Access logs are retained by the configured rotating log transport or deployment logging platform rather than a database cleanup job.

Backups must be encrypted, access-controlled, and expired under the approved backup lifecycle. A restored backup must remain isolated from user traffic until migrations run and anonymization/retention cycles have replayed successfully. Restoring a backup must never make previously anonymized personal data publicly accessible.
