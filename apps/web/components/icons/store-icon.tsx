/**
 * Static fallback shown in place of a Venue's cover photo when
 * `coverPhotoUrl` is unset (storefront/showcase, storefront/discovery).
 * Fixed in the frontend - not fetched or configurable.
 */
export function StoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M4 3a1 1 0 0 0-.94.66L2 7.34V9a3 3 0 0 0 1 2.24V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5h6v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8.76A3 3 0 0 0 22 9V7.34l-1.06-3.68A1 1 0 0 0 20 3H4Zm1.5 8.9c-.83 0-1.5-.67-1.5-1.5V9h3v1.4c0 .83-.67 1.5-1.5 1.5Zm5 0c-.83 0-1.5-.67-1.5-1.5V9h3v1.4c0 .83-.67 1.5-1.5 1.5Zm5 0c-.83 0-1.5-.67-1.5-1.5V9h3v1.4c0 .83-.67 1.5-1.5 1.5Zm5 0c-.83 0-1.5-.67-1.5-1.5V9h3v1.4c0 .83-.67 1.5-1.5 1.5Z" />
    </svg>
  );
}
