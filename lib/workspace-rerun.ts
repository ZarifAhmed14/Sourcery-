type SearchParamReader = {
  get(name: string): string | null
}

type WorkspaceRerunPayload = {
  query?: string | null
  bangladeshMode?: boolean
  category?: string | null
  product?: string | null
  type?: string | null
  country?: string | null
  region?: string | null
  orderQuantity?: string | null
}

function clean(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseLegacyQuery(query: string) {
  const product = query.match(/^(.+?)\s+suppliers\b/i)?.[1]?.trim() ?? null
  const category = query.match(/\bcategory\s+([^,]+)/i)?.[1]?.trim() ?? null
  const type = query.match(/\bstyle\s+([^,]+)/i)?.[1]?.trim() ?? null
  const country = query.match(/\bcountry\s+([^,]+)/i)?.[1]?.trim() ?? null
  const region = query.match(/\bregion\s+([^,]+)/i)?.[1]?.trim() ?? null
  const orderQuantity = query.match(/\border quantity\s+(\d+)\s+units\b/i)?.[1]?.trim() ?? null

  return { product, category, type, country, region, orderQuantity }
}

export function buildWorkspaceRerunHref(payload: WorkspaceRerunPayload): string {
  const params = new URLSearchParams()
  params.set("rerun", "1")

  const query = clean(payload.query)
  const category = clean(payload.category)
  const product = clean(payload.product)
  const type = clean(payload.type)
  const country = clean(payload.country)
  const region = clean(payload.region)
  const orderQuantity = clean(payload.orderQuantity)

  if (query) params.set("query", query)
  if (category) params.set("category", category)
  if (product) params.set("product", product)
  if (type) params.set("type", type)
  if (country) params.set("country", country)
  if (region) params.set("region", region)
  if (orderQuantity) params.set("qty", orderQuantity)
  if (payload.bangladeshMode) params.set("bd", "1")

  return `/app?${params.toString()}`
}

export function readWorkspaceRerunParams(searchParams: SearchParamReader): WorkspaceRerunPayload | null {
  const rerun = searchParams.get("rerun")
  const query = clean(searchParams.get("query") ?? searchParams.get("prefill"))
  const category = clean(searchParams.get("category"))
  const product = clean(searchParams.get("product"))
  const type = clean(searchParams.get("type"))
  const country = clean(searchParams.get("country"))
  const region = clean(searchParams.get("region"))
  const orderQuantity = clean(searchParams.get("qty"))
  const bangladeshMode = searchParams.get("bd") === "1"

  if (rerun !== "1" && !query && !category && !product && !type && !country && !region && !orderQuantity) {
    return null
  }

  const legacy = query ? parseLegacyQuery(query) : null

  return {
    query,
    bangladeshMode,
    category: category ?? legacy?.category ?? null,
    product: product ?? legacy?.product ?? null,
    type: type ?? legacy?.type ?? null,
    country: country ?? legacy?.country ?? null,
    region: region ?? legacy?.region ?? null,
    orderQuantity: orderQuantity ?? legacy?.orderQuantity ?? null,
  }
}
