export default () => ({
  mail: {
    brevoApiKey: process.env.BREVO_API_KEY ?? '',
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? 'no-reply@blipzo.local',
    senderName: process.env.BREVO_SENDER_NAME ?? 'Blipzo',
  },
});
