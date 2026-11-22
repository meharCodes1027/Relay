import nodemailer from "nodemailer";

export function createMailer(env = process.env) {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM", "APP_URL"];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) return null;

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
  });

  return {
    async sendInvitation({ recipient, workspaceName, token }) {
      const invitationUrl = `${env.APP_URL.replace(/\/$/, "")}/invite/${token}`;
      await transporter.sendMail({
        from: env.MAIL_FROM,
        to: recipient,
        subject: `You've been invited to join ${workspaceName} on Relay`,
        text: `You have been invited to join ${workspaceName} on Relay.\n\nOpen this link to accept the invitation:\n${invitationUrl}\n\nThis invitation expires in 7 days.`,
        html: `<p>You have been invited to join <strong>${workspaceName}</strong> on Relay.</p><p><a href="${invitationUrl}">Accept the invitation</a></p><p>This invitation expires in 7 days.</p>`
      });
    }
  };
}
