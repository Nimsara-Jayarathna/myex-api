
const styles = `
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #51545e; margin: 0; padding: 0; }
  .email-wrapper { width: 100%; background-color: #f4f4f7; padding: 20px; }
  .email-content { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .email-header { background-color: #1a1a1a; padding: 20px; text-align: center; }
  .email-header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
  .email-body { padding: 30px; }
  .email-body h2 { color: #333333; font-size: 20px; margin-top: 0; }
  .email-body p { line-height: 1.6; color: #51545e; }
  .otp-code { display: block; width: fit-content; margin: 20px auto; background-color: #f0f0f0; padding: 15px 30px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px; }
  .action-button { display: inline-block; background-color: #007bff; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; margin: 20px 0; }
  .email-footer { background-color: #f4f4f7; padding: 20px; text-align: center; font-size: 12px; color: #a8aaaf; }
  .email-footer a { color: #a8aaaf; text-decoration: underline; }
`;

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <style>${styles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <div class="email-header">
        <h1>BLIPZO</h1>
      </div>
      <div class="email-body">
        ${content}
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} Blipzo. All rights reserved.</p>
        <p>
          <a href="https://www.blipzo.xyz">www.blipzo.xyz</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const otpEmail = (code) => baseTemplate(`
  <h2>Verify Your Email</h2>
  <p>Thanks for getting started with Blipzo! Please use the following One-Time Password (OTP) to verify your email address and complete your registration.</p>
  <div class="otp-code">${code}</div>
  <p>This code is valid for 10 minutes.</p>
  <p>If you didn't request this, please ignore this email.</p>
`);

export const resetPasswordEmail = (link) => baseTemplate(`
  <h2>Reset Your Password</h2>
  <p>You recently requested to reset your password for your Blipzo account. Click the button below to proceed.</p>
  <div style="text-align: center;">
    <a href="${link}" class="action-button">Reset Password</a>
  </div>
  <p>If the button doesn't work, copy and paste this link into your browser:</p>
  <p><a href="${link}">${link}</a></p>
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
`);

export const changeEmailVerification = (code) => baseTemplate(`
  <h2>Verify Email Change</h2>
  <p>We received a request to change the email address associated with your Blipzo account.</p>
  <p>Please use the verification code below to confirm this action:</p>
  <div class="otp-code">${code}</div>
  <p>This code is valid for 10 minutes.</p>
  <p>If you didn't initiate this request, please contact support immediately.</p>
`);

export const sendLoginNotification = (name, ip, device) => baseTemplate(`
  <h2>New Login Detected</h2>
  <p>Hi ${name},</p>
  <p>We noticed a new login to your Blipzo account from a new device.</p>
  <ul>
    <li><strong>Device:</strong> ${device}</li>
    <li><strong>IP Address:</strong> ${ip}</li>
    <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
  </ul>
  <p>If this was you, you can safely ignore this email.</p>
  <p>If you suspect unauthorized activity, please change your password immediately.</p>
`);

export const welcomeEmail = (name) => baseTemplate(`
  <h2>Welcome to Blipzo, ${name}!</h2>
  <p>We're thrilled to have you on board.</p>
  <p>Blipzo is designed to help you manage your finances with ease and style. We hope you enjoy using our platform.</p>
  <p>If you have any questions or need assistance, feel free to reply to this email or contact our support team.</p>
  <br>
  <div style="text-align: center;">
    <a href="${process.env.CLIENT_URL || 'https://blipzo.xyz'}" class="action-button">Go to Dashboard</a>
  </div>
`);
