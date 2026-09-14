## Why

The application only runs locally via docker-compose today; there is no environment where a real customer can reach it. The AWS account is new and holds a $100 promotional credit (the post-2024 credit-based free plan, not the legacy 12-month resource quotas), so the deployment must stay cheap and predictable enough to onboard the first customers without burning through or exceeding that credit.

## What Changes

- Provision AWS infrastructure via Terraform: one EC2 instance (t3.micro, `us-east-1`) running the production subset of the existing docker-compose stack (`postgres`, `migrate`, `backend`, `outbox-worker`, `web` — no `mailpit`/`stripe-cli`), Postgres data on the instance's own EBS volume (no RDS), a fixed Elastic IP, and a Security Group restricted to 80/443 public and 22 to the operator's current IP (updated manually on request, not automated).
- Terminate TLS on the instance with Caddy, using a `sslip.io`-based hostname (no owned domain yet) so Let's Encrypt can issue a real certificate against the Elastic IP.
- Store IaC and deployment artifacts in a single S3 bucket with three prefixes: `tfstate/` (Terraform remote state, paired with a DynamoDB lock table), `builds/` (versioned docker image tarballs), `backups/` (scheduled `pg_dump` output).
- Grant the EC2 instance an IAM instance profile scoped to read-only access on the bucket's `builds/` prefix, so deploys never need AWS credentials copied onto the box or passed over SSH.
- Add CloudWatch billing alarms at $10 / $15 / $20 of credit consumed.
- Replace any CI-based deploy notion with a fully local, sequential deploy pipeline: shell scripts (`build.sh` -> `package.sh` -> `upload.sh` -> `deploy.sh` -> `roundtrip.sh`, orchestrated by `release.sh`) that build docker images locally, tag them with the short git sha, upload the tarball to S3, SSH into the instance to load and run the new release, run pending migrations, and verify the new version is live. A `rollback.sh` reuses the same flow against a prior sha.
- Retention: keep at most 5 build tarballs in S3 or 15 days of history, whichever limit is hit first (S3 lifecycle rule plus pruning logic in `upload.sh`); the EC2 instance itself only ever keeps the 2 most recently loaded image sets on local disk, pulling older ones back from S3 on demand for rollback.
- Out of scope for this change: auto-shutdown/scheduling of the instance (explicitly rejected — the instance stays on), GitHub Actions or any automated CI/CD, RDS or any managed database, an ALB or owned domain, multi-instance/high-availability topology.

## Capabilities

### New Capabilities
(none — this change is infrastructure and operational tooling, not product behavior)

### Modified Capabilities
(none)

## Impact

- New Terraform module(s) (not yet located in the repo) provisioning: EC2, EBS, Elastic IP, Security Group, S3 bucket + lifecycle rules, DynamoDB lock table, IAM instance profile/role, CloudWatch billing alarms.
- New `scripts/deploy/*.sh` scripts for the local build/upload/deploy/roundtrip/rollback pipeline.
- A production-only docker-compose variant (or override file) excluding `mailpit` and `stripe-cli`.
- Existing `apps/backend/Dockerfile` and `apps/web/Dockerfile` are reused as-is for image builds; no application code changes are anticipated.
- Operator must have AWS CLI credentials (IAM user scoped to the artifacts bucket) and an SSH key pair configured locally; no secrets are introduced into the repo.
