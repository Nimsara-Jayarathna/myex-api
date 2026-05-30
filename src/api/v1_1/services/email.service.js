
import SibApiV3Sdk from "sib-api-v3-sdk";
import {
  otpEmail,
  resetPasswordEmail,
  changeEmailVerification,
  sendLoginNotification,
  welcomeEmail,
  passwordChanged,
  adminGeneratedPassword,
  adminOtpVerification,
} from "../../../utils/emailTemplates.js";
import { hashEmail, logger } from "../../../utils/logger.js";

// Initialize Brevo Client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const extractErrorDetails = (error) => {
  const response = error?.response || {};
  return {
    message: error?.message,
    code: error?.code,
    status: error?.status || response?.statusCode,
    responseBody: response?.body,
  };
};

const sendEmail = async (to, subject, htmlContent, type) => {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = {
    name: process.env.BREVO_SENDER_NAME || "Blipzo",
    email: process.env.BREVO_SENDER_EMAIL,
  };
  sendSmtpEmail.to = [{ email: to }];

  const toHash = hashEmail(to);
  logger.info({
    event: "email_send_attempt",
    provider: "brevo",
    type,
    subject,
    toHash,
  });

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info({
      event: "email_send_success",
      provider: "brevo",
      type,
      subject,
      toHash,
      messageId: data?.messageId,
    });
    return data;
  } catch (error) {
    logger.error({
      event: "email_send_failure",
      provider: "brevo",
      type,
      subject,
      toHash,
      ...extractErrorDetails(error),
    });
    throw error;
  }
};

export const sendOtpEmail = async (email, otp) => {
  const html = otpEmail(otp);
  return sendEmail(email, "Your Verification Code - Blipzo", html, "otp");
};

export const sendPasswordResetEmail = async (email, link) => {
  const html = resetPasswordEmail(link);
  return sendEmail(email, "Reset Your Password - Blipzo", html, "password_reset");
};

export const sendChangeEmailVerification = async (email, otp) => {
  const html = changeEmailVerification(otp);
  return sendEmail(email, "Verify Email Change - Blipzo", html, "change_email");
};

export const notifyLogin = async (email, name, ip, device) => {
  const html = sendLoginNotification(name, ip, device);
  return sendEmail(email, "New Login Detected - Blipzo", html, "login_alert");
};

export const sendWelcomeEmail = async (email, name) => {
  const html = welcomeEmail(name);
  return sendEmail(email, "Welcome to Blipzo!", html, "welcome");
};

export const sendPasswordChangeNotification = async (email, name) => {
  const resetLink = `${process.env.CLIENT_URL || "https://blipzo.xyz"}/forgot-password`;
  const html = passwordChanged(name, resetLink);
  return sendEmail(email, "Security Alert: Password Changed", html, "password_changed");
};

export const sendAdminPasswordResetNotification = async (email, name, temporaryPassword) => {
  const html = adminGeneratedPassword(name, temporaryPassword);
  return sendEmail(
    email,
    "Temporary Password Issued - Blipzo",
    html,
    "admin_password_reset"
  );
};

export const sendAdminOtpEmail = async (email, otp) => {
  const html = adminOtpVerification(otp);
  return sendEmail(email, "Your Admin Verification Code - Blipzo", html, "admin_otp");
};
