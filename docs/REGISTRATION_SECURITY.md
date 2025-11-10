# Registration Security Implementation

## Overview

The Simpaskor Platform implements multiple security layers to protect the registration endpoint from bot attacks and abuse. This includes **Google reCAPTCHA v3** for bot detection and **IP-based rate limiting** to prevent registration flooding.

## Security Features

### 1. Google reCAPTCHA v3

**What is reCAPTCHA v3?**
- Invisible CAPTCHA that works in the background
- Returns a score (0.0 - 1.0) indicating the likelihood of a user being human
- No user interaction required (no checkbox or challenge)
- 1.0 = very likely human, 0.0 = very likely bot

**Implementation:**
- **Frontend**: Automatically generates a token on form submission
- **Backend**: Verifies token with Google's API and checks score
- **Threshold**: 0.5 (configurable in `backend/src/middleware/recaptcha.ts`)
- **Action**: `register` (ensures token is used for registration only)

**Configuration:**
1. Get reCAPTCHA keys from: https://www.google.com/recaptcha/admin
2. Choose reCAPTCHA v3
3. Add your domain(s)
4. Copy Site Key → `VITE_RECAPTCHA_SITE_KEY` (frontend)
5. Copy Secret Key → `RECAPTCHA_SECRET_KEY` (backend)

### 2. IP-Based Rate Limiting

**Limits:**
- **Registration**: 3 attempts per hour per IP address
- **General API**: 100 requests per 15 minutes per IP address (optional)

**Features:**
- Tracks IP addresses from various sources (proxy-aware)
- Returns `429 Too Many Requests` when limit exceeded
- Includes `RateLimit-*` headers for client information
- Custom error messages in Indonesian

**Implementation:**
- Uses `express-rate-limit` package
- Configured in `backend/src/middleware/rateLimiter.ts`
- Applied to `/api/auth/register` endpoint

**IP Detection:**
The rate limiter intelligently detects IP addresses from:
1. `X-Forwarded-For` header (for reverse proxies/load balancers)
2. `X-Real-IP` header
3. `req.ip` (fallback)

This ensures proper rate limiting even behind proxies like Nginx or load balancers.

## Architecture

### Backend Middleware Stack

```typescript
// /api/auth/register endpoint protection
router.post(
  "/register",
  registrationLimiter,     // 1. Rate limiting (3/hour per IP)
  verifyRecaptcha,         // 2. reCAPTCHA verification (score ≥ 0.5)
  async (req, res) => {    // 3. Registration logic
    // ... actual registration code
  }
);
```

**Execution Order:**
1. **Rate Limiter** checks if IP has exceeded limits
2. **reCAPTCHA Verifier** validates token and checks score
3. **Registration Handler** creates user account

If any middleware fails, the request is rejected before reaching the registration handler.

### Frontend Integration

```tsx
// App wrapped with reCAPTCHA provider
<GoogleReCaptchaProvider reCaptchaKey={VITE_RECAPTCHA_SITE_KEY}>
  <App />
</GoogleReCaptchaProvider>

// Register.tsx
const { executeRecaptcha } = useGoogleReCaptcha();

const onSubmit = async (data) => {
  const recaptchaToken = await executeRecaptcha("register");
  await registerUser({ ...data, recaptchaToken });
};
```

## File Structure

### Backend Files

```
backend/src/
├── middleware/
│   ├── rateLimiter.ts      # Rate limiting configuration
│   └── recaptcha.ts        # reCAPTCHA verification
└── routes/
    └── auth.ts             # Registration endpoint with protections
```

### Frontend Files

```
frontend/src/
├── main.tsx                # GoogleReCaptchaProvider wrapper
└── pages/
    └── Register.tsx        # Registration form with reCAPTCHA
```

## Environment Variables

### Backend (`.env`)

```bash
# Google reCAPTCHA v3 Secret Key
RECAPTCHA_SECRET_KEY="your-recaptcha-secret-key-here"
```

### Frontend (`.env`)

```bash
# Google reCAPTCHA v3 Site Key
VITE_RECAPTCHA_SITE_KEY="your-recaptcha-site-key-here"
```

**Important:** Never commit your actual keys to version control. Use `.env` files (which should be in `.gitignore`).

