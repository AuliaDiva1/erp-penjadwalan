"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8100/api";
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("TOKEN") : "");

const paperSizes = [
  { name: "A4", value: "A4" },
  { name: "F4", value: [215, 330] },
  { name: "Letter", value: "Letter" },
];

const orientationOptions = [
  { label: "Portrait", value: "portrait" },
  { label: "Landscape", value: "landscape" },
];

export default function PrintLaporanStokKritisGudang({
  visible,
  onHide,
  setPdfUrl,
  setFileName,
  setJsPdfPreviewOpen,
}) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    paperSize: "A4",
    orientation: "portrait",
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 15,
    marginRight: 15,
  });

  const onChangeNumber = (e, name) =>
    setConfig((prev) => ({ ...prev, [name]: e.value ?? 0 }));
  const onChangeSelect = (e, name) =>
    setConfig((prev) => ({ ...prev, [name]: e.value }));

  /* ── fetch ── */
  const fetchLowStock = async () => {
    const res = await fetch(`${BASE_URL}/materials/low-stock`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal memuat data stok kritis");
    return json.data; // sudah difilter current_stock <= min_stock_level dari backend
  };

  const getStatusLabel = (row) => {
    if (row.current_stock === 0) return "Habis";
    return "Kritis";
  };

  /* ── generate PDF ── */
  const generatePDF = (materials) => {
    const doc = new jsPDF({
      orientation: config.orientation,
      unit: "mm",
      format: config.paperSize,
    });

    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const mL = config.marginLeft;
    const mT = config.marginTop;
    const mR = config.marginRight;
    const mB = config.marginBottom;

    const today = new Date();
    const todayStr = today.toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const generatedAt = today.toLocaleString("id-ID");

    let y = mT;

    /* -- kop -- */
    doc.setFillColor(239, 68, 68); // merah, khas urgensi
    doc.roundedRect(mL, y, 14, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("!", mL + 7, y + 10, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("JADWALIN — Sistem Penjadwalan Produksi", pw / 2, y + 5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Laporan Stok Kritis & Habis — Eskalasi Cepat", pw / 2, y + 10, { align: "center" });

    y += 18;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pw - mR, y);
    y += 5;

    /* -- judul & tanggal -- */
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN STOK KRITIS & HABIS", pw / 2, y + 5, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Tanggal: ${todayStr}`, pw / 2, y + 11, { align: "center" });
    doc.text(`Dicetak pada: ${generatedAt}`, pw / 2, y + 16, { align: "center" });
    y += 22;

    /* -- ringkasan -- */
    const total  = materials.length;
    const kritis = materials.filter((m) => m.current_stock > 0).length;
    const habis  = materials.filter((m) => m.current_stock === 0).length;
    const kekuranganTotal = materials.reduce(
      (sum, m) => sum + Math.max(0, m.min_stock_level - m.current_stock),
      0
    );

    const summaryItems = [
      { label: "Total Item Bermasalah", value: total,  color: [127, 29, 29]  },
      { label: "Stok Kritis",           value: kritis, color: [245, 158, 11] },
      { label: "Stok Habis",            value: habis,  color: [239, 68, 68]  },
      { label: "Total Kekurangan",      value: kekuranganTotal, color: [220, 38, 38] },
    ];

    const boxW = (pw - mL - mR - 9) / 4;
    summaryItems.forEach((item, i) => {
      const bx = mL + i * (boxW + 3);
      doc.setFillColor(...item.color);
      doc.roundedRect(bx, y, boxW, 14, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(String(item.value), bx + boxW / 2, y + 7, { align: "center" });
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, bx + boxW / 2, y + 12, { align: "center" });
    });

    y += 20;

    if (total === 0) {
      doc.setFontSize(10);
      doc.setTextColor(34, 197, 94);
      doc.setFont("helvetica", "bold");
      doc.text("Tidak ada bahan baku berstatus Kritis atau Habis saat ini.", mL, y + 5);
      return doc;
    }

    /* -- tabel -- diurutkan: Habis dulu, baru Kritis, lalu kekurangan terbesar -- */
    const sorted = [...materials].sort((a, b) => {
      if (a.current_stock === 0 && b.current_stock !== 0) return -1;
      if (a.current_stock !== 0 && b.current_stock === 0) return 1;
      const kekuranganA = a.min_stock_level - a.current_stock;
      const kekuranganB = b.min_stock_level - b.current_stock;
      return kekuranganB - kekuranganA;
    });

    const rows = sorted.map((m, idx) => {
      const status = getStatusLabel(m);
      const kekurangan = Math.max(0, m.min_stock_level - m.current_stock);
      return [
        idx + 1,
        m.kode_bahan_baku,
        m.material_name,
        `${m.kode_satuan}`,
        m.current_stock,
        m.min_stock_level,
        kekurangan,
        status,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["No", "Kode", "Nama Bahan Baku", "Sat", "Stok", "Min", "Kekurangan", "Status"]],
      body: rows,
      margin: { left: mL, right: mR, bottom: mB + 8 },
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center" },
        1: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 10, halign: "center" },
        4: { cellWidth: 14, halign: "center" },
        5: { cellWidth: 14, halign: "center" },
        6: { cellWidth: 22, halign: "center" },
        7: { cellWidth: 18, halign: "center" },
      },
      bodyStyles: { textColor: [30, 30, 30] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 7) {
          const val = data.cell.raw;
          if (val === "Habis")  data.cell.styles.textColor = [239, 68, 68];
          if (val === "Kritis") data.cell.styles.textColor = [245, 158, 11];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 0) {
          // baris paling atas (Habis) dikasih background tipis merah
          const row = sorted[data.row.index];
          if (row?.current_stock === 0) {
            data.cell.styles.fillColor = [254, 242, 242];
          }
        }
      },
      didDrawPage({ pageNumber }) {
        const count = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Halaman ${pageNumber} dari ${count}  |  Jadwalin ERP — Gudang`,
          pw - mR,
          ph - 6,
          { align: "right" }
        );
      },
    });

    /* -- catatan eskalasi -- */
    let noteY = doc.lastAutoTable.finalY + 8;
    if (noteY > ph - mB - 35) { doc.addPage(); noteY = mT + 5; }

    doc.setFontSize(8.5);
    doc.setTextColor(120, 30, 30);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Catatan: Daftar ini perlu segera ditindaklanjuti ke bagian pembelian/pengadaan untuk menghindari hambatan produksi.",
      mL, noteY
    );

    /* -- tanda tangan -- */
    let ttdY = noteY + 14;
    if (ttdY > ph - mB - 35) { doc.addPage(); ttdY = mT + 5; }

    const ttdX = pw - mR - 55;
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.text(`Madiun, ${todayStr}`, ttdX, ttdY);
    doc.text("Mengetahui,", ttdX, ttdY + 5);
    doc.text("Kepala Gudang,", ttdX, ttdY + 10);
    ttdY += 28;
    doc.setFont("helvetica", "bold");
    doc.text("( __________________ )", ttdX, ttdY);

    return doc;
  };

  /* ── handler ── */
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const materials = await fetchLowStock();
      const doc = generatePDF(materials);
      const dateTag = new Date().toISOString().split("T")[0];
      const name = `Laporan_Stok_Kritis_${dateTag}.pdf`;
      setPdfUrl(doc.output("datauristring"));
      setFileName(name);
      setJsPdfPreviewOpen(true);
      onHide();
    } catch (err) {
      alert("Gagal generate laporan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex justify-content-end gap-2">
      <Button label="Batal" icon="pi pi-times" severity="secondary" onClick={onHide} />
      <Button
        label="Generate Laporan"
        icon="pi pi-print"
        onClick={handleGenerate}
        loading={loading}
        style={{ background: "#ef4444", borderColor: "#ef4444" }}
      />
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-exclamation-triangle text-red-500" />
          <span>Cetak Laporan Stok Kritis</span>
        </div>
      }
      style={{ width: "420px" }}
      modal
      footer={footer}
      draggable={false}
      dismissableMask
    >
      <div className="grid p-fluid">
        <div className="col-12">
          <p className="text-color-secondary text-sm mt-0">
            Laporan memuat khusus bahan baku berstatus <b>Kritis</b> (stok ≤ batas minimum)
            dan <b>Habis</b> (stok = 0), diurutkan berdasarkan tingkat urgensi.
          </p>
        </div>

        <div className="col-6">
          <div className="field">
            <label className="font-semibold text-sm">Ukuran Kertas</label>
            <Dropdown
              value={config.paperSize}
              options={paperSizes}
              onChange={(e) => onChangeSelect(e, "paperSize")}
              optionLabel="name"
            />
          </div>
        </div>
        <div className="col-6">
          <div className="field">
            <label className="font-semibold text-sm">Orientasi</label>
            <Dropdown
              value={config.orientation}
              options={orientationOptions}
              onChange={(e) => onChangeSelect(e, "orientation")}
              optionLabel="label"
            />
          </div>
        </div>

        <div className="col-12">
          <label className="font-semibold text-sm">Margin (mm)</label>
        </div>
        {[
          ["marginTop", "Atas"], ["marginBottom", "Bawah"],
          ["marginLeft", "Kiri"], ["marginRight", "Kanan"],
        ].map(([key, label]) => (
          <div key={key} className="col-6">
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon" style={{ minWidth: 52 }}>{label}</span>
              <InputNumber
                value={config[key]}
                onValueChange={(e) => onChangeNumber(e, key)}
                min={0} max={50}
              />
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}