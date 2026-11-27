import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// COMMON EMAIL SENDER
const sendMail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is missing');
  }

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error('Email delivery failed:', error);
    throw new Error(error.message || 'Email delivery failed');
  }

  console.log('Email sent successfully:', data.id);

  return data;
};

// EMAIL VERIFICATION
const sendVerificationEmail = async (email, token) => {
  const subject = 'Verify Your ParkEase Account';

  const backendUrl = (
    process.env.BACKEND_URL || 'http://localhost:5050'
  ).replace(/\/+$/, '');

  const verificationUrl = `${backendUrl}/api/auth/verify-email/${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>Welcome to ParkEase!</h2>
      <p>Thank you for registering with ParkEase.</p>
      <p>Please verify your email address using the button below:</p>

      <a href="${verificationUrl}"
        style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:white;text-decoration:none;border-radius:6px;">
        Verify Email
      </a>

      <p>This link expires in 24 hours.</p>
      <p>If you did not create an account, ignore this email.</p>
      <p>Regards,<br>ParkEase Team</p>
    </div>
  `;

  return sendMail(email, subject, html);
};

// PASSWORD RESET
const sendPasswordResetEmail = async (email, token) => {
  const subject = 'Reset Your ParkEase Password';

  const frontendUrl = (
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ).replace(/\/+$/, '');

  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your ParkEase password.</p>

      <a href="${resetUrl}"
        style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:white;text-decoration:none;border-radius:6px;">
        Reset Password
      </a>

      <p>This link expires in 15 minutes.</p>
      <p>If you did not request a password reset, ignore this email.</p>
      <p>Regards,<br>ParkEase Team</p>
    </div>
  `;

  return sendMail(email, subject, html);
};

export { sendMail, sendVerificationEmail, sendPasswordResetEmail };
