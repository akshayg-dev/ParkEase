import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendMail = async (to, subject, html) => {
  return transporter.sendMail({
    from: process.env.SMTP_FROM_EMAIL,
    to,
    subject,
    html,
  });
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
                style="
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #2563eb;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                "
            >
                Verify Email
            </a>

            <p>This link expires in 24 hours.</p>

            <p>If you did not create an account, ignore this email.</p>

            <p>Regards,<br>ParkEase Team</p>
        </div>
    `;

  await sendMail(email, subject, html);
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
                style="
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #2563eb;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                "
            >
                Reset Password
            </a>

            <p>This link expires in 15 minutes.</p>

            <p>If you did not request a password reset, ignore this email.</p>

            <p>Regards,<br>ParkEase Team</p>
        </div>
    `;

  await sendMail(email, subject, html);
};

export { sendMail, sendVerificationEmail, sendPasswordResetEmail };
