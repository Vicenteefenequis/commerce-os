import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Ingressafluxo</h1>
      <p>Foundation phase scaffold.</p>
      <nav className="flex gap-4 text-sm">
        <Link href="/admin/login">Entrar</Link>
        <Link href="/admin/venues">Unidades</Link>
        <Link href="/admin/products">Produtos</Link>
        <Link href="/admin/resources">Recursos</Link>
      </nav>
    </main>
  );
}
