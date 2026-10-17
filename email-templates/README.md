# SYNTH authentication email templates

These ready-to-paste Supabase Auth templates cover the authentication methods currently used by SYNTH: password recovery and new-account email confirmation.

## Install manually in Supabase

In the Supabase project, open **Authentication → Email Templates**. Select **Reset Password**, paste `reset-password.html` into the HTML editor, and paste `reset-password.txt` into the plain-text editor if that editor is available. Repeat with **Confirm signup** and the matching `confirm-email` files.

The templates intentionally use Supabase's supported `{{ .ConfirmationURL }}` variable. SYNTH's existing client code supplies the recovery redirect to `/auth/callback?next=/auth/reset-password`, and the existing callback exchanges the code before the protected reset page is shown. Do not replace this variable with a guessed URL or expose tokens in the visible copy.

Supabase-hosted email templates are project configuration; adding these files to Git does not change the hosted templates automatically. No React or authentication runtime files were changed.

## Scope

Magic-link, email-change, and security-notification templates were not added because the current SYNTH implementation uses email/password signup and password recovery only. If those providers are enabled later, create matching templates using the variables shown in Supabase's template editor and preserve the existing callback route.

## Test checklist

- Create a test account through SYNTH and confirm the email link reaches `/auth/callback` and then the expected app route.
- Request password recovery from `/auth/forgot-password` and confirm the link reaches `/auth/callback?next=/auth/reset-password`.
- Set a new password, sign in with it, and verify an expired or already-used link remains rejected.
- Check both templates on desktop and a narrow mobile viewport, including the fallback plain-text content.
- Send a real test email after pasting the templates; this repository cannot verify Supabase-hosted delivery without sending an email.
