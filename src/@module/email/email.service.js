const { Resend } = require('resend');
const emailConfig = require('./email.config');

let resendClient = null;

const getClient = () => {
  if (!emailConfig.isConfigured()) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(emailConfig.apiKey);
  }

  return resendClient;
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const layout = ({ title, bodyHtml }) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#0056d2;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">Acadify</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">${escapeHtml(title)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px;font-size:12px;line-height:1.5;color:#6b7280;background:#fafafa;">
                This is an automated message from Acadify. Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const sendEmail = async ({ to, subject, html, text }) => {
  const client = getClient();

  if (!client) {
    const error = new Error(
      'Email service is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in .env'
    );
    error.status = 503;
    throw error;
  }

  const result = await client.emails.send({
    from: emailConfig.fromEmail,
    to,
    subject,
    html,
    text
  });

  if (result.error) {
    const error = new Error(result.error.message || 'Failed to send email');
    error.status = 502;
    throw error;
  }

  return result.data;
};

const statusCopy = {
  active: {
    subject: 'Your Acadify academy registration has been approved',
    heading: 'Registration approved',
    message:
      'Your academy registration has been approved. You can now access your Acadify academy dashboard and start creating courses and classes.'
  },
  rejected: {
    subject: 'Update on your Acadify academy registration',
    heading: 'Registration not approved',
    message:
      'Thank you for your interest in Acadify. After reviewing your registration, we are unable to approve your academy application at this time.'
  },
  pending: {
    subject: 'Your Acadify academy registration status has been updated',
    heading: 'Registration under review',
    message:
      'Your academy registration is now marked as pending review. Our team will review your application and notify you once a decision is made.'
  }
};

const sendAcademyRegistrationPendingEmail = async (academy) => {
  const bodyHtml = `
    <p>Hello ${escapeHtml(academy.name)},</p>
    <p>Thank you for registering your academy on Acadify.</p>
    <p>We have received your application and it is now <strong>pending admin approval</strong>. Our team will review your registration details and email you once a decision has been made.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.8;">
          <strong>Academy:</strong> ${escapeHtml(academy.name)}<br />
          <strong>Email:</strong> ${escapeHtml(academy.email)}<br />
          <strong>Phone:</strong> ${escapeHtml(academy.phone || '—')}<br />
          <strong>Status:</strong> Pending approval
        </td>
      </tr>
    </table>
    <p>No action is required from you right now. Once approved, you will receive another email with next steps and login credentials.</p>
  `;

  return sendEmail({
    to: academy.email,
    subject: 'Acadify academy registration received — pending approval',
    html: layout({ title: 'Registration received', bodyHtml }),
    text: `Hello ${academy.name},\n\nThank you for registering your academy on Acadify.\n\nYour application is pending admin approval. Our team will review your registration and email you once a decision has been made.\n\nAcademy: ${academy.name}\nEmail: ${academy.email}\nPhone: ${academy.phone || '—'}\nStatus: Pending approval\n\nNo action is required from you right now.`
  });
};

const sendAdminNewAcademyRegistrationEmail = async (academy) => {
  if (!emailConfig.adminEmail) {
    return null;
  }

  const adminUrl = `${emailConfig.appUrl}/admin/dashboard`;
  const location = [academy.city, academy.state, academy.country]
    .filter(Boolean)
    .join(', ');

  const bodyHtml = `
    <p>Hello Admin,</p>
    <p>A new academy has registered on Acadify and is waiting for your approval.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.8;">
          <strong>Academy:</strong> ${escapeHtml(academy.name)}<br />
          <strong>Email:</strong> ${escapeHtml(academy.email)}<br />
          <strong>Phone:</strong> ${escapeHtml(academy.phone || '—')}<br />
          <strong>Location:</strong> ${escapeHtml(location || '—')}<br />
          <strong>Website:</strong> ${escapeHtml(academy.website || '—')}<br />
          <strong>Status:</strong> Pending approval<br />
          <strong>Registered:</strong> ${escapeHtml(
            academy.createdAt
              ? new Date(academy.createdAt).toLocaleString()
              : new Date().toLocaleString()
          )}
        </td>
      </tr>
    </table>
    <p>Please review this registration and approve or reject it from the admin dashboard.</p>
    <p style="margin-top:24px;">
      <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#0056d2;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
        Review in admin dashboard
      </a>
    </p>
  `;

  return sendEmail({
    to: emailConfig.adminEmail,
    subject: `New academy registration: ${academy.name}`,
    html: layout({ title: 'New academy pending approval', bodyHtml }),
    text: `A new academy has registered on Acadify and is waiting for approval.\n\nAcademy: ${academy.name}\nEmail: ${academy.email}\nPhone: ${academy.phone || '—'}\nLocation: ${location || '—'}\nWebsite: ${academy.website || '—'}\nStatus: Pending approval\n\nReview: ${adminUrl}`
  });
};

