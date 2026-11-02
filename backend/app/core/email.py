from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import settings

logger = logging.getLogger("uvicorn.error")
if not logger.handlers:
    logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> bool:
    """
    Sends an email using configured SMTP settings.
    If SMTP credentials are not configured, prints the email nicely to logs (mock mode).
    Always handles exceptions safely so user signup/activation never fails due to email issues.
    """
    if not text_content:
        # Fallback text content if none provided
        text_content = html_content.replace("<br>", "\n").replace("</p>", "\n\n")

    # ── Strategy 1: HTTP-based Email API (Resend) ──────────────────────
    # Cloud providers like Render Free Tier block outbound SMTP ports (25, 465, 587).
    # HTTP APIs use Port 443 (HTTPS) which is never blocked!
    if settings.RESEND_API_KEY:
        try:
            import json
            import urllib.request

            # For resend, if using gmail/custom domain before domain verification, use onboarding@resend.dev
            from_email = settings.SMTP_FROM_EMAIL
            if not from_email or "gmail.com" in from_email or "yahoo.com" in from_email:
                sender_header = f"{settings.SMTP_FROM_NAME} <onboarding@resend.dev>"
            else:
                sender_header = f"{settings.SMTP_FROM_NAME} <{from_email}>"

            payload = {
                "from": sender_header,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY.strip()}",
                    "Content-Type": "application/json",
                    "User-Agent": "LogisticsCRM/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status in (200, 201):
                    logger.info(f"[EMAIL SERVICE - RESEND API] Successfully sent email to {to_email}")
                    return True
        except Exception as exc:
            logger.error(f"[EMAIL SERVICE ERROR - RESEND API] Failed to send to {to_email}: {exc}")

    # ── Strategy 2: HTTP-based Email API (Brevo) ───────────────────────
    if settings.BREVO_API_KEY:
        try:
            import json
            import urllib.request

            payload = {
                "sender": {"name": settings.SMTP_FROM_NAME, "email": settings.SMTP_FROM_EMAIL},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_content,
                "textContent": text_content,
            }
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "api-key": settings.BREVO_API_KEY.strip(),
                    "Content-Type": "application/json",
                    "User-Agent": "LogisticsCRM/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status in (200, 201):
                    logger.info(f"[EMAIL SERVICE - BREVO API] Successfully sent email to {to_email}")
                    return True
        except Exception as exc:
            logger.error(f"[EMAIL SERVICE ERROR - BREVO API] Failed to send to {to_email}: {exc}")

    # ── Strategy 3: Standard SMTP (Localhost / Paid Servers) ────────────
    if settings.SMTP_HOST:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            if settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
                if settings.SMTP_TLS:
                    server.starttls()

            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                clean_pwd = settings.SMTP_PASSWORD.replace(" ", "").strip()
                server.login(settings.SMTP_USER, clean_pwd)

            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            server.quit()
            logger.info(f"[EMAIL SERVICE - SMTP] Successfully sent email '{subject}' to {to_email}")
            return True
        except Exception as exc:
            logger.error(f"[EMAIL SERVICE ERROR - SMTP] Failed to send email to {to_email}: {exc}")
            return False

    # ── Strategy 4: Local Dev Mock Fallback ────────────────────────────
    divider = "-" * 60
    border = "=" * 60
    logger.info(
        f"\n{border}\n"
        f"[EMAIL SERVICE (LOCAL/DEV MOCK)]\n"
        f"To: {to_email}\n"
        f"From: {settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>\n"
        f"Subject: {subject}\n"
        f"{divider}\n"
        f"{text_content.strip()}\n"
        f"{border}"
    )
    return True


