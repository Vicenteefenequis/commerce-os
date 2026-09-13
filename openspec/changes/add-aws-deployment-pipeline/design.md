## Context

See proposal.md - Why. Current stack (from `docker-compose.yml`): `postgres`, `migrate` (one-shot `node-pg-migrate`), `backend` (Express/Kysely, port 4000), `outbox-worker` (separate Node process reading `outbox_events`), `web` (Next.js 15, port 3000), plus dev-only `mailpit` and `stripe-cli`. Production drops the two dev-only services and points `STRIPE_WEBHOOK_SECRET`/`RESEND_API_KEY` at real values instead of the mailpit/stripe-cli dev shims.

Constraints driving this design: a $100 AWS credit (post-2024 credit model, not legacy 12-month free tier — RDS free tier does not apply the same way), and an explicit operator preference for zero automated CI/CD — every deploy action is a script run from the operator's machine.

## Goals / Non-Goals

**Goals:**
- Single EC2 instance running the full production stack via docker-compose, reachable over HTTPS, within free-credit-friendly cost.
- Fully local, sequential, re-runnable deploy pipeline (build -> package -> upload -> deploy -> roundtrip -> optional rollback).
- No AWS credentials or long-lived secrets stored on the instance or transmitted through it.
- Cost visibility (billing alarms) from day one.

**Non-Goals:**
- High availability / multi-instance / zero-downtime deploys (brief downtime during migration + restart is acceptable at this stage).
- Any managed database (RDS) or managed load balancer (ALB) — both add cost without free-tier advantage under the new credit model.
- Any CI/CD automation (GitHub Actions, webhooks, schedulers) — deploys are operator-initiated only.
- An owned domain — `sslip.io` is a deliberate placeholder until the product needs one.
- Auto-shutdown/scheduling of the instance — explicitly rejected; the instance runs continuously.

## Decisions

**EC2 + local Docker Compose instead of ECS/Fargate or Elastic Beanstalk.**
Managed container services add cost (Fargate has no meaningful free tier) and operational surface (task definitions, service discovery) disproportionate to a single-box MVP. Plain EC2 running the existing docker-compose file (minus dev-only services) reuses what already works locally with minimal translation.

**Postgres on the same EC2 (EBS-backed) instead of RDS.**
Under the new AWS credit model, RDS free tier no longer applies to new accounts the way it did under the legacy 12-month plan — it would simply consume the $100 credit like everything else, with no cost advantage over self-hosting. Colocating Postgres removes an extra billed resource and matches the existing docker-compose topology, at the cost of losing RDS's automated backups/multi-AZ — mitigated by the scheduled `pg_dump` to S3 below.

**Caddy + `sslip.io` instead of ALB + ACM.**
An ALB bills per-hour regardless of traffic and isn't free-tier eligible; it exists to front multiple targets/instances, which this design explicitly doesn't have. Caddy on the instance gets automatic Let's Encrypt certificates for free. `sslip.io` (`<elastic-ip>.sslip.io`) resolves to the instance's own Elastic IP without registering a domain, letting Let's Encrypt's HTTP-01 challenge succeed against a real hostname instead of a bare IP. The Elastic IP must stay attached and stable, since the sslip.io hostname is derived from it.

**S3 (three prefixes) instead of a container registry (ECR) for build artifacts.**
The operator chose to consolidate all artifact types — Terraform state, build tarballs, and DB backups — into one S3 bucket with prefixes (`tfstate/`, `builds/`, `backups/`) rather than introduce ECR as a separate service. Trade-off: no image layer deduplication/caching that a registry gives you, and `docker save`/`docker load` round-trips a full tarball per release instead of pulling only changed layers. Acceptable at this scale (small images, infrequent releases, S3 storage cost is negligible).