const sendAcademyStatusEmail = async (academy, previousStatus, newStatus) => {
  const copy = statusCopy[newStatus] || statusCopy.pending;
  const loginUrl = `${emailConfig.appUrl}/login`;

  const bodyHtml = `
    <p>Hello ${escapeHtml(academy.name)},</p>
    <p>${escapeHtml(copy.message)}</p>
    <p><strong>Academy:</strong> ${escapeHtml(academy.name)}</p>
    <p><strong>Previous status:</strong> ${escapeHtml(previousStatus)}</p>
    <p><strong>Current status:</strong> ${escapeHtml(newStatus)}</p>
    ${
      newStatus === 'active'
        ? `<p style="margin-top:24px;">
            <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#0056d2;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
              Go to Acadify login
            </a>
          </p>
          <p style="margin-top:16px;font-size:14px;color:#6b7280;">
            Your login credentials will be sent separately by our admin team.
          </p>`
        : ''
    }
  `;

  return sendEmail({
    to: academy.email,
    subject: copy.subject,
    html: layout({ title: copy.heading, bodyHtml }),
    text: `${copy.message}\n\nAcademy: ${academy.name}\nPrevious status: ${previousStatus}\nCurrent status: ${newStatus}${
      newStatus === 'active' ? `\nLogin: ${loginUrl}` : ''
    }`
  });
};

const sendAcademyCredentialsEmail = async (academy, credentials) => {
  const loginUrl = `${emailConfig.appUrl}/login`;

  const bodyHtml = `
    <p>Hello ${escapeHtml(academy.name)},</p>
    <p>Your Acadify academy account is ready. Use the credentials below to sign in:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.8;">
          <strong>Login URL:</strong> <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a><br />
          <strong>Email:</strong> ${escapeHtml(credentials.email)}<br />
          <strong>Password:</strong> ${escapeHtml(credentials.password)}<br />
          <strong>Contact name:</strong> ${escapeHtml(credentials.name)}<br />
          <strong>Phone:</strong> ${escapeHtml(credentials.phone || '—')}
        </td>
      </tr>
    </table>
    <p>For security, please change your password after your first login from your profile page.</p>
    <p style="margin-top:24px;">
      <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#0056d2;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
        Sign in to Acadify
      </a>
    </p>
  `;

  return sendEmail({
    to: academy.email,
    subject: 'Your Acadify academy login credentials',
    html: layout({ title: 'Academy login credentials', bodyHtml }),
    text: `Your Acadify academy account is ready.\n\nLogin URL: ${loginUrl}\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nName: ${credentials.name}\nPhone: ${credentials.phone || '—'}\n\nPlease change your password after your first login.`
  });
};

const sendLiveClassStartedEmail = async (student, classroom) => {
  const liveUrl = `${emailConfig.appUrl}/student/classes/${classroom.id}/live`;
  const loginUrl = `${emailConfig.appUrl}/login`;
  const courseTitle = classroom.course?.title;

  const bodyHtml = `
    <p>Hello ${escapeHtml(student.name)},</p>
    <p>Your class <strong>${escapeHtml(classroom.name)}</strong> is now live on Acadify.</p>
    <p>Please log in and join the session as soon as you can.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.8;">
          <strong>Class:</strong> ${escapeHtml(classroom.name)}<br />
          ${courseTitle ? `<strong>Course:</strong> ${escapeHtml(courseTitle)}<br />` : ''}
          ${classroom.classCode ? `<strong>Join code:</strong> ${escapeHtml(classroom.classCode)}<br />` : ''}
          <strong>Status:</strong> Live now
        </td>
      </tr>
    </table>
    <p style="margin-top:24px;">
      <a href="${escapeHtml(liveUrl)}" style="display:inline-block;background:#0056d2;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
        Join live class
      </a>
    </p>
    <p style="margin-top:16px;font-size:14px;color:#6b7280;">
      If you are not signed in yet, <a href="${escapeHtml(loginUrl)}">log in here</a> first, then open the live class link.
    </p>
  `;

  return sendEmail({
    to: student.email,
    subject: `Live now: ${classroom.name}`,
    html: layout({ title: 'Your class is live', bodyHtml }),
    text: `Hello ${student.name},\n\nYour class "${classroom.name}" is now live on Acadify.\n\nPlease log in and join the session:\n${liveUrl}\n\nLogin: ${loginUrl}`
  });
};

