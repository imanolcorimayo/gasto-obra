/**
 * PDF Payment Report Generator (Documento de Pago)
 *
 * Pure function module — no Firebase/store dependencies.
 * Designed for client-side use, portable to server-side later.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Expense, Delivery, ExpenseCategory } from '~/interfaces';
import { getCategoryLabel, getPaymentMethodLabel, getManagementFeeAmount } from '~/utils';

// ============================================
// Types
// ============================================

export interface ReportProviderInfo {
  name: string;
  email: string;
  phone: string | null;
}

export interface ReportProjectInfo {
  name: string;
  clientName: string;
  address: string;
  description: string;
  reportNumber: string;
  startDate: Date | null;
  estimatedEndDate: Date | null;
  budget: number | null;
}

export interface ReportData {
  provider: ReportProviderInfo;
  project: ReportProjectInfo;
  expenses: Expense[];
  deliveries: Delivery[];
  categories: ExpenseCategory[];
}

// ============================================
// Colors (warm, light-mode palette for print)
// ============================================

const COLORS = {
  primary: [233, 154, 53] as [number, number, number],     // #E99A35 amber
  text: [42, 37, 32] as [number, number, number],           // #2A2520
  textSecondary: [94, 89, 79] as [number, number, number],  // #5E594F
  textMuted: [138, 133, 121] as [number, number, number],   // #8A8579
  border: [217, 211, 199] as [number, number, number],      // #D9D3C7
  surface: [253, 251, 246] as [number, number, number],     // #FDFBF6
  success: [92, 184, 112] as [number, number, number],      // #5CB870
  danger: [212, 84, 74] as [number, number, number],        // #D4544A
};

const PAGE_MARGIN = 25;
const HEADER_BOTTOM = 28; // y position where header ends (content starts below)
const CONTENT_WIDTH = 160; // A4 width (210) - 2 * margin
const CONTENT_START = 35; // y where content starts after header on continuation pages
const NA = 'No especificado';

// ============================================
// Helpers
// ============================================

function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(timestamp: any): string {
  const d = toDate(timestamp);
  if (!d) return '-';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function fmtDateFull(timestamp: any): string {
  const d = toDate(timestamp);
  if (!d) return '-';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtAmount(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function getPaymentStatus(expense: Expense): string {
  if (expense.type === 'payment') return '';
  if (expense.installmentPercent == null) return '';
  if (expense.installmentPercent >= 100) return 'PAGO CANCELADO';
  if (expense.installmentPercent === 0) return 'DESCONTADO DE BALANCE';
  return `${expense.installmentPercent}% PAGADO`;
}

function getItemLabel(expense: Expense): string {
  if (expense.scopeType === 'addition') return 'AGREGADOS';
  return 'ENTREGA';
}

export function generateReportNumber(): string {
  const hex = () => Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return `${hex()}-${hex()}`;
}

// ============================================
// PDF Generation
// ============================================

export function generatePaymentReport(data: ReportData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Sort expenses by date
  const clientExpenses = data.expenses
    .filter(e => e.type === 'expense')
    .sort((a, b) => (toDate(a.date)?.getTime() || 0) - (toDate(b.date)?.getTime() || 0));

  const payments = data.expenses
    .filter(e => e.type === 'payment')
    .sort((a, b) => (toDate(a.date)?.getTime() || 0) - (toDate(b.date)?.getTime() || 0));

  // Sort deliveries by number
  const sortedDeliveries = [...data.deliveries].sort((a, b) => a.number - b.number);

  // Group expenses by delivery
  const deliveryExpenses = new Map<string, Expense[]>();
  const unassigned: Expense[] = [];

  for (const exp of clientExpenses) {
    if (exp.deliveryId) {
      const list = deliveryExpenses.get(exp.deliveryId) || [];
      list.push(exp);
      deliveryExpenses.set(exp.deliveryId, list);
    } else {
      unassigned.push(exp);
    }
  }

  // Track if header was already drawn on current page (to avoid double-draw)
  let headerDrawnOnPage = 0;

  function drawHeader() {
    const currentPage = doc.getNumberOfPages();
    if (headerDrawnOnPage === currentPage) return;
    headerDrawnOnPage = currentPage;

    const y = 15;

    // Accent bar (left edge)
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, 5, 297, 'F');

    // Provider contact info (top-left)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    let contactY = y;
    if (data.provider.phone) {
      doc.text(data.provider.phone, PAGE_MARGIN, contactY);
      contactY += 3.5;
    }
    doc.text(data.provider.email, PAGE_MARGIN, contactY);

    // Brand name (top-right)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Gasto Obra', 210 - PAGE_MARGIN, y, { align: 'right' });

    // Divider line below header
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, HEADER_BOTTOM, 210 - PAGE_MARGIN, HEADER_BOTTOM);
  }

  function newSection(): number {
    doc.addPage();
    drawHeader();
    return CONTENT_START;
  }

  // ----------------------------------------
  // Page 1: Metadata
  // ----------------------------------------
  drawHeader();

  let y = 40;

  // Document title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('DOCUMENTO DE PAGO', PAGE_MARGIN, y);

  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`${monthNames[now.getMonth()].toUpperCase()} ${now.getFullYear()}`, PAGE_MARGIN, y);

  // Metadata block
  y += 14;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);

  const meta = [
    ['ENCARGADO', data.provider.name || NA, 'COMPROBANTE', data.project.reportNumber],
    ['CLIENTE', data.project.clientName || NA, 'FECHA', fmtDateFull(now)],
    ['UBICACIÓN', data.project.address || NA, 'PROYECTO', data.project.name],
  ];

  for (const [leftLabel, leftVal, rightLabel, rightVal] of meta) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(7);
    doc.text(leftLabel, PAGE_MARGIN, y);
    doc.text(rightLabel, 125, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.text(leftVal.toUpperCase(), PAGE_MARGIN, y + 4.5);
    doc.text(rightVal.toUpperCase(), 125, y + 4.5);

    y += 11;
  }

  if (data.project.budget) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(7);
    doc.text('PRESUPUESTO', PAGE_MARGIN, y);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.text(fmtAmount(data.project.budget), PAGE_MARGIN, y + 4.5);
    y += 11;
  }

  // Divider
  doc.setDrawColor(...COLORS.border);
  doc.line(PAGE_MARGIN, y, 210 - PAGE_MARGIN, y);
  y += 8;

  // ----------------------------------------
  // Cronograma de Pagos - Table
  // ----------------------------------------
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('CRONOGRAMA DE PAGOS', PAGE_MARGIN, y);
  y += 8;

  // Build table rows grouped by delivery, merging installment siblings
  const tableRows: any[][] = [];

  function addExpenseRows(expenses: Expense[], groupLabel: string) {
    if (expenses.length === 0) return;

    // Group by installmentGroupId to merge siblings
    const grouped: Expense[][] = [];
    const seen = new Set<string>();

    for (const exp of expenses) {
      if (exp.installmentGroupId && !seen.has(exp.installmentGroupId)) {
        seen.add(exp.installmentGroupId);
        const siblings = expenses.filter(e => e.installmentGroupId === exp.installmentGroupId);
        grouped.push(siblings);
      } else if (!exp.installmentGroupId) {
        grouped.push([exp]);
      }
    }

    for (const group of grouped) {
      const first = group[0];
      const itemLabel = getItemLabel(first);
      const catLabel = getCategoryLabel(first.category, data.categories);
      const desc = first.description || first.title;

      if (group.length === 1) {
        // Single expense row
        const catWithPercent = first.installmentPercent != null && first.installmentPercent < 100
          ? `${catLabel} (${first.installmentPercent}%)`
          : catLabel;
        const method = first.paymentMethod ? getPaymentMethodLabel(first.paymentMethod) : '-';
        const status = getPaymentStatus(first);
        const methodStatus = status ? `${method}\n${status}` : method;
        const feeNote = first.managementFeePercent
          ? `\n(incl. ${first.managementFeePercent}% gestión)`
          : '';

        tableRows.push([
          `${itemLabel}\n${groupLabel}`,
          catWithPercent,
          desc,
          fmtDate(first.date),
          fmtAmount(first.amount) + feeNote,
          methodStatus
        ]);
      } else {
        // Merged installment group — show as one row with sub-lines
        const totalAmount = group.reduce((s, e) => s + (e.amount || 0), 0);
        const subLines = group.map(e => {
          const pct = e.installmentPercent != null ? `${e.installmentPercent}%` : '';
          const method = e.paymentMethod ? getPaymentMethodLabel(e.paymentMethod) : '';
          const status = getPaymentStatus(e);
          return `${fmtDate(e.date)} — ${fmtAmount(e.amount)} (${pct}) ${method} ${status}`.trim();
        }).join('\n');

        tableRows.push([
          `${itemLabel}\n${groupLabel}`,
          catLabel,
          `${desc}\n\n${subLines}`,
          '-',
          fmtAmount(totalAmount),
          group.every(e => (e.installmentPercent ?? 0) >= 100) ? 'PAGO CANCELADO' : 'PARCIAL'
        ]);
      }
    }
  }

  // Expenses grouped by delivery
  for (const delivery of sortedDeliveries) {
    const exps = deliveryExpenses.get(delivery.id) || [];
    if (exps.length === 0) continue;
    addExpenseRows(exps, `Nº ${delivery.number}`);
  }

  // Unassigned expenses
  if (unassigned.length > 0) {
    addExpenseRows(unassigned, 'Sin entrega');
  }

  // Management fee summary row
  const totalFee = clientExpenses
    .filter(e => e.managementFeePercent)
    .reduce((sum, e) => sum + getManagementFeeAmount(e), 0);

  if (totalFee > 0) {
    tableRows.push([
      'GESTIÓN',
      'Comisión',
      'Gestión de compras (incluido en importes)',
      '-',
      fmtAmount(Math.round(totalFee)),
      '-'
    ]);
  }

  if (tableRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Ítem', 'Categoría', 'Descripción', 'Fecha', 'Importe', 'Medio & Estado']],
      body: tableRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: CONTENT_START },
      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        textColor: COLORS.text,
        lineColor: COLORS.border,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: COLORS.surface,
        textColor: COLORS.text,
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold', fontSize: 7 },
        1: { cellWidth: 24 },
        2: { cellWidth: 40 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 34 },
      },
      alternateRowStyles: {
        fillColor: [250, 248, 243],
      },
      didDrawPage: () => {
        drawHeader();
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ----------------------------------------
  // Totals (right after table)
  // ----------------------------------------
  const totalExpenses = clientExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPayments = payments.reduce((sum, e) => sum + (e.amount || 0), 0);
  const balance = totalPayments - totalExpenses;

  if (y > 255) {
    y = newSection();
  }

  doc.setDrawColor(...COLORS.border);
  doc.line(PAGE_MARGIN, y, 210 - PAGE_MARGIN, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('TOTAL GASTOS:', PAGE_MARGIN, y);
  doc.text(fmtAmount(totalExpenses), 210 - PAGE_MARGIN, y, { align: 'right' });
  y += 6;

  if (totalPayments > 0) {
    doc.setTextColor(...COLORS.success);
    doc.text('TOTAL PAGOS:', PAGE_MARGIN, y);
    doc.text(fmtAmount(totalPayments), 210 - PAGE_MARGIN, y, { align: 'right' });
    y += 6;

    const balanceColor = balance >= 0 ? COLORS.success : COLORS.danger;
    doc.setTextColor(...balanceColor);
    doc.text('SALDO:', PAGE_MARGIN, y);
    doc.text(fmtAmount(balance), 210 - PAGE_MARGIN, y, { align: 'right' });
  }

  // ----------------------------------------
  // Resumen de Entregas (new page)
  // ----------------------------------------
  const deliveriesWithExpenses = sortedDeliveries.filter(d => {
    const exps = deliveryExpenses.get(d.id);
    return exps && exps.length > 0;
  });

  if (deliveriesWithExpenses.length > 0) {
    y = newSection();

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('RESUMEN', PAGE_MARGIN, y);

    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('Entregas', PAGE_MARGIN, y);
    y += 8;

    doc.setFontSize(9);
    for (const delivery of deliveriesWithExpenses) {
      if (y > 270) {
        doc.addPage();
        drawHeader();
        y = CONTENT_START;
      }

      const exps = deliveryExpenses.get(delivery.id) || [];
      const deliveryTotal = exps.reduce((sum, e) => sum + (e.amount || 0), 0);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.text(`${delivery.number}° ENTREGA`, PAGE_MARGIN + 10, y);
      doc.text(fmtDate(delivery.date), 90, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(fmtAmount(deliveryTotal), 210 - PAGE_MARGIN, y, { align: 'right' });

      y += 5.5;
    }

    // Unassigned total
    if (unassigned.length > 0) {
      const unassignedTotal = unassigned.reduce((sum, e) => sum + (e.amount || 0), 0);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textMuted);
      doc.text('SIN ENTREGA', PAGE_MARGIN + 10, y);
      doc.text('-', 90, y);
      doc.setFont('helvetica', 'bold');
      doc.text(fmtAmount(unassignedTotal), 210 - PAGE_MARGIN, y, { align: 'right' });
      y += 5.5;
    }

    // Grand total
    y += 2;
    doc.setDrawColor(...COLORS.border);
    doc.line(PAGE_MARGIN + 10, y, 210 - PAGE_MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('TOTAL:', PAGE_MARGIN + 10, y);
    doc.text(fmtAmount(totalExpenses), 210 - PAGE_MARGIN, y, { align: 'right' });
  }

  // ----------------------------------------
  // Cronograma de Trabajo (new page)
  // ----------------------------------------
  y = newSection();

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('CRONOGRAMA DE TRABAJO', PAGE_MARGIN, y);
  y += 10;

  doc.setFontSize(9);

  // Start date
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text('Inicio:', PAGE_MARGIN + 10, y);
  doc.setTextColor(...COLORS.text);
  doc.text(data.project.startDate ? fmtDateFull(data.project.startDate) : NA, 60, y);
  y += 6;

  // End date
  doc.setTextColor(...COLORS.textSecondary);
  doc.text('Fin estimado:', PAGE_MARGIN + 10, y);
  doc.setTextColor(...COLORS.text);
  doc.text(data.project.estimatedEndDate ? fmtDateFull(data.project.estimatedEndDate) : NA, 60, y);
  y += 14;

  // ----------------------------------------
  // Aclaraciones (same page if fits, else new)
  // ----------------------------------------
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('ACLARACIONES', PAGE_MARGIN, y);
  y += 8;

  if (data.project.description) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);

    const lines = doc.splitTextToSize(data.project.description, CONTENT_WIDTH);
    doc.text(lines, PAGE_MARGIN, y);
    y += lines.length * 4 + 6;
  } else {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text('Sin aclaraciones.', PAGE_MARGIN, y);
    y += 10;
  }

  // ----------------------------------------
  // Footer on last page
  // ----------------------------------------
  if (y > 265) {
    doc.addPage();
    drawHeader();
    y = CONTENT_START;
  }

  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Gasto Obra', PAGE_MARGIN, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`Generado el ${fmtDateFull(now)}`, 210 - PAGE_MARGIN, y, { align: 'right' });

  // ----------------------------------------
  // Page numbers
  // ----------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`${i} / ${totalPages}`, 105, 290, { align: 'center' });
  }

  // ----------------------------------------
  // Download
  // ----------------------------------------
  const filename = `Documento_Pago_${data.project.name.replace(/\s+/g, '_')}_${data.project.reportNumber}.pdf`;
  doc.save(filename);
}
