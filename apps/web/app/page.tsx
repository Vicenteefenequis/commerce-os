import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Commerce OS</h1>
      <p>Foundation phase scaffold.</p>
      <nav className="flex gap-4 text-sm">
        <Link href="/login">Entrar</Link>
        <Link href="/venues">Unidades</Link>
        <Link href="/products">Produtos</Link>
        <Link href="/resources">Recursos</Link>
      </nav>
    </main>
  );
}
