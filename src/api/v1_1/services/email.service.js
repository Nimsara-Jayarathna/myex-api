
import SibApiV3Sdk from 'sib-api-v3-sdk';
import { otpEmail, resetPasswordEmail, changeEmailVerification, sendLoginNotification, welcomeEmail } from "../../../utils/emailTemplates.js";

// Initialize Brevo Client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async (to, subject, htmlContent) => {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { "name": process.env.BREVO_SENDER_NAME || "Blipzo", "email": process.env.BREVO_SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": to }];

    console.log(`Sending email to ${to} with subject: ${subject}`);

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export const sendOtpEmail = async (email, otp) => {
    const html = otpEmail(otp);
    return sendEmail(email, "Your Verification Code - Blipzo", html);
};

export const sendPasswordResetEmail = async (email, link) => {
    const html = resetPasswordEmail(link);
    return sendEmail(email, "Reset Your Password - Blipzo", html);
};

export const sendChangeEmailVerification = async (email, otp) => {
    const html = changeEmailVerification(otp);
    return sendEmail(email, "Verify Email Change - Blipzo", html);
};

export const notifyLogin = async (email, name, ip, device) => {
    const html = sendLoginNotification(name, ip, device);
    return sendEmail(email, "New Login Detected - Blipzo", html);
};

export const sendWelcomeEmail = async (email, name) => {
    const html = welcomeEmail(name);
    return sendEmail(email, "Welcome to Blipzo!", html);
};
