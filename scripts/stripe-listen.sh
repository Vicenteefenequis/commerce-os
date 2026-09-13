#!/bin/sh
# Entrypoint for the `stripe-cli` docker-compose service (dev only).
#
# Forwards Stripe test-mode webhooks to the local backend so payments
# actually settle without a publicly reachable webhook URL. `stripe
# listen` mints a brand new ephemeral signing secret every time it
# (re)starts, so instead of baking one into .env (which would go stale
# on every restart), this writes it to a shared file that
# StripePaymentProvider re-reads on every request (see
# stripe-payment-provider.ts) - no backend restart needed when it rotates.
set -eu
: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY is required}"
: "${FORWARD_TO:?FORWARD_TO is required}"

stripe listen --api-key "$STRIPE_SECRET_KEY" --forward-to "$FORWARD_TO" 2>&1 | while IFS= read -r line; do
  echo "$line"
  case "$line" in
    *"webhook signing secret is"*)
      echo "$line" | grep -oE 'whsec_[A-Za-z0-9]+' > /shared/stripe-webhook-secret
      ;;
  esac
done
