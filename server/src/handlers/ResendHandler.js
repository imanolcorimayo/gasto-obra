import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import * as Sentry from '@sentry/node';
import logger from '../../lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAIL_DIR = resolve(__dirname, '../../mail');

class ResendHandler {
  constructor(apiKey, { from = 'Gasto Obra <gastoobra@wiseutils.com>' } = {}) {
    this.resend = new Resend(apiKey);
    this.from = from;
    this._cache = {};
  }

  _loadTemplate(name) {
    if (this._cache[name]) return this._cache[name];
    const filePath = resolve(MAIL_DIR, `${name}.html`);
    const content = readFileSync(filePath, 'utf-8');
    this._cache[name] = content;
    return content;
  }

  _buildHtml(template, variables = {}) {
    const header = this._loadTemplate('_header');
    const body = this._loadTemplate(template);
    const footer = this._loadTemplate('_footer');

    let html = header + body + footer;

    for (const [key, value] of Object.entries(variables)) {
      html = html.replaceAll(`{{${key}}}`, value ?? '');
    }

    return html;
  }

  async sendEmail(to, subject, template, variables = {}) {
    try {
      const html = this._buildHtml(template, variables);

      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html
      });

      if (error) {
        logger.error('Resend API error', { to, template, error: error.message });
        Sentry.captureMessage('Resend email failed', { level: 'error', extra: { to, template, error } });
        return { success: false, error: error.message };
      }

      logger.info('Email sent', { to, emailId: data.id, template, subject });
      return { success: true, emailId: data.id };
    } catch (error) {
      logger.error('Error sending email', { to, template, error });
      Sentry.captureException(error);
      return { success: false, error: error.message };
    }
  }
}

export default ResendHandler;
