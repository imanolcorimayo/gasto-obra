import 'dotenv/config';
import { db, admin, COLLECTIONS } from '../config/firebase.js';
import logger from '../../lib/logger.js';

// ============================================
// FAQ Content
// ============================================
const WA_PHONE = process.env.WHATSAPP_NUMBER || '+5493518685397';
const WA_PHONE_CLEAN = WA_PHONE.replace(/\+/g, '');

// Helper to build a WhatsApp deep link
const waLink = (text, label) =>
  `<a href="https://wa.me/${WA_PHONE_CLEAN}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${label}</a>`;

const FAQ_DATA = [
  // --- Topic 1: Conexión WhatsApp ---
  {
    topic: 'whatsapp',
    topicLabel: 'Conexión WhatsApp',
    topicOrder: 1,
    order: 1,
    question: '¿Cómo vinculo mi cuenta de WhatsApp?',
    answer:
      `<p>Desde la web, andá a <strong>Configuración</strong> y copiá el código de vinculación.</p>` +
      `<p>Después, mandá un mensaje a nuestro número de WhatsApp (<strong>${WA_PHONE}</strong>) con el comando <code>VINCULAR</code> seguido de tu código. Por ejemplo:</p>` +
      `<p>${waLink('VINCULAR abc123', 'Enviar "VINCULAR abc123"')}</p>` +
      `<p>Una vez vinculado, todo lo que mandes por WhatsApp se registra automáticamente en tu proyecto activo.</p>`,
  },
  {
    topic: 'whatsapp',
    topicLabel: 'Conexión WhatsApp',
    topicOrder: 1,
    order: 2,
    question: '¿Cómo desvinculo mi cuenta?',
    answer:
      `<p>Mandá el comando <code>DESVINCULAR</code> a nuestro WhatsApp:</p>` +
      `<p>${waLink('DESVINCULAR', 'Enviar "DESVINCULAR"')}</p>` +
      `<p>Tu cuenta queda desvinculada y ya no se registran gastos desde ese número.</p>`,
  },
  {
    topic: 'whatsapp',
    topicLabel: 'Conexión WhatsApp',
    topicOrder: 1,
    order: 3,
    question: '¿Puedo usar la plataforma sin WhatsApp?',
    answer:
      `<p>Sí. Podés cargar gastos, cobros y gastos propios directamente desde la web.</p>` +
      `<p>WhatsApp es opcional y sirve para registrar gastos rápidamente desde la obra mandando un <strong>texto</strong>, <strong>foto</strong>, <strong>audio</strong> o <strong>PDF</strong>.</p>`,
  },

  // --- Topic 2: Tipos de movimientos ---
  {
    topic: 'movimientos',
    topicLabel: 'Tipos de movimientos',
    topicOrder: 2,
    order: 1,
    question: '¿Qué tipos de movimientos existen?',
    answer:
      `<p>Hay tres tipos de movimientos:</p>` +
      `<ul>` +
      `<li><strong>Gasto:</strong> Un costo del proyecto que representa un gasto para el cliente (materiales, herramientas, transporte, mano de obra, comida, etc.). No es un gasto tuyo como proveedor — es algo que el cliente paga como parte de la obra.</li>` +
      `<li><strong>Cobro:</strong> Dinero que recibís del cliente. Se usa para registrar pagos, adelantos o transferencias que el cliente te hace. El cobro se refleja en el balance del proyecto.</li>` +
      `<li><strong>Gasto propio:</strong> Un gasto personal tuyo como proveedor que <strong>no se cobra al cliente</strong>. El cliente no lo ve. Te permite llevar registro de tus gastos no cobrables para entender mejor tu negocio y mantener tu salud financiera.</li>` +
      `</ul>`,
  },
  {
    topic: 'movimientos',
    topicLabel: 'Tipos de movimientos',
    topicOrder: 2,
    order: 2,
    question: '¿Cómo registro la mano de obra que le cobro al cliente?',
    answer:
      `<p>La mano de obra es un <strong>Gasto</strong> con categoría "mano de obra". Representa lo que le cobrás al cliente por tu trabajo — es un costo del proyecto, no un gasto propio.</p>` +
      `<p><strong>Por WhatsApp:</strong> mandá algo como "8000 mano de obra" o "15000 trabajo del día".</p>` +
      `<p><strong>Desde la web:</strong> creá un Gasto y elegí la categoría "Mano de obra".</p>` +
      `<p>No lo confundas con "Gasto propio" — el gasto propio es algo que pagaste vos y que no se cobra al cliente.</p>`,
  },
  {
    topic: 'movimientos',
    topicLabel: 'Tipos de movimientos',
    topicOrder: 2,
    order: 3,
    question: '¿Qué es un "gasto propio" y cómo lo registro?',
    answer:
      `<p>Un gasto propio es un gasto personal del proveedor que no se le cobra al cliente. Solo lo ves vos en tu dashboard. Te sirve para tener visibilidad de cuánto gastás en cada proyecto sin afectar la cuenta del cliente.</p>` +
      `<p><strong>Por WhatsApp:</strong> incluí "gasto propio", "gasto mío" o "puse de mi bolsillo" en el mensaje. Ejemplo: "gasto propio 2000 almuerzo".</p>` +
      `<p><strong>Desde la web:</strong> al crear un movimiento, elegí el tipo "Gasto propio".</p>`,
  },

  // --- Topic 3: Porcentaje de pago, balance y cobros automáticos ---
  {
    topic: 'cobros',
    topicLabel: 'Porcentaje de pago, balance y cobros automáticos',
    topicOrder: 3,
    order: 1,
    question: '¿Qué es el porcentaje de pago en un gasto?',
    answer:
      `<p>Indica qué porcentaje del gasto fue pagado directamente por el cliente al momento de registrarlo.</p>` +
      `<ul>` +
      `<li><strong>0% (por defecto):</strong> El cliente no pagó este gasto directamente. Se descuenta del saldo general del proyecto.</li>` +
      `<li><strong>100%:</strong> El cliente ya pagó este gasto. Se genera automáticamente un Cobro vinculado.</li>` +
      `<li><strong>Entre 1% y 99% (solo desde la web):</strong> Pago parcial. Se genera un cobro por el monto proporcional y podés completar el resto después con "Pago restante".</li>` +
      `</ul>` +
      `<p><strong>Desde WhatsApp</strong> solo se admite 0% o 100% para mantener la simplicidad. Decí "pagado por el cliente" o "ya está pago" para marcar 100%. Los pagos parciales se manejan desde la web.</p>`,
  },
  {
    topic: 'cobros',
    topicLabel: 'Porcentaje de pago, balance y cobros automáticos',
    topicOrder: 3,
    order: 2,
    question: '¿Qué es el balance del proyecto?',
    answer:
      `<p>El balance es la diferencia entre lo que el cliente pagó (cobros) y lo que se gastó en el proyecto (gastos). Refleja cuánto tiene el cliente a favor o cuánto debe.</p>` +
      `<p><strong>Balance positivo:</strong> El cliente tiene saldo a favor. Esto pasa cuando el cliente hace un adelanto o pago grande sin un gasto asociado. Los gastos con 0% se descuentan de este saldo.</p>` +
      `<p><strong>Balance negativo:</strong> El cliente tiene deuda pendiente. Esto pasa cuando se cargan gastos al 0% y el cliente todavía no pagó lo suficiente para cubrirlos.</p>` +
      `<p>Por ejemplo: si el cliente te transfiere $500.000 como adelanto, creás un Cobro por ese monto. Después, cada gasto que cargues con 0% se va descontando de ese saldo. Si el total de gastos supera los cobros, el balance queda negativo y el cliente sabe cuánto debe.</p>`,
  },
  {
    topic: 'cobros',
    topicLabel: 'Porcentaje de pago, balance y cobros automáticos',
    topicOrder: 3,
    order: 3,
    question: '¿Se generan cobros automáticos?',
    answer:
      `<p>Sí. Cuando un gasto tiene porcentaje de pago mayor a 0%, se crea automáticamente un Cobro vinculado por el monto correspondiente.</p>` +
      `<p>Este cobro aparece en la lista de movimientos y se incluye en el balance del proyecto. No es necesario crearlo manualmente.</p>`,
  },
  {
    topic: 'cobros',
    topicLabel: 'Porcentaje de pago, balance y cobros automáticos',
    topicOrder: 3,
    order: 4,
    question: '¿Qué es el porcentaje de gestión?',
    answer:
      `<p>Es un recargo que podés aplicar sobre los gastos para cubrir tu comisión de gestión. Se configura desde <strong>Configuración > General</strong> y se incluye dentro del monto total del gasto.</p>` +
      `<p>Ejemplo: si el gasto base es $10.000 y la gestión es 10%, el monto total será $11.000. El cliente ve el monto total con la indicación "incl. 10% gestión".</p>` +
      `<p>Solo se aplica a gastos del proyecto, no a cobros ni gastos propios.</p>`,
  },

  // --- Topic 4: Compartir proyecto con el cliente ---
  {
    topic: 'compartir',
    topicLabel: 'Compartir proyecto con el cliente',
    topicOrder: 4,
    order: 1,
    question: '¿Cómo le comparto el proyecto a mi cliente?',
    answer:
      `<p>Cada proyecto tiene un <strong>link público</strong> que podés copiar desde la página del proyecto.</p>` +
      `<p>Compartile ese link al cliente por WhatsApp o como prefieras. No necesita cuenta ni contraseña para ver los gastos y el balance.</p>`,
  },
  {
    topic: 'compartir',
    topicLabel: 'Compartir proyecto con el cliente',
    topicOrder: 4,
    order: 2,
    question: '¿Qué puede ver el cliente en el link público?',
    answer:
      `<p>El cliente ve:</p>` +
      `<ul>` +
      `<li>Todos los gastos del proyecto (monto, categoría, estado de pago)</li>` +
      `<li>Todos los cobros registrados</li>` +
      `<li>El balance general (total gastado, total pagado, saldo)</li>` +
      `</ul>` +
      `<p>El cliente <strong>no</strong> ve los gastos propios del proveedor.</p>`,
  },
  {
    topic: 'compartir',
    topicLabel: 'Compartir proyecto con el cliente',
    topicOrder: 4,
    order: 3,
    question: '¿El cliente puede unirse con una cuenta propia?',
    answer:
      `<p>Sí. Desde el link público, el cliente puede hacer clic en "Unirme como cliente" e iniciar sesión con Google.</p>` +
      `<p>Esto le da acceso autenticado al proyecto desde su propia cuenta.</p>`,
  },

  // --- Topic 5: Exportar PDF ---
  {
    topic: 'pdf',
    topicLabel: 'Exportar PDF',
    topicOrder: 5,
    order: 1,
    question: '¿Qué incluye el PDF exportado y para qué puedo usarlo?',
    answer:
      `<p>El PDF genera un <strong>"Documento de Pago"</strong> profesional con toda la información del proyecto. Incluye:</p>` +
      `<ul>` +
      `<li><strong>Encabezado:</strong> datos del proveedor (nombre, teléfono, email) y del cliente</li>` +
      `<li><strong>Proyecto:</strong> nombre, dirección, presupuesto acordado, período</li>` +
      `<li><strong>Gastos agrupados por entrega:</strong> cada gasto con su título, monto, categoría, método de pago y estado (pagado/pendiente). Los gastos sin entrega asignada aparecen aparte</li>` +
      `<li><strong>Cobros:</strong> listado de todos los pagos recibidos del cliente</li>` +
      `<li><strong>Resumen financiero:</strong> total gastado, total cobrado, gestión acumulada y balance</li>` +
      `<li><strong>Número de reporte:</strong> identificador único que se mantiene entre exportaciones</li>` +
      `</ul>` +
      `<p><strong>¿Para qué sirve?</strong> Podés usarlo como comprobante de rendición de gastos para el cliente, como respaldo de lo invertido en la obra, o para presentarlo al momento de solicitar un pago. Es un documento formal que resume todo el estado financiero del proyecto.</p>`,
  },
  {
    topic: 'pdf',
    topicLabel: 'Exportar PDF',
    topicOrder: 5,
    order: 2,
    question: '¿Cómo exporto el PDF?',
    answer:
      `<p>Desde la página del proyecto, hacé clic en <strong>"Exportar PDF"</strong>. Se genera y descarga automáticamente.</p>` +
      `<p>El número de reporte se asigna la primera vez que exportás y se mantiene para futuras exportaciones del mismo proyecto.</p>`,
  },

  // --- Topic 6: Entregas ---
  {
    topic: 'entregas',
    topicLabel: 'Entregas',
    topicOrder: 6,
    order: 1,
    question: '¿Qué son las entregas?',
    answer:
      `<p>Las entregas son <strong>etapas de trabajo</strong> dentro de un proyecto. Sirven para organizar los gastos en grupos lógicos (por ejemplo, "1° Entrega - Demolición", "2° Entrega - Albañilería").</p>` +
      `<p>Se numeran automáticamente y se usan para agrupar gastos en el PDF exportado, lo que facilita la rendición por etapa.</p>`,
  },
  {
    topic: 'entregas',
    topicLabel: 'Entregas',
    topicOrder: 6,
    order: 2,
    question: '¿Cómo creo una entrega y asigno gastos?',
    answer:
      `<p>Desde la página del proyecto:</p>` +
      `<ul>` +
      `<li>Creá una entrega con fecha y descripción opcional.</li>` +
      `<li>Usá el botón de asignar gastos para seleccionar qué gastos pertenecen a esa entrega.</li>` +
      `</ul>` +
      `<p>Los gastos sin entrega asignada aparecen como "Sin entrega" en el PDF.</p>`,
  },
];

// ============================================
// Main
// ============================================
async function seedFaq() {
  logger.info('Starting FAQ seed');

  const faqRef = db.collection('faq');

  // Delete all existing FAQ docs
  const existing = await faqRef.get();
  if (!existing.empty) {
    const deleteBatch = db.batch();
    existing.docs.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    logger.info(`Deleted ${existing.size} existing FAQ docs`);
  }

  // Create new FAQ docs
  const createBatch = db.batch();
  for (const entry of FAQ_DATA) {
    const docRef = faqRef.doc();
    createBatch.set(docRef, {
      ...entry,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await createBatch.commit();

  logger.info(`Created ${FAQ_DATA.length} FAQ docs`);
}

seedFaq()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Fatal error seeding FAQ', { error });
    process.exit(1);
  });
