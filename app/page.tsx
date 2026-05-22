import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f4ec] text-[#16201d]">
      <nav className="flex h-20 items-center justify-between border-b border-black/10 bg-[#fbf7ef]/88 px-4 shadow-sm backdrop-blur md:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-[#16201d] text-sm font-black text-[#f7f4ec]">
            SQ
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-[0.22em] text-[#16201d]">SOURCERY</span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-[#66736f]">Supplier intelligence</span>
          </span>
        </Link>

        <div className="hidden items-center gap-14 text-base font-semibold text-[#53605c] md:flex">
          <Link href="/app" className="hover:text-[#16201d]">Workspace</Link>
          <Link href="/app/workflow" className="hover:text-[#16201d]">How it works</Link>
          <Link href="/app/directory" className="hover:text-[#16201d]">Suppliers</Link>
        </div>
      </nav>

      <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[#f7f4ec] px-6 py-10 md:px-16 lg:px-28">
        <div className="grid min-h-[calc(100vh-10rem)] items-center gap-10 lg:grid-cols-[0.98fr_1.02fr]">
          <div className="relative z-10 max-w-2xl">
            <h1 className="font-serif text-6xl leading-[1.04] tracking-[-0.045em] text-[#13201b] md:text-7xl lg:text-[5.4rem]">
              Source suppliers
              <br />
              with margin,
              <br />
              risk, and readiness
              <br />
              intelligence.
            </h1>

            <p className="mt-9 max-w-xl text-xl leading-[1.65] tracking-[-0.01em] text-[#5f6b67] md:text-2xl">
              Built for small and growing brands that need faster supplier decisions without sacrificing margin or reliability.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild className="h-14 min-w-[19rem] rounded-full bg-[#16201d] px-12 text-lg font-bold text-[#f7f4ec] hover:bg-[#24332f]">
                <Link href="/app">Open sourcing workspace</Link>
              </Button>
            </div>
          </div>

          <div className="relative hidden h-[620px] lg:block">
            <div className="absolute left-[15%] top-[16%] h-[286px] w-[286px] rounded-[42%] bg-[#7fb7a7]/85 rotate-[11deg]" />
            <div className="absolute right-[12%] top-[8%] h-[250px] w-[250px] rounded-full bg-[#eadbb2]/82" />
            <div className="absolute left-[43%] top-[27%] h-[275px] w-[275px] rounded-full bg-[#8a6f44]/58" />
            <div className="absolute left-[36%] top-[15%] h-[190px] w-[190px] rounded-[18%] bg-[#16201d]/82 rotate-[10deg]" />
          </div>
        </div>
      </section>
    </main>
  )
}