## Error Handling

### Rate Limit Exceeded (429)

**Response:**
```json
{
  "error": "Too many registration attempts",
  "message": "Terlalu banyak percobaan registrasi dari IP ini. Silakan coba lagi setelah 1 jam.",
  "retryAfter": "1 hour"
}
```

**Frontend Handling:**
- Shows user-friendly error message in Indonesian
- Suggests waiting 1 hour before retrying

### reCAPTCHA Verification Failed (400)

**Scenarios:**

1. **Missing Token:**
```json
{
  "error": "reCAPTCHA verification required",
  "message": "Token reCAPTCHA tidak ditemukan. Silakan refresh halaman."
}
```

2. **Invalid Token:**
```json
{
  "error": "reCAPTCHA verification failed",
  "message": "Verifikasi reCAPTCHA gagal. Silakan coba lagi."
}
```

3. **Low Score (Bot Detected):**
```json
{
  "error": "Suspicious activity detected",
  "message": "Aktivitas mencurigakan terdeteksi. Jika Anda bukan bot, silakan coba lagi atau hubungi administrator."
}
```

**Frontend Handling:**
- Detects reCAPTCHA errors by status code and message content
- Shows appropriate error message
- Suggests refreshing the page

### Server Configuration Error (500)

**Response:**
```json
{
  "error": "Server configuration error",
  "message": "Konfigurasi keamanan server tidak lengkap."
}
```

**Cause:** `RECAPTCHA_SECRET_KEY` not configured in backend `.env`

## Testing

### Testing reCAPTCHA Integration

**Development/Testing Mode:**

If you need to test without reCAPTCHA (for development):

1. Google provides test keys that always return success:
   - **Site Key:** `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
   - **Secret Key:** `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

2. These keys will:
   - Always validate successfully
   - Always return a score of 0.9
   - Work on all domains (including localhost)

**Important:** Never use test keys in production!

### Testing Rate Limiting

**Test Scenario:**
1. Try to register 3 times from the same IP within 1 hour
2. 4th attempt should be blocked with 429 error
3. Wait 1 hour or restart server to reset
4. Should be able to register again

**Reset Rate Limit (Development):**
- Restart the backend server
- Rate limit counters are stored in memory (will reset on restart)

**Production Considerations:**
- Consider using Redis for persistent rate limiting
- Allows rate limits to persist across server restarts
- Enables distributed rate limiting across multiple servers

## Adjusting Security Settings

### Change Rate Limit

**Location:** `backend/src/middleware/rateLimiter.ts`

```typescript
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // Change time window (currently 1 hour)
  max: 3,                     // Change max attempts (currently 3)
  // ... other options
});
```

**Examples:**
- Stricter: `max: 2, windowMs: 2 * 60 * 60 * 1000` (2 attempts per 2 hours)
- Looser: `max: 5, windowMs: 30 * 60 * 1000` (5 attempts per 30 minutes)

### Change reCAPTCHA Threshold

**Location:** `backend/src/middleware/recaptcha.ts`

```typescript
const threshold = 0.5;  // Change this value (0.0 - 1.0)
```

**Guidelines:**
- **0.0 - 0.3**: Very lenient (allows most traffic, including suspicious)
- **0.4 - 0.6**: Balanced (recommended)
- **0.7 - 1.0**: Strict (may block some legitimate users)

**Recommendation:** Start with 0.5 and adjust based on your logs and user feedback.

### Monitor reCAPTCHA Scores

**Backend logs include:**
```
reCAPTCHA verified successfully - Score: 0.85, Action: register, IP: 192.168.1.1
```

**Low scores are logged as warnings:**
```
Low reCAPTCHA score detected: 0.3 for IP: 192.168.1.1, Action: register
```

**Analysis:**
- Check logs regularly to see score distribution
- If legitimate users are being blocked (score < 0.5), lower threshold
- If bots are getting through (score > 0.5 but suspicious behavior), raise threshold

## Security Best Practices

### ✅ Do's

1. **Monitor Logs:**
   - Regularly check reCAPTCHA scores
   - Watch for patterns in rate limit violations
   - Investigate repeated suspicious activity

2. **Keep Keys Secret:**
   - Never commit `.env` files to Git
   - Use different keys for development and production
   - Rotate keys periodically (every 6-12 months)

