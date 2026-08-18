import random
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

def generate_otp(length: int = 6) -> str:
    """Generate a 6-digit OTP"""
    return ''.join([str(random.randint(0, 9)) for _ in range(length)])

def send_otp_email(email: str, otp: str) -> bool:
    """Send OTP via email. In development, prints to terminal."""
    try:
        # Always print OTP to terminal for development
        print(f"\n{'='*50}")
        print(f"🔐 OTP for {email}: {otp}")
        print(f"{'='*50}\n")
        
        # Try to send email if SMTP is configured
        if SMTP_EMAIL and SMTP_PASSWORD:
            try:
                import smtplib
                from email.mime.text import MIMEText
                from email.mime.multipart import MIMEMultipart
                
                msg = MIMEMultipart()
                msg['From'] = SMTP_EMAIL
                msg['To'] = email
                msg['Subject'] = "Kova CRM - Verification Code"
                
                body = f"""
                <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Kova CRM</h2>
                    <p>Your verification code is:</p>
                    <p style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">{otp}</p>
                    <p>This code expires in 10 minutes.</p>
                </div>
                """
                
                msg.attach(MIMEText(body, 'html'))
                
                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                server.starttls()
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()
            except Exception as e:
                print(f"Email sending failed (using terminal OTP instead): {e}")
        
        return True
    except Exception as e:
        print(f"OTP function error: {e}")
        print(f"🔐 OTP for {email}: {otp}")
        return True

def verify_otp(stored_otp: str, provided_otp: str, expires_at) -> bool:
    """Verify OTP matches and hasn't expired"""
    if not stored_otp or not expires_at:
        return False
    if datetime.utcnow() > expires_at:
        return False
    return stored_otp == provided_otp