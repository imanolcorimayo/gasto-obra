import ResendHandler from '../../handlers/ResendHandler.js';
import logger from '../../../lib/logger.js';

const resendHandler = process.env.RESEND_API_KEY
  ? new ResendHandler(process.env.RESEND_API_KEY)
  : null;

export async function SendContactEmail(req, res) {
  const { name, email, message } = req.body || {};

  // Validate required fields
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'El mensaje es obligatorio' });
  }

  const trimmedName = name.trim().slice(0, 100);
  const trimmedEmail = email.trim().toLowerCase().slice(0, 254);
  const trimmedMessage = message.trim().slice(0, 2000);

  if (trimmedMessage.length < 10) {
    return res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres' });
  }

  const contactEmail = process.env.CONTACT_EMAIL;
  if (!resendHandler || !contactEmail) {
    logger.error('Contact email not configured', { hasResend: !!resendHandler, hasContactEmail: !!contactEmail });
    return res.status(500).json({ error: 'Servicio de email no configurado' });
  }

  try {
    const result = await resendHandler.sendEmail(
      contactEmail,
      `Contacto web — ${trimmedName}`,
      'contact',
      {
        Name: trimmedName,
        Email: trimmedEmail,
        Message: trimmedMessage.replace(/\n/g, '<br>'),
      }
    );

    if (!result.success) {
      logger.error('Failed to send contact email', { error: result.error });
      return res.status(500).json({ error: 'No se pudo enviar el mensaje. Intentá de nuevo más tarde.' });
    }

    logger.info('Contact email sent', { from: trimmedEmail, emailId: result.emailId });
    return res.json({ success: true });
  } catch (error) {
    logger.error('Error in SendContactEmail', { error: error.message });
    return res.status(500).json({ error: 'Error interno' });
  }
}