3. **Use HTTPS:**
   - reCAPTCHA requires HTTPS in production
   - Ensures secure token transmission

4. **Configure Domains:**
   - Only whitelist domains you control in reCAPTCHA admin
   - Update list when adding new domains

5. **Test Thoroughly:**
   - Test registration from different IPs
   - Test rate limiting behavior
   - Test error messages are user-friendly

### ❌ Don'ts

1. **Don't Use Test Keys in Production:**
   - Test keys always pass validation
   - Provides no actual security

2. **Don't Ignore Failed Verifications:**
   - Log all failures for analysis
   - May indicate attack attempts

3. **Don't Set Threshold Too High:**
   - May block legitimate users
   - Start at 0.5 and adjust based on data

4. **Don't Rely on Rate Limiting Alone:**
   - Bots can rotate IPs
   - reCAPTCHA provides additional protection

5. **Don't Store Sensitive Keys in Code:**
   - Always use environment variables
   - Never hardcode keys

## Production Deployment

### Checklist

- [ ] Generate production reCAPTCHA keys
- [ ] Add production domain to reCAPTCHA whitelist
- [ ] Set `RECAPTCHA_SECRET_KEY` in backend production environment
- [ ] Set `VITE_RECAPTCHA_SITE_KEY` in frontend production environment
- [ ] Ensure backend is behind HTTPS
- [ ] Configure reverse proxy headers (`X-Forwarded-For`)
- [ ] Set up monitoring for rate limit violations
- [ ] Set up monitoring for low reCAPTCHA scores
- [ ] Test registration from production domain
- [ ] Document threshold and rate limit settings
- [ ] Set up alerts for unusual activity

### Nginx Configuration (Example)

If using Nginx as reverse proxy:

```nginx
server {
    # ... other config

    location /api {
        proxy_pass http://localhost:3001;
        
        # Important: Pass real IP to backend
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

This ensures rate limiting works correctly by passing the real client IP.

## Troubleshooting

### Issue: "reCAPTCHA tidak tersedia"

**Cause:** `VITE_RECAPTCHA_SITE_KEY` not set or invalid

**Solution:**
1. Check `.env` file in frontend directory
2. Ensure key starts with `VITE_`
3. Restart Vite dev server (`npm run dev`)

### Issue: Rate limit not working

**Cause:** Backend can't determine IP address

**Solution:**
1. Check if behind reverse proxy
2. Configure proxy to pass `X-Forwarded-For` header
3. Check backend logs for IP detection

### Issue: All registrations blocked by reCAPTCHA

**Cause:** Using invalid keys or domain not whitelisted

**Solution:**
1. Verify keys in reCAPTCHA admin console
2. Check domain whitelist in reCAPTCHA admin
3. For localhost development, use test keys
4. Check browser console for reCAPTCHA errors

### Issue: Bot registrations still getting through

**Cause:** Threshold too low or bots using sophisticated techniques

**Solution:**
1. Increase reCAPTCHA threshold to 0.6 or higher
2. Reduce rate limit (e.g., 2 attempts per 2 hours)
3. Add additional verification (email verification, phone verification)
4. Monitor and analyze bot patterns in logs

## Additional Security Layers (Future Enhancements)

Consider adding these additional protections:

1. **Email Verification:**
   - Require email confirmation before account activation
   - Prevents spam accounts

2. **SMS Verification:**
   - For high-value accounts
   - Harder for bots to bypass

3. **Honeypot Fields:**
   - Hidden form fields that bots fill out
   - Humans won't see or fill these fields

4. **Behavioral Analysis:**
   - Track form fill time (too fast = bot)
   - Track mouse movements
   - Track typing patterns

5. **IP Reputation Checking:**
   - Check against known bot/proxy IP lists
   - Block VPN/proxy traffic if appropriate

6. **Database-Level Deduplication:**
   - Prevent duplicate emails/phones
   - Already implemented in current system

## Support

For issues or questions:
- Check logs in `backend/` directory
- Review reCAPTCHA admin console for statistics
- Test with reCAPTCHA test keys first
- Check GitHub issues for similar problems

---

**Last Updated:** November 6, 2025  
**Version:** 1.0.0
