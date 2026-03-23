import { admin, db, COLLECTIONS } from '../config/firebase.js';
import { sendWhatsAppMessage, sendWhatsAppButtons } from '../helpers/whatsapp.js';
import * as Sentry from '@sentry/node';
import logger from '../../lib/logger.js';
import { getActiveProjects } from '../helpers/projects.js';
import {
  createAISupportSession, clearAISupportSession,
  resetSessionTimers, checkSupportRateLimit
} from '../helpers/pendingState.js';

const SUPPORT_PHONE = '5493513467739';
const SUPPORT_WA_LINK = `https://wa.me/${SUPPORT_PHONE}`;

function isGeminiError(result) {
  return result && typeof result === 'object' && result.error;
}

export async function handleLinkCommand(phoneNumber, code, contactName) {
  if (!code || code.length > 20 || !/^[A-Z0-9]+$/.test(code)) {
    await sendWhatsAppMessage(phoneNumber, 'Formato incorrecto. Usá: VINCULAR <código>\n\nEjemplo: VINCULAR ABC123');
    return;
  }

  try {
    const codeDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(code).get();

    if (!codeDoc.exists) {
      await sendWhatsAppMessage(phoneNumber, 'Código no encontrado o expirado. Generá un nuevo código desde la app.');
      return;
    }

    const codeData = codeDoc.data();

    if (codeData.status !== 'pending') {
      await sendWhatsAppMessage(phoneNumber, 'Código no válido. Generá un nuevo código desde la app.');
      return;
    }

    const createdAt = codeData.createdAt?.toDate() || new Date(0);
    const now = new Date();
    const diffMinutes = (now - createdAt) / (1000 * 60);

    if (diffMinutes > 10) {
      await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(code).delete();
      await sendWhatsAppMessage(phoneNumber, 'El código ha expirado. Generá un nuevo código desde la app.');
      return;
    }

    await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(code).delete();

    const linkData = {
      status: 'linked',
      userId: codeData.userId,
      phoneNumber: phoneNumber,
      contactName: contactName,
      linkedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const activeProjects = await getActiveProjects(codeData.userId);
    if (activeProjects.length > 0) {
      linkData.activeProjectId = activeProjects[0].id;
    }

    await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).set(linkData);

    let message = 'Cuenta vinculada!\n\n';
    if (activeProjects.length > 0) {
      message += `*${activeProjects[0].name}* está activo y los gastos van a este proyecto.`;
      if (activeProjects.length > 1) {
        message += ' Escribí *PROYECTO* para cambiar.';
      }
      message += '\n\n';
    }
    message += 'Probá ahora — mandá una foto de un ticket o escribí algo como "500 clavos".\n\nEscribí *AYUDA* si necesitás ayuda.';

    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error linking account', { error });
    await sendWhatsAppMessage(phoneNumber, 'Error al vincular la cuenta. Intentá nuevamente.');
  }
}

export async function handleUnlinkCommand(phoneNumber) {
  try {
    const linkDoc = await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).get();

    if (!linkDoc.exists || linkDoc.data()?.status !== 'linked') {
      await sendWhatsAppMessage(phoneNumber, 'Este número no está vinculado a ninguna cuenta.');
      return;
    }

    await db.collection(COLLECTIONS.WHATSAPP_LINKS).doc(phoneNumber).delete();

    await sendWhatsAppMessage(phoneNumber, 'Cuenta desvinculada exitosamente. Ya no se registrarán gastos desde este número.');
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error unlinking account', { error });
    await sendWhatsAppMessage(phoneNumber, 'Error al desvincular la cuenta. Intentá nuevamente.');
  }
}

export async function sendHelpMessage(phoneNumber) {
  const helpText = `*Gasto Obra - Ayuda*

*Registrar gastos:*
Enviá un *texto*, *foto*, *audio* o *PDF* y se registra en tu proyecto activo.

*Ejemplos de texto:*
- "500 clavos"
- "1500 cemento y 800 arena"
- "me pagaron 5000 por transferencia"
- "2000 pintura pagado por el cliente"

Podés incluir método de pago (efectivo, transferencia, tarjeta, mercadopago), destinatario, o mencionar otro proyecto en el mensaje.

*Comandos:*
*PROYECTO* - Seleccionar proyecto activo
*RESUMEN* - Resumen del proyecto activo
*AYUDA* - Ver este mensaje

¿Tenés una duda? Escribí *SOPORTE* para hablar con el asistente AI.`;

  await sendWhatsAppMessage(phoneNumber, helpText);
}

export async function handleAISupport(phoneNumber, question, session, { geminiHandler, getFaqData }) {
  if (!checkSupportRateLimit(phoneNumber)) {
    clearAISupportSession(phoneNumber);
    await sendWhatsAppMessage(
      phoneNumber,
      `Alcanzaste el límite de consultas por hora.\n\nPodés hablar con soporte directamente: ${SUPPORT_WA_LINK}`
    );
    return;
  }

  if (!geminiHandler) {
    await sendWhatsAppMessage(phoneNumber, 'El soporte AI no está disponible en este momento.');
    return;
  }

  const isFirstInteraction = !session?.previousQA?.length;

  const faqData = await getFaqData();
  if (faqData.length === 0) {
    await sendWhatsAppMessage(phoneNumber, 'No pude acceder a la información de soporte. Intentá más tarde.');
    return;
  }

  const conversationHistory = session?.previousQA?.slice(-3) || [];
  const result = await geminiHandler.answerSupportQuestion(question, faqData, conversationHistory);

  let queryDocId = null;
  try {
    const queryDoc = await db.collection(COLLECTIONS.SUPPORT_QUERIES).add({
      phoneNumber,
      question,
      answer: result?.answer || null,
      noAnswer: result?.noAnswer || false,
      error: isGeminiError(result) ? result.error : null,
      parentQueryId: session?.lastQueryId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    queryDocId = queryDoc.id;
  } catch (err) {
    logger.error('Error storing support query', { error: err });
  }

  if (isGeminiError(result)) {
    clearAISupportSession(phoneNumber);
    await sendWhatsAppMessage(
      phoneNumber,
      `El servicio de soporte no está disponible.\n\nPodés hablar con soporte directamente: ${SUPPORT_WA_LINK}`
    );
    return;
  }

  if (!result || result.noAnswer) {
    await sendWhatsAppMessage(
      phoneNumber,
      `${result?.answer || 'No encontré una respuesta para tu consulta.'}\n\nSi necesitás más ayuda, podés hablar con soporte: ${SUPPORT_WA_LINK}`
    );
    if (session) {
      session.previousQA.push({ question, answer: result?.answer || '' });
      session.lastQueryId = queryDocId;
      resetSessionTimers(phoneNumber);
    }
    return;
  }

  await sendWhatsAppMessage(phoneNumber, result.answer);

  if (!session) {
    session = createAISupportSession(phoneNumber);
  }
  session.previousQA.push({ question, answer: result.answer });
  session.lastQueryId = queryDocId;
  resetSessionTimers(phoneNumber);

  if (!isFirstInteraction) {
    await sendWhatsAppButtons(phoneNumber, 'Seguí preguntando o cuando termines 👇', [
      { id: 'support_listo', title: 'Listo, gracias' }
    ]);
  }
}
