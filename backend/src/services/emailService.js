const nodemailer = require('nodemailer');
const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM } = require('../config/env');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (MAIL_USER && MAIL_PASSWORD) {
      transporter = nodemailer.createTransporter({
        host: MAIL_HOST,
        port: MAIL_PORT,
        secure: MAIL_PORT === 465,
        auth: {
          user: MAIL_USER,
          pass: MAIL_PASSWORD
        }
      });
    } else {
      // In local dev without live SMTP credentials, use a stub transporter that logs to console
      transporter = {
        sendMail: async (mailOptions) => {
          console.log('\n================== [OUTGOING EMAIL (MOCK/LOCAL)] ==================');
          console.log(`From:    ${mailOptions.from}`);
          console.log(`To:      ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log('--------------------------- Content ---------------------------');
          console.log(mailOptions.text);
          console.log('===================================================================\n');
          return { messageId: 'mock-mail-' + Date.now(), accepted: [mailOptions.to] };
        }
      };
    }
  }
  return transporter;
};

/**
 * Send Faculty Credentials to their personal email address
 */
const sendFacultyCredentialsEmail = async ({
  fullName,
  personalEmail,
  officialEmail,
  temporaryPassword = 'password@123'
}) => {
  try {
    const mailer = getTransporter();

    const subject = 'Campus Synq — Faculty Account Credentials & Portal Access';

    const textContent = `
Campus Synq
Department of Computer Science

Dear ${fullName},

Welcome to Campus Synq.

Your official faculty account has been created by the department administrator.

Official Login Email:
${officialEmail}

Temporary Password:
${temporaryPassword}

Please log in at the portal and update your password immediately upon first access.

Best regards,
Campus Synq Academic Administration
`;

    const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #6d28d9; margin: 0; font-size: 24px; font-weight: 800;">CAMPUS SYNQ</h1>
    <p style="color: #64748b; margin: 4px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Department of Computer Science</p>
  </div>

  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Dear <strong>${fullName}</strong>,</p>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Welcome to Campus Synq. Your official faculty administrative account has been generated.</p>

  <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 18px; margin: 24px 0;">
    <h3 style="color: #5b21b6; margin: 0 0 12px 0; font-size: 15px;">Your Institutional Credentials:</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #475569; width: 140px;"><strong>Official Login Email:</strong></td>
        <td style="padding: 6px 0; color: #6d28d9; font-weight: bold; font-family: monospace;">${officialEmail}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #475569;"><strong>Temporary Password:</strong></td>
        <td style="padding: 6px 0; color: #0f172a; font-weight: bold; font-family: monospace;">${temporaryPassword}</td>
      </tr>
    </table>
  </div>

  <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
    Please log in to the Campus Synq portal using your official institutional email and change your password upon initial sign-in.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
    This email was dispatched automatically by Campus Synq System Administration. Please do not reply directly.
  </p>
</div>
`;

    const info = await mailer.sendMail({
      from: MAIL_FROM,
      to: personalEmail,
      subject,
      text: textContent,
      html: htmlContent
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('[Email Delivery Error]:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendFacultyCredentialsEmail
};
