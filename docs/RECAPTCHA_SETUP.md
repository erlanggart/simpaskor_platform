# Quick Setup Guide - reCAPTCHA & Rate Limiting

## Prerequisites

- Google Account for reCAPTCHA

## Step 1: Get reCAPTCHA Keys

1. Go to https://www.google.com/recaptcha/admin
2. Click "+" to create a new site
3. Fill in the form:
   - **Label**: Simpaskor Platform (or any name)
   - **reCAPTCHA type**: Select **reCAPTCHA v3**
   - **Domains**: Add your domains (for development, add `localhost`)
4. Accept terms and click "Submit"
5. Copy the **Site Key** and **Secret Key**

## Step 2: Configure Backend

1. Navigate to `backend/` directory
2. Copy `.env.example` to `.env` (if not already done):
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your reCAPTCHA Secret Key:
   ```bash
   RECAPTCHA_SECRET_KEY="your-secret-key-here"
   ```

## Step 3: Configure Frontend

1. Navigate to `frontend/` directory
2. Copy `.env.example` to `.env` (if not already done):
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your reCAPTCHA Site Key:
   ```bash
   VITE_RECAPTCHA_SITE_KEY="your-site-key-here"
   ```

## Step 4: Install Dependencies

Dependencies are already installed, but if you need to reinstall:

**Backend:**

```bash
cd backend
npm install
```

**Frontend:**

```bash
cd frontend
npm install
```

## Step 5: Test the Implementation

1. Start the backend server:

   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend server:

   ```bash
   cd frontend
   npm run dev
   ```

3. Open http://localhost:5173/register in your browser

4. Try to register:

   - Fill in the form
   - Click "Daftar"
   - Registration should work with reCAPTCHA verification

5. Test rate limiting:
   - Try to register 4 times within 1 hour from the same IP
   - 4th attempt should be blocked with error message

## Development/Testing Keys

For local testing without setting up reCAPTCHA, you can use Google's test keys:

**Frontend `.env`:**

```bash
VITE_RECAPTCHA_SITE_KEY="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
```

**Backend `.env`:**

```bash
RECAPTCHA_SECRET_KEY="6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
```

**Note:** These test keys always return success. DO NOT use in production!

## Verification

### Check Backend Logs

When someone registers, you should see:

```
reCAPTCHA verified successfully - Score: 0.85, Action: register, IP: 127.0.0.1
```

### Check reCAPTCHA Admin Console

1. Go to https://www.google.com/recaptcha/admin
2. Click on your site
3. View statistics and scores

## Troubleshooting

### "reCAPTCHA tidak tersedia"

- Check if `VITE_RECAPTCHA_SITE_KEY` is set in frontend `.env`
- Restart Vite dev server

### "Konfigurasi keamanan server tidak lengkap"

- Check if `RECAPTCHA_SECRET_KEY` is set in backend `.env`
- Restart backend server

### Rate limiting not working

- Check backend logs for IP detection
- If behind reverse proxy, configure headers

## Security Features

✅ **reCAPTCHA v3**: Invisible bot detection (score-based)  
✅ **Rate Limiting**: Max 3 registrations per hour per IP  
✅ **Proxy Support**: Detects real IP behind proxies/load balancers  
✅ **Custom Error Messages**: User-friendly Indonesian messages

## Next Steps

For detailed information, see:

- [docs/REGISTRATION_SECURITY.md](./REGISTRATION_SECURITY.md) - Complete documentation
- Backend code: `backend/src/middleware/`
- Frontend code: `frontend/src/pages/Register.tsx`

---

Need help? Check the main documentation or logs for more details.
