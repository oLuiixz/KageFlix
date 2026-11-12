import Link from "next/link";

export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, background: "#070707", color: "#f7f7f7", textAlign: "center" }}>
      <section style={{ maxWidth: 420 }}>
        <div style={{ color: "#e50914", fontSize: 13, fontWeight: 800, letterSpacing: ".18em", marginBottom: 18 }}>KAGEFLIX</div>
        <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "0 0 12px" }}>Você está sem conexão</h1>
        <p style={{ color: "#a1a1aa", lineHeight: 1.6, margin: "0 0 24px" }}>Conecte-se à internet para continuar assistindo. O catálogo e os vídeos precisam de conexão ativa.</p>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 46, padding: "0 22px", borderRadius: 9, background: "#e50914", color: "#fff", fontWeight: 700, textDecoration: "none" }}>Tentar novamente</Link>
      </section>
    </main>
  );
}