**IAM instance profile scoped to exactly two prefixes, not credentials over SSH.**
The EC2 instance gets an instance profile scoped to `s3:GetObject` on `builds/*` (deploy.sh/rollback.sh pull their own release tarball using this role - no AWS access key ever leaves the operator's machine or lands on the box) and, separately, `s3:PutObject` on `backups/*` only. The backups write access is necessary because the scheduled `pg_dump` timer (task 3.4) runs unattended on the instance itself and must upload without operator involvement - it can't use the operator's local credentials the way build/upload/rollback do, since nothing local is running when the 03:00 timer fires. The role can never touch `tfstate/`, never list the bucket root, and never write to `builds/` or delete anything - `s3:ListBucket` is itself restricted (via an `s3:prefix` condition) to just those same two prefixes. Terraform state writes and build uploads still use the operator's own local IAM user credentials, run locally.

**Short git sha for versioning instead of semver tags.**
The operator chose short sha specifically to avoid the extra step of cutting a tag before every deploy. Every `release.sh <sha>` run is traceable back to an exact commit. Rollback targets a specific prior sha rather than a floating "previous" pointer, so the operator always names the exact version being restored.

**Retention: 5 builds or 15 days in S3 (whichever first), 2 most recent on the instance's local disk.**
Bounds both S3 storage growth and, more importantly, the instance's limited EBS root volume. A lifecycle rule expires objects under `builds/` after 15 days; `upload.sh` additionally deletes older objects once more than 5 exist for the same reason a lifecycle rule alone can't enforce a count-based limit. On the instance, `deploy.sh`/`rollback.sh` only ever keep the 2 most recently `docker load`-ed image sets; rolling back further than that re-fetches the tarball from S3.

**Billing alarms at $10 / $15 / $20 instead of a single threshold.**
Three graduated CloudWatch alarms against estimated charges give the operator early warning (soft signal at $10) and escalating urgency (hard signal at $20) well before the $100 credit is threatened, without needing a cost-anomaly-detection service.

**No auto-shutdown.**
Originally considered as a safety mechanism (see proposal's earlier exploration), but explicitly dropped by the operator — the instance must be available at any time for early customers, and the operational complexity of a scheduler that could accidentally leave the app unreachable outweighs the credit savings at this stage.

## Risks / Trade-offs

- **Single point of failure (one EC2, one EBS volume, Postgres co-located)** -> Mitigated only by scheduled `pg_dump` backups to S3 (5 backups or 15 days retention, same scheme as builds); there is no automatic instance-level failover. Acceptable for a pre-revenue MVP; revisit once real customer data volume/traffic justifies RDS or multi-AZ.
- **`sslip.io` hostname is tied to the Elastic IP** -> If the EIP is ever released/replaced, the TLS hostname and certificate must be reissued. Mitigated by keeping the EIP static and not tearing down/recreating it as part of normal deploys (only Terraform infra changes touch it).
- **No automated tests/gates before a production deploy** -> Since there's no CI, `release.sh` should run the existing test suite (`turbo run test`) as its first local step before building images, so a broken build never reaches upload/deploy. Deploy is still entirely at the operator's discretion.
- **Brief downtime on every deploy** -> `migrate` runs before the app containers restart; requests fail for the few seconds in between. Acceptable given current traffic (pre-launch/first customers); would need a blue-green or rolling strategy to remove entirely, which is out of scope here.
- **Manual Security Group updates for SSH** -> If the operator's IP changes and they forget to update the Security Group before deploying, `deploy.sh`/`rollback.sh` will simply fail to connect (fails loud, not silently) — no automatic remediation, by the operator's own choice.
- **EC2 disk pressure from Docker images/tarballs** -> Bounded by the 2-most-recent-local-images policy, but the operator should still monitor EBS free space; a full disk would break `docker load` mid-deploy. Consider a periodic `docker image prune` as part of `deploy.sh`.

## Migration Plan

1. Terraform apply (from the operator's machine, using local AWS credentials) provisions: S3 bucket + prefixes + lifecycle rules, DynamoDB lock table, then re-init Terraform to use the S3 backend, then EC2 + EBS + Elastic IP + Security Group + IAM instance profile + CloudWatch billing alarms.
2. Bootstrap the instance (via `cloud-init`/user-data or a one-time SSH session): install Docker, Docker Compose, Caddy; configure Caddy for the `sslip.io` hostname.
3. First release: run `release.sh <sha>` locally end-to-end (build -> package -> upload -> deploy -> roundtrip) against the fresh instance; this run also executes the initial `migrate` against the empty database.
4. Configure the backup timer (systemd timer or cron installed by the bootstrap step) for scheduled `pg_dump` -> S3 `backups/`.
5. Rollback path: `rollback.sh <previous-sha>` re-runs the deploy stage only (no rebuild/re-upload) against an already-uploaded (or re-fetched) tarball.

There is no automated rollback trigger — if `roundtrip.sh` fails, it reports failure and leaves the decision to rerun `rollback.sh` with the operator.
