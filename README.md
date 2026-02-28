# SkillPadi — Kids Skills Development Platform

Structured skills development for kids ages 3-16 in Abuja.

## Deploy to Vercel

### 1. MongoDB Atlas
- Create free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
- Network Access → Add `0.0.0.0/0` (required for Vercel serverless)
- Database Access → Create user with read/write
- Get connection string

### 2. Firebase
- Create project at [console.firebase.google.com](https://console.firebase.google.com)
- Authentication → Enable: Google, Email/Password, Phone
- Get web app config + Service Account private key

### 3. Paystack
- Sign up at [dashboard.paystack.com](https://dashboard.paystack.com)
- Get API keys (test first, live later)
- After deploy: add webhook `https://yourdomain.com/api/payments/webhook`

### 4. Deploy

```bash
tar -xzf skillpadi-nextjs.tar.gz && cd skillpadi
npm install
cp .env.example .env.local  # fill in values
npm run seed                 # load Abuja data
npm run dev                  # test at localhost:3000
npx vercel                   # deploy
```

### 5. Vercel Environment Variables

Add in Vercel Dashboard → Settings → Environment Variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGODB_URI` | Yes | Atlas connection string |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | |
| `FIREBASE_PROJECT_ID` | Yes | Same as above |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account |
| `FIREBASE_PRIVATE_KEY` | Yes | Full PEM key |
| `PAYSTACK_SECRET_KEY` | Yes | `sk_test_...` or `sk_live_...` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | `pk_test_...` or `pk_live_...` |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://yourdomain.com` |
| `NEXT_PUBLIC_WA_BUSINESS` | Yes | Your WhatsApp e.g. `2348012345678` |
| `ADMIN_EMAIL` | Yes | First signup gets admin role |
| `WHATSAPP_TOKEN` | No | Meta API token |
| `WHATSAPP_PHONE_NUMBER_ID` | No | From Meta dashboard |

### 6. Post-Deploy

- [ ] `https://yourdomain.com/api/health` → `{"status":"ok"}`
- [ ] Sign up with ADMIN_EMAIL → verify admin role
- [ ] Add Paystack webhook URL
- [ ] Test ₦100 payment in test mode
- [ ] Switch to Paystack live keys when ready

### 7. Seed Production

```bash
MONGODB_URI="mongodb+srv://..." node scripts/seed.mjs
```

## Security

- All routes wrapped in error-catching handler
- Input validation on every POST/PATCH
- Rate limiting on public endpoints
- CORS restricted to app domain
- Security headers (X-Frame-Options, CSP, etc.)
- Atomic spot booking (no double-enrollment)
- Idempotent payment webhook
- Timing-safe signature verification
- Field-whitelisted profile updates