def send_registration_received_email(
    to_email: str,
    company_name: str,
    subdomain: str,
    plan: str,
    admin_name: str,
) -> bool:
    """
    Sends registration acknowledgment email to newly registered logistics company admin.
    """
    subject = f"Registration Request Received — Welcome to Logistics CRM ({company_name})"

    text_content = f"""
Hello {admin_name},

Thank you for your registration request for {company_name} on Logistics CRM!

We have successfully received your application. Our administrative team will review your company details and activate your subscription portal shortly.

Registration Details:
- Company Legal Name: {company_name}
- Dedicated Workspace Subdomain: {subdomain}
- Selected Subscription Plan: {plan.title()}
- Registered Admin Email: {to_email}
- Status: Under Review (Pending Super Admin Activation)

What happens next?
1. Our platform team reviews and verifies your logistics company profile.
2. Upon approval, your subscription will be activated.
3. You will receive an email confirmation that your workspace is active and ready to sign in.

If you have any questions in the meantime, please reach out to our platform support team.

Best regards,
Logistics SaaS Platform Team
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Registration Request Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 32px 16px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Logistics CRM Platform</h1>
      <p style="margin: 6px 0 0 0; color: #bfdbfe; font-size: 13px;">Freight Forwarding, Customs Milestones & Financials</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 24px;">
      <div style="background-color: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <span style="font-size: 28px;">📦</span>
        <h2 style="margin: 8px 0 4px 0; color: #60a5fa; font-size: 18px; font-weight: 600;">Registration Request Received!</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">Thank you for registering with us. Your account is being reviewed.</p>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
        Hello <strong style="color: #ffffff;">{admin_name}</strong>,
      </p>
      
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for your registration request for <strong style="color: #60a5fa;">{company_name}</strong>. Our team will review your company details and activate your subscription shortly.
      </p>

      <!-- Details Box -->
      <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Application Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Company Name:</td>
            <td style="padding: 6px 0; color: #f8fafc; font-weight: 600; text-align: right;">{company_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Workspace Subdomain:</td>
            <td style="padding: 6px 0; color: #60a5fa; font-family: monospace; font-weight: 600; text-align: right;">{subdomain}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Selected Plan:</td>
            <td style="padding: 6px 0; color: #f8fafc; font-weight: 600; text-align: right;">{plan.title()} Plan</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Admin Email:</td>
            <td style="padding: 6px 0; color: #f8fafc; text-align: right;">{to_email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Status:</td>
            <td style="padding: 6px 0; text-align: right;">
              <span style="background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">Pending Review</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Next Steps -->
      <div style="border-top: 1px solid #334155; padding-top: 18px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px;">Next Steps:</h4>
        <ol style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
          <li>Our administration team verifies company details.</li>
          <li>Once approved, your tenant portal will be activated.</li>
          <li>You will receive an activation email to immediately sign into your workspace.</li>
        </ol>
      </div>

      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
        If you have any questions or require custom setup assistance, please reply directly to this email or contact support.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #0f172a; border-top: 1px solid #334155; padding: 16px 24px; text-align: center; color: #64748b; font-size: 11px;">
      &copy; Logistics CRM Platform. All rights reserved. Automated platform notification.
    </div>

  </div>
</body>
</html>
"""

    return send_email(to_email, subject, html_content, text_content)


def send_subscription_activated_email(
    to_email: str,
    company_name: str,
    subdomain: str,
    plan: str,
    base_domain: str = "localhost:3000",
) -> bool:
    """
    Sends activation email when super admin activates a tenant company.
    """
    subject = f"🎉 Account Activated — Your {company_name} Workspace is Ready!"
    
    # Construct tenant URL
    if base_domain.endswith(".vercel.app") or "localhost" in base_domain:
        workspace_url = f"http://{base_domain}/login?tenant={subdomain}"
    else:
        workspace_url = f"https://{subdomain}.{base_domain}/login"

    text_content = f"""
Hello {company_name} Team,

Great news! Your subscription account for {company_name} has been reviewed and activated by our platform administration.

Your workspace is now live:
- Workspace URL: {workspace_url}
- Sign-in Email: {to_email}
- Plan: {plan.title()} Plan
- Status: ACTIVE

You can now sign in using your registered credentials to start creating enquiries, managing shipment jobs, and tracking freight financials.

Welcome aboard!
Logistics SaaS Platform Team
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Activated</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 32px 16px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
    
    <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Workspace Activated! 🎉</h1>
      <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 13px;">Your Logistics CRM subscription is now active</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
        Hello <strong style="color: #ffffff;">{company_name} Team</strong>,
      </p>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        We are thrilled to let you know that your subscription has been officially activated. Your dedicated shipment workspace is ready for operations.
      </p>

      <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Company:</td>
            <td style="padding: 6px 0; color: #f8fafc; font-weight: 600; text-align: right;">{company_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Subdomain:</td>
            <td style="padding: 6px 0; color: #34d399; font-family: monospace; font-weight: 600; text-align: right;">{subdomain}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Login Email:</td>
            <td style="padding: 6px 0; color: #f8fafc; text-align: right;">{to_email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Status:</td>
            <td style="padding: 6px 0; text-align: right;">
              <span style="background-color: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">ACTIVE</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="{workspace_url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
          Sign In to Your Workspace &rarr;
        </a>
      </div>
    </div>

    <div style="background-color: #0f172a; border-top: 1px solid #334155; padding: 16px 24px; text-align: center; color: #64748b; font-size: 11px;">
      &copy; Logistics CRM Platform. All rights reserved.
    </div>

  </div>
</body>
</html>
"""

    return send_email(to_email, subject, html_content, text_content)
