SYNTH

SYNTH keeps provider calls behind `SynthEngine`. OpenRouter is an optional server-side provider; `MockProvider` remains available for local development and tests.

## OpenRouter setup

1. Create an API key at [OpenRouter](https://openrouter.ai/keys).
2. Copy `.env.example` to `.env.local` and set `OPENROUTER_API_KEY`.
3. Optionally set `OPENROUTER_BASE_URL` for a compatible endpoint.

The key is read only by Node.js API routes. Never put it in a `NEXT_PUBLIC_` variable or use it from React code.

The model selector supports `Auto`, `Free`, `Coding`, `Reasoning`, `Vision`, and enabled explicit models from `lib/ai/models.ts`. Free and paid labels are provider metadata and may change. Model discovery is server-side and falls back to the configured catalog when unavailable.

Without an OpenRouter key, SYNTH still starts and `/api/ai/health` reports OpenRouter as offline. Requests using the existing fallback policy can use `MockProvider`; tool requests continue through agent resolution, `ToolPolicy`, `ToolApproval`, and the audited tool port.

## Getting started

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
