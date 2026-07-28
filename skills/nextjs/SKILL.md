# Next.js App Router — Best Practices

You are writing or reviewing Next.js code using the App Router
(`app/` directory). Apply these rules:

- **Server Components by default.** Only add `"use client"` when the
  component needs state, effects, browser APIs, or event handlers. Push
  `"use client"` as far down the tree as possible — don't mark a whole
  page client just because one small piece needs interactivity.
- **Data fetching happens in Server Components** or Route Handlers, not in
  `useEffect` on the client, unless the data is genuinely user-triggered
  and client-only.
- **Route Handlers** (`app/api/*/route.ts`) export named functions per
  HTTP verb (`GET`, `POST`, ...). Validate the request body before use;
  never trust `unknown` input without a type guard.
- **Streaming responses**: use `ReadableStream` + `text/event-stream` for
  token-by-token output, matching the pattern already used in this
  project's `app/api/chat/route.ts`.
- **Secrets stay server-only.** Never import a module that reads
  `process.env.SOME_SECRET` from a Client Component or any file that
  might get bundled into client JS.
- **Caching**: be explicit. Use `export const dynamic = "force-dynamic"`
  for routes that must never be cached (auth, chat), and
  `export const revalidate = <seconds>` for routes that can be.
- **Error boundaries**: use `error.tsx` for route-segment errors and
  `not-found.tsx` for 404s instead of ad-hoc conditional rendering.
- **Metadata**: prefer the `metadata` export or `generateMetadata` over
  manually injecting `<head>` tags.
- **Prefer `next/link` and `next/navigation`** (`useRouter`, `redirect`)
  over raw `<a>` tags or `window.location` for internal navigation.
