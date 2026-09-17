# Incident report: intermittent blank planner images

**Status:** Resolved (fix in codebase, pending prod verification)
**Date range:** 2026-09-16 → 2026-09-17
**Environments:** Local (`localhost:8080`), Production (Vercel)
**Related docs:** [ARCHITECTURE.md — Image pipeline](./ARCHITECTURE.md#image-pipeline-who-stores-what)

---

## Summary

Planner covers and page artwork sometimes rendered correctly and sometimes showed an empty placeholder, in both local and production. Uploads always succeeded.

There were two independent causes, one per environment.

**Locally**, the cause was client-side state management: the app resolved an image URL once, silently swallowed any failure, and never tried again. Because a successful resolve is cached as a data URL in IndexedDB, the failure only showed up when that cache was cold — which is why it looked intermittent and why "clear site data" reproduced it so reliably.

**In production**, nothing ever worked: all four API routes crashed on module load with `ERR_MODULE_NOT_FOUND` because relative imports lacked the `.js` extension that Node's ESM resolver requires. This is why the prod UploadThing project held zero files. It was masked throughout the investigation because Vite and `tsx` resolve extensionless imports, so local dev and the local simulation both passed.

Neither cause was CDN reachability.

---

## Correcting the earlier diagnosis

An earlier version of this report identified the root cause as an ISP/Cloudflare anycast blackhole for `*.ufs.sh`. **That was wrong**, and it sent the investigation in the wrong direction for a day. The original evidence (a `curl` connect timeout) was real but transient, and it was generalized into a standing network fault.

Re-measured on 2026-09-17 from the same developer machine and network:

| Probe | Result |
|---|---|
| `curl https://ur2km8gvfx.ufs.sh/` | 200, 40 ms connect, 98 ms total |
| `UTApi.listFiles` | OK, 18 files |
| `utapi.generateSignedURL` | OK, returns `*.ufs.sh` signed URL |
| Node `fetch` of signed + official URLs (3 files) | 200 `image/png`, correct byte counts |
| `POST /api/images/url` (real Firebase token) | 200, properly signed |
| `GET /api/images/content?t=…` | 200 `image/png`, 37 949 bytes |
| Firestore pages vs UploadThing inventory | 9/9 pages have a valid `fileKey` that exists |

Every hop was healthy. **When a report blames the network, re-measure before building on it.**

---

## Root causes

### 0. Every prod API route crashed on module load (production root cause)

All four serverless functions died before running a single line of handler code:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/firebase-admin'
    imported from /var/task/api/uploadthing.js
Node.js process exited with exit status: 1.
```

`package.json` sets `"type": "module"`, so Vercel transpiles `api/**/*.ts` to `.js` and Node loads it as ESM. Node's ESM resolver does **not** guess file extensions, and every relative import in `api/` and `server/` was written extensionless (`from '../server/firebase-admin'`). Node looked for a file literally named `firebase-admin`, found nothing, and exited 1 — surfacing as `FUNCTION_INVOCATION_FAILED`.

Two things hid this:

- **Typecheck.** `tsconfig.node.json` used `"moduleResolution": "bundler"`, which permits extensionless specifiers, and `api/**` was not in *any* tsconfig `include`, so it was never typechecked at all.
- **Local dev.** Vite and `tsx` both resolve extensionless imports, so dev worked and the `simulate-vercel-fn.mjs` probe passed. Only real Node ESM rejects them.

This explains the observations the client-side causes below could not: uploads never reaching the prod UploadThing project (0 files), and `FUNCTION_INVOCATION_FAILED` persisting after `FIREBASE_SERVICE_ACCOUNT` was added and redeployed. The env var was never the problem — the function never got far enough to read it.

Reproduced and confirmed locally by compiling `api/**` with `tsc` and importing the output with plain `node`: extensionless imports throw the identical error, `.js` specifiers load cleanly.

### 1. Failures were swallowed and never retried (primary)

`resolveCloudImageAccess` wrapped the whole resolve in `try { … } catch { return null }`, and also returned `null` for any non-2xx and for a missing Firebase token. That `null` became `src: ''` + `missingLocalAsset: true`, rendering the empty-cloud placeholder.

Nothing re-requested it. The home page only triggered loading when the **set of template/page ids** changed, and the store only re-resolved when `src` was entirely absent. A single transient failure was therefore permanent until a full page reload.

This is what produced the "empty cloud icon with zero `ufs.sh` / `content?t=` requests in the Network tab" signature: the failure happened *before* any `<img>` was ever created.

### 2. Content tickets expired with no refresh path

The displayed `src` is `/api/images/content?t=<ticket>`, where the ticket is an HMAC with a 6-hour TTL. The signed CDN fallback (`srcAlt`) expires on the same 6-hour clock, so both the primary and the fallback died at the same moment. `needsImageLoad` returned `!image.src`, so a present-but-expired `src` was never refreshed.

### 3. Firebase auth race

`getFirebaseIdToken()` read `auth.currentUser` synchronously. Firebase restores a persisted session asynchronously, so an image load racing session restore saw `null` and treated a signed-in user as anonymous — feeding straight into root cause 1.

### 4. `imageRef` persistence gated on the wrong field

`syncPageImageRefIfCloud` and `persistCloudImageRef` both bailed on `!imageRef.url`, but `fileKey` is the field that makes an image recoverable. An upload yielding a `fileKey` without a URL never reached Firestore, and could not be recovered afterwards: the upload router writes `customId` as `` `${uid}/${pageId}/${Date.now()}` `` while the client only knows `uid/pageId`, so the customId lookup can never match.

### 5. Malformed prod token in `.env.prod` (latent)

`.env.prod` contained `UPLOADTHING_TOKEN='<token>'=` — a stray `=` after the closing quote. `stripQuotes` only unquoted values that both start *and* end with a quote, so the quotes stayed attached, producing a 171-character value that the UploadThing SDK rejects:

```
UploadThingError: Invalid token … Length must be a multiple of 4, but is 171
```

This was masked because `getUploadthingAppId()` used `Buffer.from(token, 'base64')`, which is lenient and happily returned an `appId`. The result would be `/api/images/url` returning 200 while signing silently failed and reads degraded to unsigned URLs — exactly the "url OK / content 502" pattern reported earlier.

**Not the production cause:** the Vercel env var holds the correct 168-character token. `.env.prod` is a local reference file that nothing in the codebase reads. Fixed anyway, since copy-pasting it into Vercel would have broken prod.

### 6. Vercel 4.5 MB response cap (latent)

`plannerImage` accepts 16 MB uploads, but the content proxy buffered the whole image and Vercel caps non-streamed responses at 4.5 MB. Large artwork would have failed in prod only.

---

## Fixes

| # | Fix | Files |
|---|-----|-------|
| 0 | Add explicit `.js` extensions to every relative import that runs on Node as ESM (20 specifiers) | `api/**`, `server/**`, `vite.config.ts`, `vite.dev-api-plugin.ts` |
| 0 | Switch `tsconfig.node.json` to `"moduleResolution": "NodeNext"` and add `api/**/*.ts` to `include`, so an extensionless import is now a compile error (`TS2835`) instead of a runtime crash | `tsconfig.node.json` |
| 1 | Retry with backoff (3 attempts), classify retryable vs permanent, force-refresh the ID token after a 401/403, log the reason instead of returning a bare `null` | `infrastructure/uploadthing/client.ts` |
| 1 | Retry loading while pages lack a usable src, restarting on `online` and tab focus | `ui/hooks/use-image-load-retry.ts`, `use-home-templates.ts`, `TemplateEditor.tsx` |
| 2 | Treat ticket/signed-URL expiry as first-class: `needsImageLoad` re-resolves lapsed URLs, the session cache honours real expiry instead of a fixed 5 h TTL, and `hydrateFromRemote` stops carrying lapsed URLs forward | `infrastructure/uploadthing/content-ticket.ts`, `image.adapter.ts`, `template-store.ts` |
| 3 | `await auth.authStateReady()` before reading `currentUser` | `auth/infrastructure/firebase/get-id-token.ts` |
| 4 | Persist `imageRef` when `fileKey` **or** `url` is present | `page-image-asset.ts`, `template-store.ts` |
| 5 | Unquote up to the last matching quote; validate the token as strict base64 with required fields and fail loudly | `server/load-env.ts`, `server/uploadthing-url.ts`, `.env.prod` |
| 6 | Stream the upstream response instead of buffering it (streamed responses have no Vercel size cap) | `server/image-content.ts`, `api/images/content.ts`, `server/dev-api.ts` |
| — | Collapse overlapping loads of the same page into one request | `template-store.ts` |

Token misconfiguration now returns 500 rather than 400, so it reads as server misconfiguration instead of bad client input.

### Tests

- `content-ticket.test.ts` — 11 tests covering ticket parsing and expiry for data URLs, proxy URLs and signed CDN URLs.
- `uploadthing-url.test.ts` — 5 tests, including a regression test for the stray-character token.

`vitest.config.ts` now also includes `server/**` tests.

---

## Diagnostic tooling

Two scripts reproduce the measurements above:

```bash
node scripts/diagnose-images.mjs .env          # Firestore imageRefs vs UploadThing inventory
node scripts/diagnose-endpoints.mjs http://localhost:8080 .env   # full API chain with a real token
```

`diagnose-endpoints.mjs` mints a Firebase ID token via the Admin SDK, so it exercises the same path the browser uses.

---

## Verification checklist

0. `npx tsc --noEmit -p tsconfig.node.json` — must be clean; this is what now guards root cause 0.
1. `node scripts/diagnose-images.mjs .env` — expect zero problem rows.
2. `node scripts/diagnose-endpoints.mjs <origin> .env` — expect `url` 200 signed, `content` 200 `image/*`.
3. Clear site data, reload → covers appear without a manual refresh.
4. Go offline, reload, come back online → covers recover on their own within ~20 s.
5. Leave a tab open past the 6-hour ticket TTL, refocus → covers re-resolve instead of breaking.

---

## Open items

- [ ] Confirm in production after deploy (steps 3–5 above).
- [ ] Consider a visible retry affordance when a page exhausts its retry budget, so the empty placeholder is not the only signal.

---

## References

- UploadThing ACL / signed URLs: https://docs.uploadthing.com/concepts/regions-acl
- Working with files / `ufs.sh`: https://docs.uploadthing.com/working-with-files
- Vercel response size limit: https://vercel.com/docs/errors/function_response_payload_too_large
- App image adapters: `src/features/template/infrastructure/uploadthing/`, `…/local/caching-image.adapter.ts`
- Proxy: `api/images/content.ts`, `server/image-content.ts`
