import Link from "next/link"
import { cn } from "@/lib/utils"

export function BrandLogo({
  href = "/",
  inverted = false,
  showSubtitle = false,
  className,
}: {
  href?: string
  inverted?: boolean
  showSubtitle?: boolean
  className?: string
}) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center gap-3", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-md bg-[#d9b44a] text-xs font-black text-[#16201d]">
        SI
      </span>
      <span className={cn("block", !showSubtitle && "hidden min-[520px]:block")}>
        <span className={cn("block text-sm font-semibold tracking-[0.22em]", inverted ? "text-[#f7f4ec]" : "text-[#16201d]")}>
          SOURCERY
        </span>
        {showSubtitle ? (
          <span className={cn("block text-[10px] uppercase tracking-[0.18em]", inverted ? "text-[#b7c4bf]" : "text-[#66736f]")}>
            Supplier intelligence
          </span>
        ) : null}
      </span>
    </Link>
  )
}
