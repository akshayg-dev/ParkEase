const sendMail = async (to, subject, html) => {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (!url || !secret) {
    throw new Error('Google Apps Script email configuration missing');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secret,
      to,
      subject,
      html,
    }),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Email service HTTP error: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Email delivery failed');
  }

  return result;
};

// EMAIL VERIFICATION
const sendVerificationEmail = async (email, token) => {
  const backendUrl = (
    process.env.BACKEND_URL || 'http://localhost:5050'
  ).replace(/\/+$/, '');

  const verificationUrl = `${backendUrl}/api/auth/verify-email/${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>Welcome to ParkEase!</h2>
      <p>Thank you for registering with ParkEase.</p>
      <p>Please verify your email address:</p>
      <a href="${verificationUrl}"
        style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
      <p>If you did not create an account, ignore this email.</p>
      <p>Regards,<br>ParkEase Team</p>
    </div>
  `;

  return sendMail(email, 'Verify Your ParkEase Account', html);
};

// PASSWORD RESET
const sendPasswordResetEmail = async (email, token) => {
  const frontendUrl = (
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ).replace(/\/+$/, '');

  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your ParkEase password.</p>
      <a href="${resetUrl}"
        style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
        Reset Password
      </a>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not request this, ignore this email.</p>
      <p>Regards,<br>ParkEase Team</p>
    </div>
  `;

  return sendMail(email, 'Reset Your ParkEase Password', html);
};

export { sendMail, sendVerificationEmail, sendPasswordResetEmail };
