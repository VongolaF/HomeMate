This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Setup

### Environments

This repo supports three app environments:

- **dev**: local development
- **int**: integration (typically Vercel Preview)
- **prod**: production (typically Vercel Production)

The active environment is exposed to the client as `NEXT_PUBLIC_APP_ENV`.

### Local dev

1. Copy `.env.example` to `.env.dev` (or `.env.dev.local`)
2. Fill Supabase URL and anon key (and any server-only secrets as needed)
3. Run `npm install` and `npm run dev`

### Local int

1. Copy `.env.example` to `.env.int` (or `.env.int.local`)
2. Fill values
3. Run `npm run int`

### Local prod (simulation)

1. Copy `.env.example` to `.env.prod` (or `.env.prod.local`)
2. Fill values
3. Run `npm run prod`

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
