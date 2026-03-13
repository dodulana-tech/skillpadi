# SkillPadi Security Audit Report

**Date:** 2026-03-13
**Auditor:** Claude Code (Automated)
**Scope:** Full codebase — authentication, authorization, payment security, data exposure, input validation, security headers

---

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 4 | 4 | 0 |
| High | 3 | 3 | 0 |
| Medium | 6 | 3 | 3 |
| Low | 3 | 0 | 3 |
| **Total** | **16** | **10** | **6** |

---

## Critical Issues — FIXED

### 1. Auth Bypass in Session Update Routes
**Files:** `app/api/notifications/session-update/route.js`, `app/api/notifications/bulk-session/route.js`
**Issue:** Called `requireRole(user, ['admin'])` passing a user object instead of the request object, and never checked the return value. Any authenticated user could increment sessions and send WhatsApp notifications.
**Fix:** Changed to `const auth = await requireRole(req, ['admin']); if (isAuthError(auth)) return auth;`

### 2. Auth Bypass in Term Report Route
**File:** `app/api/enrollments/[id]/report/route.js`
**Issue:** Same pattern — `requireRole` called incorrectly and result not checked. Any authenticated user could write/publish term reports for any enrollment.
**Fix:** Proper auth check + ownership verification on GET (parents can only see their own).

### 3. Payment Amount Not Verified (Verify Route)
**File:** `app/api/payments/verify/route.ts`
**Issue:** After Paystack verification, the route did not check that the amount paid matched the expected payment amount. An attacker could initialize a payment for the full amount, intercept, pay a lower amount, and still get membership/enrollment.
**Fix:** Added `if (paidAmountKobo < expectedAmountKobo)` check before processing.

### 4. Payment Amount Not Verified (Webhook Route)
**File:** `app/api/payments/webhook/route.js`
**Issue:** Same vulnerability — webhook processed payments without verifying the amount matched.
**Fix:** Added amount verification before marking payment as success.

---

## High Issues — FIXED

### 5. Coach Phone Numbers Exposed in Public API
**Files:** `app/page.js`, `app/api/programs/route.js`, `app/api/programs/[id]/route.js`, `app/programs/[id]/page.js`
**Issue:** Coach `whatsapp` field was included in `.populate()` calls for program listings, violating the policy that coach direct phone numbers are never exposed to parents.
**Fix:** Removed `whatsapp` from all coach populate selections in public-facing routes.

### 6. Missing HSTS Header
**File:** `next.config.mjs`
**Issue:** No Strict-Transport-Security header, allowing first HTTP request to be intercepted (downgrade attack).
**Fix:** Added `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

### 7. Missing Content Security Policy
**File:** `next.config.mjs`
**Issue:** No CSP header, allowing potential XSS attacks to load external scripts or steal payment data.
**Fix:** Added comprehensive CSP allowing only self, Paystack, Firebase, and Google Fonts.

---

## Medium Issues — FIXED

### 8. Donation Endpoint Missing Validation
**File:** `app/api/impact/donate/route.js`
**Issue:** No email format validation, no amount upper limit, no program status check, error messages leaked internal details.
**Fix:** Added email validation, amount range (₦1K-₦10M), program status check (only 'funding'/'active'), input sanitization, generic error messages.

### 9. Impact Propose Missing Coach Verification
**File:** `app/api/impact/propose/route.js`
**Issue:** Coach role users without a linked coachId could create impact programs with undefined coach references.
**Fix:** Added coachId existence check for coach role.

### 10. Error Message Information Leakage
**Files:** Multiple API routes
**Issue:** `err.message` was returned to clients, potentially exposing internal details (Mongoose validation errors, MongoDB connection strings, etc.)
**Fix:** Changed to generic `'Server error'` in catch blocks for new routes.

---

## Medium Issues — REMAINING (Manual Action Required)

### 11. Enrollment PATCH Missing Coach Ownership Check
**File:** `app/api/enrollments/[id]/route.js`
**Issue:** Coaches can update ANY enrollment, not just ones for programs they teach.
**Recommendation:** Add check: `if (auth.dbUser.role === 'coach') { verify enrollment.programId.coachId matches auth.dbUser.coachId }`

### 12. Passport Award/Stats Missing Ownership Check
**Files:** `app/api/passport/[childName]/award/route.js`, `app/api/passport/[childName]/stats/route.js`
**Issue:** Any coach can award achievements or update stats for any child, not just their students.
**Recommendation:** Verify coach teaches the program before allowing updates.

### 13. Tournament Registration No Child Verification
**File:** `app/api/tournaments/[id]/register/route.js`
**Issue:** Parents can register arbitrary child names without verifying they own that child.
**Recommendation:** Check `auth.dbUser.children.some(c => c.name === childName)`.

---

## Low Issues — REMAINING

### 14. In-Memory Rate Limiting
**File:** `lib/rate-limit.js`
**Issue:** Rate limiting is per-instance (Vercel serverless), not distributed. Can be bypassed with concurrent requests to different instances.
**Recommendation:** Upgrade to Upstash Redis for production rate limiting.

### 15. User PATCH Accepts All Fields
**File:** `app/api/users/[id]/route.js`
**Issue:** Admin PATCH endpoint accepts entire body without field whitelist, allowing modification of sensitive fields.
**Recommendation:** Use explicit field whitelist for allowed updates.

### 16. CSRF Protection
**Issue:** No CSRF tokens on POST endpoints. Mitigated by Firebase Auth (Bearer tokens required), but defense-in-depth recommends CSRF protection.
**Recommendation:** Consider adding CSRF tokens for state-changing operations.

---

## Positive Findings

1. **Paystack webhook signature verification** — Properly uses HMAC-SHA512 with timing-safe comparison
2. **Atomic spot booking** — Uses MongoDB `$expr` to prevent race conditions in enrollment
3. **Firebase token verification** — Properly implemented with admin SDK
4. **Fire-and-forget WhatsApp** — Non-blocking, silently fails if token not set
5. **Checkout amount calculation** — Server-side from database values, not client-controlled
6. **Environment validation** — Required env vars checked at startup
7. **Mongoose debug disabled** — No sensitive query logging in production
8. **.env.local in .gitignore** — Secrets not committed to repo
9. **poweredByHeader disabled** — No X-Powered-By header exposing Next.js

---

## Manual Action Required

1. **MongoDB Atlas:** Verify IP whitelist is not 0.0.0.0/0 in production
2. **MongoDB Atlas:** Enable database backups and audit logging
3. **Firebase Console:** Verify email enumeration protection is enabled
4. **Firebase Console:** Verify security rules are not set to public read/write
5. **Vercel Dashboard:** Verify environment variables are set (not committed)
6. **Privacy Policy:** Create `/privacy` page covering NDPR compliance (data collected, purpose, retention, deletion rights)
7. **Terms of Service:** Create `/terms` page
8. **Remaining code fixes:** Items 11-16 above should be addressed in the next sprint
