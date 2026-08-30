export function backendUrl(path: string): string {
  const base = process.env.BACKEND_URL ?? "http://localhost:4000";
  return `${base}${path}`;
}