const sendPasswordResetOtpEmail = async (user, otp, expiresInMinutes = 10) => {
  const bodyHtml = `
    <p>Hello ${escapeHtml(user.name)},</p>
    <p>We received a request to reset your Acadify password.</p>
    <p>Use the verification code below to set a new password. This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p style="margin:24px 0;text-align:center;">
      <span style="display:inline-block;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px 28px;font-size:28px;font-weight:700;letter-spacing:0.35em;color:#0056d2;">
        ${escapeHtml(otp)}
      </span>
    </p>
    <p>If you did not request a password reset, you can safely ignore this email. Your password will stay the same.</p>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Your Acadify password reset code',
    html: layout({ title: 'Password reset verification', bodyHtml }),
    text: `Hello ${user.name},\n\nYour Acadify password reset code is: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you did not request this, ignore this email.`
  });
};

const sendLiveClassStartedEmailsToStudents = async (classroom, students) => {
  if (!students?.length) {
    return { sent: 0, failed: 0, errors: [] };
  }

  if (!emailConfig.isConfigured()) {
    return {
      sent: 0,
      failed: students.length,
      errors: ['Email service is not configured']
    };
  }

  const results = await Promise.allSettled(
    students.map((student) => sendLiveClassStartedEmail(student, classroom))
  );

  const errors = [];
  let sent = 0;
  let failed = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sent += 1;
      return;
    }

    failed += 1;
    errors.push(
      `${students[index].email}: ${result.reason?.message || 'Failed to send email'}`
    );
  });

  return { sent, failed, errors };
};

const listHtml = (items) => {
  if (!items?.length) {
    return '<p style="margin:0;color:#6b7280;">—</p>';
  }

  return `<ul style="margin:0;padding-left:20px;line-height:1.8;">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`;
};

const sendInterviewFeedbackEmail = async (
  user,
  { role, difficulty, experienceLevel, feedback }
) => {
  const practiceUrl = `${emailConfig.appUrl}/interview`;
  const score = feedback?.score ?? '—';

  const bodyHtml = `
    <p>Hello ${escapeHtml(user.name)},</p>
    <p>Thank you for completing your AI mock interview on Acadify. Below is your personalized feedback report.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.8;">
          <strong>Role:</strong> ${escapeHtml(role)}<br />
          <strong>Difficulty:</strong> ${escapeHtml(difficulty)}<br />
          <strong>Experience:</strong> ${escapeHtml(experienceLevel || 'Fresher')}<br />
          <strong>Score:</strong> ${escapeHtml(String(score))}/10<br />
          <strong>Completed:</strong> ${escapeHtml(new Date().toLocaleString())}
        </td>
      </tr>
    </table>
    <h3 style="margin:24px 0 8px;font-size:16px;color:#1f2937;">Overall assessment</h3>
    <p style="margin:0;">${escapeHtml(feedback?.summary || '')}</p>
    <h3 style="margin:24px 0 8px;font-size:16px;color:#1f8354;">Strengths</h3>
    ${listHtml(feedback?.strengths)}
    <h3 style="margin:24px 0 8px;font-size:16px;color:#0056d2;">Areas to improve</h3>
    ${listHtml(feedback?.improvements)}
    <h3 style="margin:24px 0 8px;font-size:16px;color:#1f2937;">Tips for next time</h3>
    ${listHtml(feedback?.tips)}
    <p style="margin-top:28px;">Keep practicing to build confidence before your real interview.</p>
    <p style="margin-top:24px;">
      <a href="${escapeHtml(practiceUrl)}" style="display:inline-block;background:#0056d2;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
        Practice again
      </a>
    </p>
  `;

  const textLists = (label, items) =>
    items?.length ? `\n${label}:\n${items.map((item) => `- ${item}`).join('\n')}` : '';

  return sendEmail({
    to: user.email,
    subject: `Your Acadify interview feedback — ${role}`,
    html: layout({ title: 'Interview feedback report', bodyHtml }),
    text: `Hello ${user.name},\n\nThank you for completing your AI mock interview on Acadify.\n\nRole: ${role}\nDifficulty: ${difficulty}\nExperience: ${experienceLevel || 'Fresher'}\nScore: ${score}/10\n\nOverall assessment:\n${feedback?.summary || ''}${textLists('Strengths', feedback?.strengths)}${textLists('Areas to improve', feedback?.improvements)}${textLists('Tips for next time', feedback?.tips)}\n\nPractice again: ${practiceUrl}`
  });
};

module.exports = {
  sendEmail,
  sendAcademyRegistrationPendingEmail,
  sendAdminNewAcademyRegistrationEmail,
  sendAcademyStatusEmail,
  sendAcademyCredentialsEmail,
  sendPasswordResetOtpEmail,
  sendLiveClassStartedEmailsToStudents,
  sendInterviewFeedbackEmail,
  isEmailConfigured: emailConfig.isConfigured
};
