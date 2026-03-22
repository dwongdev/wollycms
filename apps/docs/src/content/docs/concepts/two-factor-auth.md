---
title: Two-Factor Authentication
description: Add an extra layer of security with TOTP-based two-factor authentication.
---

WollyCMS supports time-based one-time password (TOTP) two-factor authentication. When enabled, users must enter a 6-digit code from an authenticator app after their password to log in.

## How it works

1. An admin or user enables 2FA from **System → Account** in the admin UI
2. They scan a QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.)
3. They enter a verification code to confirm setup
4. 10 single-use recovery codes are generated for emergency access
5. On subsequent logins, after entering their password, they're prompted for a TOTP code

## Login flow with 2FA

```
Password correct + 2FA disabled  →  Session JWT issued (unchanged)
Password correct + 2FA enabled   →  Challenge token issued (5 min)
                                 →  User enters TOTP code
                                 →  Session JWT issued (24h)
```

If the user checks **"Remember this device for 30 days"** during 2FA verification, an HttpOnly cookie is set. On the next login from that browser, the TOTP step is skipped.

## Enabling 2FA

1. Navigate to **System → Account** in the admin sidebar
2. Click **Enable 2FA**
3. Scan the QR code with your authenticator app
4. Enter the 6-digit code from your app to verify
5. **Save your recovery codes** — you won't see them again

:::caution
Store your recovery codes in a secure location (password manager, printed copy in a safe place). If you lose access to your authenticator app and don't have recovery codes, you will be locked out.
:::

## Recovery codes

When 2FA is enabled, WollyCMS generates 10 single-use recovery codes. Each code can be used exactly once in place of a TOTP code during login.

To regenerate recovery codes (invalidating the old ones):
1. Go to **System → Account**
2. Click **Regenerate Recovery Codes**
3. Enter your current password to confirm
4. Save the new codes

## Disabling 2FA

1. Go to **System → Account**
2. Click **Disable 2FA**
3. Enter your current password to confirm

This removes the TOTP secret and all recovery codes. The trusted device cookie is unaffected (it becomes inert since 2FA is no longer active).

## Trusted devices

When a user checks "Remember this device" during 2FA verification:

- A random 256-bit token is generated and stored as an HttpOnly cookie (`wolly_trusted`, 30-day expiry)
- The token hash is stored in the `trusted_devices` database table
- On the next login from the same browser, the server checks the cookie and skips the TOTP step
- The device trust is per-user — switching accounts on the same browser requires 2FA for each account

Trusted device tokens are automatically cleaned up when they expire. Disabling 2FA does not revoke trusted device cookies, but they have no effect without active 2FA.

## Security details

- **TOTP secrets** are encrypted at rest using AES-256-GCM. The encryption key is derived from `JWT_SECRET` via HKDF.
- **Recovery codes** are SHA-256 hashed before storage (like API keys). The plaintext is shown only once.
- **Trusted device tokens** are SHA-256 hashed before storage. The raw token exists only in the HttpOnly cookie.
- **Challenge tokens** are short-lived JWTs (5 minutes) that prove the password was verified but do not grant API access.
- **Rate limiting** applies to the TOTP verification endpoint, preventing brute-force attacks on 6-digit codes.
- The TOTP implementation follows RFC 6238 using HMAC-SHA1 with a 30-second time step and ±1 step tolerance (90-second window).
- All crypto operations use the Web Crypto API (`crypto.subtle`), which works on both Cloudflare Workers and Node.js.

## API endpoints

### During login

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/auth/login` | POST | None | Returns `requiresTwoFactor: true` and a `challengeToken` if 2FA is enabled |
| `/api/admin/auth/verify-2fa` | POST | None | Verifies TOTP code or recovery code, returns session JWT |

### 2FA management (authenticated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/auth/2fa/setup` | POST | Begin 2FA setup, returns QR code URI and secret |
| `/api/admin/auth/2fa/verify-setup` | POST | Confirm setup with first TOTP code, returns recovery codes |
| `/api/admin/auth/2fa` | DELETE | Disable 2FA (requires password in body) |
| `/api/admin/auth/2fa/recovery-codes` | POST | Regenerate recovery codes (requires password in body) |
