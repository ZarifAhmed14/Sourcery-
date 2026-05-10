import { z } from "zod"
import { SupplierSchema } from "@/lib/schemas"
import { handleApiError } from "@/lib/backend/http"

export const runtime = "nodejs"

const ExportRequestSchema = z.object({
  query: z.string().trim().max(800).default("Sourcery shortlist"),
  suppliers: z.array(SupplierSchema).min(1).max(25),
})

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "")
  return `"${text.replaceAll('"', '""')}"`
}

export async function POST(req: Request) {
  try {
    const input = ExportRequestSchema.parse(await req.json())
    const rows = [
      [
        "query",
        "rank",
        "supplier",
        "category",
        "subcategory",
        "country",
        "city",
        "unit_price_usd",
        "moq",
        "lead_time_days",
        "quality_rating",
        "risk_score",
        "bgmea_certified",
        "certifications",
      ],
      ...input.suppliers.map((supplier, index) => [
        input.query,
        index + 1,
        supplier.name,
        supplier.category,
        supplier.subcategory,
        supplier.country,
        supplier.city,
        supplier.unit_price_usd,
        supplier.moq,
        supplier.lead_time_days,
        supplier.quality_rating,
        supplier.risk_score,
        supplier.bgmea_certified ? "yes" : "no",
        supplier.certifications,
      ]),
    ]

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n")
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="sourcery-shortlist.csv"',
        "cache-control": "no-store",
      },
    })
  } catch (err) {
    return handleApiError(err, "Export failed.")
  }
}
