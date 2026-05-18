import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { UserOptions } from "jspdf-autotable";

type SummaryRow = [string, string | number];

type PurchasePdfParams = {
	title: string;
	subtitle: string;
	fileName: string;
	summaryRows?: SummaryRow[];
	head: string[];
	body: Array<Array<string | number>>;
};

const sanitizeFileName = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80) || "laporan";

const formatCellText = (value: string | number) => String(value ?? "-");

const getColumnStyles = (head: string[]): UserOptions["columnStyles"] => {
	const styles: NonNullable<UserOptions["columnStyles"]> = {};

	head.forEach((label, index) => {
		const normalized = label.toLowerCase();
		if (normalized === "no") styles[index] = { cellWidth: 8, halign: "center" };
		else if (normalized.includes("kode")) styles[index] = { cellWidth: 24 };
		else if (normalized.includes("pembeli")) styles[index] = { cellWidth: 28 };
		else if (normalized.includes("email")) styles[index] = { cellWidth: 36 };
		else if (normalized.includes("hp")) styles[index] = { cellWidth: 20 };
		else if (normalized.includes("pasukan")) styles[index] = { cellWidth: 32 };
		else if (["qty", "vote", "masuk", "sisa"].includes(normalized)) styles[index] = { cellWidth: 10, halign: "center" };
		else if (normalized.includes("total")) styles[index] = { cellWidth: 22, halign: "right" };
		else if (normalized.includes("status")) styles[index] = { cellWidth: 18, halign: "center" };
		else if (normalized.includes("dibuat") || normalized.includes("dibayar") || normalized.includes("dipakai")) styles[index] = { cellWidth: 24 };
	});

	return styles;
};

const getStatusColor = (status: string): [number, number, number] | null => {
	switch (status.toUpperCase()) {
		case "PAID":
			return [22, 163, 74];
		case "USED":
			return [37, 99, 235];
		case "PENDING":
			return [217, 119, 6];
		case "CANCELLED":
			return [220, 38, 38];
		case "EXPIRED":
			return [107, 114, 128];
		default:
			return null;
	}
};

export function exportPurchaseReportToPdf({
	title,
	subtitle,
	fileName,
	summaryRows = [],
	head,
	body,
}: PurchasePdfParams) {
	const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const primaryRed: [number, number, number] = [220, 38, 38];
	const darkText: [number, number, number] = [31, 41, 55];
	const generatedAt = new Date().toLocaleString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	doc.setFillColor(254, 242, 242);
	doc.rect(0, 0, pageWidth, 32, "F");
	doc.setFillColor(...primaryRed);
	doc.roundedRect(14, 9, 12, 12, 3, 3, "F");
	doc.setFont("helvetica", "bold");
	doc.setFontSize(8);
	doc.setTextColor(255, 255, 255);
	doc.text("SP", 20, 16.5, { align: "center" });

	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.setTextColor(...darkText);
	doc.text(title, 31, 14);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.setTextColor(80, 80, 80);
	doc.text(subtitle, 31, 21, { maxWidth: pageWidth - 76 });
	doc.setTextColor(120, 120, 120);
	doc.text(`Dicetak: ${generatedAt}`, pageWidth - 14, 14, { align: "right" });

	doc.setDrawColor(...primaryRed);
	doc.setLineWidth(0.6);
	doc.line(14, 32, pageWidth - 14, 32);

	let startY = 38;
	if (summaryRows.length > 0) {
		const cardGap = 4;
		const cardCount = Math.min(summaryRows.length, 4);
		const cardWidth = (pageWidth - 28 - cardGap * (cardCount - 1)) / cardCount;

		summaryRows.slice(0, 4).forEach(([label, value], index) => {
			const x = 14 + index * (cardWidth + cardGap);
			doc.setFillColor(255, 255, 255);
			doc.setDrawColor(229, 231, 235);
			doc.roundedRect(x, startY, cardWidth, 18, 2.5, 2.5, "FD");
			doc.setFont("helvetica", "normal");
			doc.setFontSize(7.5);
			doc.setTextColor(107, 114, 128);
			doc.text(String(label).toUpperCase(), x + 4, startY + 6);
			doc.setFont("helvetica", "bold");
			doc.setFontSize(11);
			doc.setTextColor(...darkText);
			doc.text(formatCellText(value), x + 4, startY + 13, { maxWidth: cardWidth - 8 });
		});
		startY += 24;
	}

	autoTable(doc, {
		head: [head],
		body,
		startY,
		margin: { left: 14, right: 14 },
		styles: {
			fontSize: 7,
			cellPadding: 2,
			lineColor: [220, 220, 220],
			lineWidth: 0.1,
			overflow: "linebreak",
			valign: "middle",
		},
		headStyles: {
			fillColor: primaryRed,
			textColor: 255,
			fontStyle: "bold",
			halign: "center",
		},
		alternateRowStyles: { fillColor: [254, 242, 242] },
		bodyStyles: { textColor: [40, 40, 40] },
		columnStyles: getColumnStyles(head),
		didParseCell: (data) => {
			if (data.section !== "body") return;
			const headerLabel = head[data.column.index]?.toLowerCase() || "";
			if (headerLabel.includes("status")) {
				const color = getStatusColor(String(data.cell.raw || ""));
				if (color) {
					data.cell.styles.textColor = color;
					data.cell.styles.fontStyle = "bold";
				}
			}
		},
		didDrawPage: (data) => {
			const pageNumber = doc.getNumberOfPages();
			if (pageNumber > 1) {
				doc.setFont("helvetica", "bold");
				doc.setFontSize(9);
				doc.setTextColor(...primaryRed);
				doc.text(title, 14, 10);
				doc.setDrawColor(229, 231, 235);
				doc.line(14, 14, pageWidth - 14, 14);
			}

			doc.setFontSize(8);
			doc.setTextColor(130, 130, 130);
			doc.text(`Total baris: ${body.length}`, data.settings.margin.left, pageHeight - 8);
			doc.text(`Halaman ${pageNumber}`, pageWidth - 14, pageHeight - 8, { align: "right" });
		},
	});

	doc.save(`${sanitizeFileName(fileName)}.pdf`);
}
