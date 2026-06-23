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

export default function PrintLaporanStokGudang({
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
  const fetchMaterials = async () => {
    const res = await fetch(`${BASE_URL}/materials`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data; // array dengan field: kode_bahan_baku, material_name, kode_satuan, nama_satuan, current_stock, min_stock_level, reserved_stock, available_stock
  };

  /* ── helpers ── */
  const getStatusLabel = (row) => {
    if (row.current_stock === 0) return "Habis";
    if (row.current_stock <= row.min_stock_level) return "Kritis";
    return "Aman";
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
    doc.setFillColor(99, 102, 241); // indigo, warna khas gudang biar beda visual dari admin
    doc.roundedRect(mL, y, 14, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("J", mL + 7, y + 10, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("JADWALIN — Sistem Penjadwalan Produksi", pw / 2, y + 5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Laporan Monitoring Stok Bahan Baku — Gudang", pw / 2, y + 10, { align: "center" });

    y += 18;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pw - mR, y);
    y += 5;

    /* -- judul & tanggal -- */
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN STOK BAHAN BAKU", pw / 2, y + 5, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Tanggal: ${todayStr}`, pw / 2, y + 11, { align: "center" });
    doc.text(`Dicetak pada: ${generatedAt}`, pw / 2, y + 16, { align: "center" });
    y += 22;

    /* -- ringkasan -- */
    const total  = materials.length;
    const aman   = materials.filter((m) => m.current_stock > m.min_stock_level).length;
    const kritis = materials.filter((m) => m.current_stock <= m.min_stock_level && m.current_stock > 0).length;
    const habis  = materials.filter((m) => m.current_stock === 0).length;

    const summaryItems = [
      { label: "Total Bahan Baku", value: total,  color: [99, 102, 241] },
      { label: "Stok Aman",        value: aman,   color: [34, 197, 94]  },
      { label: "Stok Kritis",      value: kritis, color: [245, 158, 11] },
      { label: "Stok Habis",       value: habis,  color: [239, 68, 68]  },
    ];

    const boxW = (pw - mL - mR - 9) / 4;
    summaryItems.forEach((item, i) => {
      const bx = mL + i * (boxW + 3);
      doc.setFillColor(...item.color);
      doc.roundedRect(bx, y, boxW, 14, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(String(item.value), bx + boxW / 2, y + 7, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, bx + boxW / 2, y + 12, { align: "center" });
    });

    y += 20;

    /* -- tabel -- */
    const rows = materials.map((m, idx) => {
      const status = getStatusLabel(m);
      const avail  = m.available_stock ?? m.current_stock;
      return [
        idx + 1,
        m.kode_bahan_baku,
        m.material_name,
        `${m.kode_satuan}`,
        m.current_stock,
        m.reserved_stock ?? 0,
        avail,
        m.min_stock_level,
        status,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["No", "Kode", "Nama Bahan Baku", "Sat", "Stok", "Reservasi", "Tersedia", "Min", "Status"]],
      body: rows,
      margin: { left: mL, right: mR, bottom: mB + 8 },
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center" },
        1: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 10, halign: "center" },
        4: { cellWidth: 14, halign: "center" },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 18, halign: "center" },
        7: { cellWidth: 10, halign: "center" },
        8: { cellWidth: 16, halign: "center" },
      },
      bodyStyles: { textColor: [30, 30, 30] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 8) {
          const val = data.cell.raw;
          if (val === "Habis")  data.cell.styles.textColor = [239, 68, 68];
          if (val === "Kritis") data.cell.styles.textColor = [245, 158, 11];
          if (val === "Aman")   data.cell.styles.textColor = [34, 197, 94];
          data.cell.styles.fontStyle = "bold";
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

    /* -- tanda tangan -- */
    let ttdY = doc.lastAutoTable.finalY + 12;
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
      const materials = await fetchMaterials();
      if (!materials.length) {
        alert("Tidak ada data bahan baku.");
        return;
      }
      const doc = generatePDF(materials);
      const dateTag = new Date().toISOString().split("T")[0];
      const name = `Laporan_Stok_Gudang_${dateTag}.pdf`;
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
      />
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-file-pdf text-red-500" />
          <span>Cetak Laporan Stok Bahan Baku</span>
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
            Laporan akan memuat data stok bahan baku hari ini secara real-time, termasuk
            stok saat ini, reservasi aktif, stok tersedia, batas minimum, dan status.
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