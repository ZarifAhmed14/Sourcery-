# Local Dev Performance

Sourcery uses Next.js with Turbopack. If you repeatedly see `Slow filesystem detected` in dev logs, the main fix is environmental rather than code-level.

## Recommended setup

1. Keep the project on the fastest local SSD path available.
2. Avoid syncing the repo folder through network drives while running `npm run dev`.
3. Exclude `.next/` from antivirus or cloud-sync indexing if your local policy allows it.
4. Restart the dev server after large dataset or env changes.

## Why this matters

The app uses a large dataset, server-side routing, and frequent hot reloads. Slow filesystem access can make route compilation and local QA feel much slower than production behavior.
