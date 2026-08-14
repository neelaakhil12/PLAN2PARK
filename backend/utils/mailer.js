const nodemailer = require('nodemailer');

const createTransporter = () => {
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const isSmtpConfigured =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    smtpPass;

  if (isSmtpConfigured) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass,
      },
    });
  }
  return null;
};

const sendVerificationEmail = async (email, otpCode) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.log('----------------------------------------------------');
      console.log(`[EMAIL SEND SIMULATION] To: ${email}`);
      console.log(`[EMAIL SEND SIMULATION] Subject: PlanToPark Email Verification`);
      console.log(`[EMAIL SEND SIMULATION] Body: Your verification OTP is: ${otpCode}`);
      console.log('----------------------------------------------------');
      return true;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || `"PlanToPark" <${process.env.SMTP_USER || 'plantopark@gmail.com'}>`,
      to: email,
      subject: 'PlanToPark Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
          <h2 style="color: #10b981; text-align: center;">Welcome to PlanToPark!</h2>
          <p>Thank you for registering on PlanToPark. Please verify your email address to continue.</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #64748b; margin-top: 0;">Your Verification OTP Code</p>
            <h1 style="font-size: 32px; font-weight: bold; color: #0f172a; letter-spacing: 4px; margin: 5px 0;">${otpCode}</h1>
          </div>
          <p>This verification code is valid for 30 minutes. If you did not request this, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">PlanToPark Parking Solutions &copy; 2026</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email successfully sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email via Nodemailer:', error.message);
    return false;
  }
};

const sendPasswordResetEmail = async (email, otpCode, resetToken) => {
  try {
    const transporter = createTransporter();
    const webResetUrl = `http://localhost:5173/reset-password?email=${encodeURIComponent(email)}&code=${otpCode}`;

    if (!transporter) {
      console.log('----------------------------------------------------');
      console.log(`[PASSWORD RESET SIMULATION] To: ${email}`);
      console.log(`[PASSWORD RESET SIMULATION] OTP Code: ${otpCode}`);
      console.log(`[PASSWORD RESET SIMULATION] Reset Link: ${webResetUrl}`);
      console.log('----------------------------------------------------');
      return true;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || `"PlanToPark" <${process.env.SMTP_USER || 'plantopark@gmail.com'}>`,
      to: email,
      subject: 'PlanToPark Password Reset Code & Link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #059669; text-align: center; margin-bottom: 8px;">PlanToPark Account Recovery</h2>
          <p style="color: #475569; font-size: 15px; text-align: center;">We received a request to reset the password for your PlanToPark account (<b>${email}</b>).</p>
          
          <div style="background-color: #f1f5f9; border: 1.5px dashed #059669; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 0; letter-spacing: 1px;">Your 6-Digit Password Reset Code</p>
            <h1 style="font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: 6px; margin: 10px 0;">${otpCode}</h1>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Enter this code on your mobile app (Owner or Seeker app) to set a new password.</p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${webResetUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(5,150,105,0.25);">Reset Password via Website</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">This reset code and link will expire in <b>15 minutes</b>. If you did not request a password reset, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">PlanToPark Parking Solutions &copy; 2026 | plantopark@gmail.com</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email successfully sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email via Nodemailer:', error.message);
    return false;
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
