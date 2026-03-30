# QAuthority — UI/UX Review & Plan Corrections

**Date:** 2026-03-27 (Updated: 2026-03-29)
**Reviewer:** UI/UX Architecture Analysis
**Status:** Historical reference — `[locale]` has been removed from the codebase

---

## Summary

This document was created during the governance planning phase to address frontend structure issues. As of 2026-03-29, the `[locale]` folder has been completely removed from the codebase. Pages now live directly under `frontend/src/app/(app)/` without the `[locale]` segment.

---

## What Changed

### Before (with locale)
```
frontend/src/app/[locale]/(app)/dashboard/page.tsx
URL: /dashboard (localePrefix: 'never')
```

### After (locale removed)
```
frontend/src/app/(app)/dashboard/page.tsx
URL: /dashboard
```

### Key Changes Made
1. Removed `frontend/src/middleware.ts` (next-intl middleware no longer needed for URL handling)
2. Updated root `layout.tsx` to include NextIntlClientProvider
3. Moved all pages from `[locale]/(app)/` to `(app)/`
4. Updated navigation components to use plain `Link` from `next/link`
5. Updated Breadcrumbs to not expect locale as first path segment

---

## Current App Structure

```
frontend/src/app/
├── (app)/           ← Authenticated pages (no prefix in URL)
│   ├── dashboard/
│   ├── projects/
│   ├── admin/
│   ├── governance/
│   ├── reports/
│   ├── integrations/
│   └── ai/
├── (auth)/          ← Public auth pages (no prefix in URL)
│   ├── login/
│   ├── register/
│   └── reset-password/
├── setup/           ← Setup wizard (no auth required)
└── layout.tsx       ← Root layout with providers
```

---

## Translation Still Works

Despite removing the `[locale]` folder, translations via `next-intl` still work:
- `useTranslations()` hook is still available
- Translation files are still loaded via `NextIntlClientProvider`
- Locale is determined from user preference or Accept-Language header

---

## For Future Development

When creating new pages:
1. Place them in `frontend/src/app/(app)/` for authenticated pages
2. Use `import Link from 'next/link'` for navigation
3. Use `useTranslations()` for i18n text

No special locale handling is needed — it's all handled internally by `next-intl`.
