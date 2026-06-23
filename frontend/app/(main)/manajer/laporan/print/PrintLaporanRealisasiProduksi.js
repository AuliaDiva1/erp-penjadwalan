"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
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

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const formatDate = (val) =>
  val ? new Date(val).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const formatDateTime = (val) =>
  val ? new Date(val).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const toMySQLDate = (d) => {
  if (!d) return null;
  return new Date(d).toISOString().split("T")[0];
};

const getDurasiMenit = (start, end) => {
  if (!start || !end) return "-";
  const diff = Math.round((new Date(end) - new Date(start)) / 60000);
  return diff > 0 ? `${diff} mnt` : "-";
};

export default function PrintLaporanRealisasiProduksi({
  visible, onHide, setPdfUrl, setFileName, setJsPdfPreviewOpen,
}) {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [config, setConfig] = useState({
    paperSize: "A4",
    orientation: "landscape",
    marginTop: 15, marginBottom: 15, marginLeft: 15, marginRight: 15,
  });

  const onChangeNumber = (e, name) => setConfig((p) => ({ ...p, [name]: e.value ?? 0 }));
  const onChangeSelect = (e, name) => setConfig((p) => ({ ...p, [name]: e.value }));

  const getPeriodeLabel = () => {
    const from = dateFrom ? formatDate(dateFrom) : "Awal";
    const to   = dateTo   ? formatDate(dateTo)   : "Sekarang";
    return `${from} s/d ${to}`;
  };

  const fetchData = async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append("date_from", toMySQLDate(dateFrom));
    if (dateTo)   params.append("date_to",   toMySQLDate(dateTo));
    const res = await fetch(`${BASE_URL}/jobs/report/realisasi?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal memuat data");
    return json;
  };

  const generatePDF = (data, summary) => {
    const doc = new jsPDF({ orientation: config.orientation, unit: "mm", format: config.paperSize });
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const mL = config.marginLeft, mT = config.marginTop, mR = config.marginRight, mB = config.marginBottom;

    const todayStr = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    let y = mT;

    // KOP
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(mL, y, 14, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("J", mL + 7, y + 9.5, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("JADWALIN — Sistem Penjadwalan Produksi", pw / 2, y + 5, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text(`Laporan Realisasi Produksi — Periode: ${getPeriodeLabel()} — Dicetak: ${todayStr}`, pw / 2, y + 10, { align: "center" });

    y += 18;
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4);
    doc.line(mL, y, pw - mR, y);
    y += 7;

    // RINGKASAN
    const summaryItems = [
      { label: "Total Selesai", value: summary.total,    color: [34, 197, 94]  },
      { label: "Tepat Waktu",   value: summary.on_time,  color: [16, 185, 129] },
      { label: "Terlambat",     value: summary.terlambat, color: [239, 68, 68] },
      { label: "% On Time",     value: summary.total > 0 ? `${Math.round((summary.on_time / summary.total) * 100)}%` : "0%", color: [99, 102, 241] },
    ];

    const boxW = (pw - mL - mR - 9) / 4;
    summaryItems.forEach((item, i) => {
      const bx = mL + i * (boxW + 3);
      doc.setFillColor(...item.color);
      doc.roundedRect(bx, y, boxW, 14, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text(String(item.value), bx + boxW / 2, y + 7, { align: "center" });
      doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
      doc.text(item.label, bx + boxW / 2, y + 12, { align: "center" });
    });

    y += 20;

    // TABEL
    const rows = data.map((j, idx) => [
      idx + 1,
      j.job_id,
      j.operation_type || "-",
      j.assigned_machine_name || j.machine_name || "-",
      j.material_name || "-",
      round2(j.material_used || 0),
      formatDateTime(j.scheduled_start),
      formatDateTime(j.scheduled_end),
      formatDateTime(j.actual_start),
      formatDateTime(j.actual_end),
      getDurasiMenit(j.actual_start, j.actual_end),
      j.deadline_warning ? "Terlambat" : "Tepat Waktu",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["No", "Job ID", "Operasi", "Mesin", "Material", "Qty", "Jadwal Mulai", "Jadwal Selesai", "Aktual Mulai", "Aktual Selesai", "Durasi Aktual", "Keterangan"]],
      body: rows,
      margin: { left: mL, right: mR, bottom: mB + 10 },
      styles: { fontSize: 7, cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.1 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0:  { cellWidth: 8,  halign: "center" },
        1:  { cellWidth: 16, halign: "center", fontStyle: "bold" },
        2:  { cellWidth: 22 },
        3:  { cellWidth: 22 },
        4:  { cellWidth: 20 },
        5:  { cellWidth: 10, halign: "center" },
        6:  { cellWidth: 22, halign: "center" },
        7:  { cellWidth: 22, halign: "center" },
        8:  { cellWidth: 22, halign: "center" },
        9:  { cellWidth: 22, halign: "center" },
        10: { cellWidth: 18, halign: "center" },
        11: { cellWidth: 18, halign: "center" },
      },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 11) {
          const val = data.cell.raw;
          if (val === "Terlambat")   data.cell.styles.textColor = [239, 68, 68];
          if (val === "Tepat Waktu") data.cell.styles.textColor = [34, 197, 94];
          data.cell.styles.fontStyle = "bold";
        }
      },
      didDrawPage({ pageNumber }) {
        const count = doc.internal.getNumberOfPages();
        doc.setFontSize(8); doc.setTextColor(160);
        doc.text(`Halaman ${pageNumber} dari ${count} | Jadwalin ERP — Staff Produksi`, pw - mR, ph - 6, { align: "right" });
      },
    });

    // TTD
    let ttdY = doc.lastAutoTable.finalY + 12;
    if (ttdY > ph - mB - 30) { doc.addPage(); ttdY = mT + 10; }
    const ttdX = pw - mR - 60;
    doc.setFontSize(9); doc.setTextColor(40); doc.setFont("helvetica", "normal");
    doc.text(`Madiun, ${todayStr}`, ttdX, ttdY);
    doc.text("Mengetahui,", ttdX, ttdY + 5);
    doc.text("Staff Produksi,", ttdX, ttdY + 10);
    ttdY += 28; doc.setFont("helvetica", "bold");
    doc.text("( __________________ )", ttdX, ttdY);

    return doc;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, summary } = await fetchData();
      if (!data || data.length === 0) { alert(`Tidak ada data realisasi untuk periode ${getPeriodeLabel()}.`); return; }
      const doc = generatePDF(data, summary);
      const name = `Laporan_Realisasi_Produksi_${toMySQLDate(dateFrom) || "all"}_sd_${toMySQLDate(dateTo) || "now"}.pdf`;
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

  return (
    <Dialog
      visible={visible} onHide={onHide}
      header={<div className="flex align-items-center gap-2"><i className="pi pi-check-circle" style={{ color: "#22c55e" }} /><span>Cetak Laporan Realisasi Produksi</span></div>}
      style={{ width: "460px" }} modal draggable={false} dismissableMask
      footer={
        <div className="flex justify-content-end gap-2">
          <Button label="Batal" icon="pi pi-times" severity="secondary" onClick={onHide} />
          <Button label="Generate PDF" icon="pi pi-print" onClick={handleGenerate} loading={loading} style={{ background: "#22c55e", borderColor: "#22c55e" }} />
        </div>
      }
    >
      <div className="grid p-fluid">
        <div className="col-12">
          <p className="text-color-secondary text-sm mt-0">Laporan job yang sudah Completed, membandingkan waktu jadwal vs aktual pengerjaan.</p>
        </div>
        <div className="col-6">
          <div className="field">
            <label className="font-semibold text-sm">Dari Tanggal</label>
            <Calendar value={dateFrom} onChange={(e) => setDateFrom(e.value)} dateFormat="dd/mm/yy" showIcon placeholder="Pilih tanggal" />
          </div>
        </div>
        <div className="col-6">
          <div className="field">
            <label className="font-semibold text-sm">Sampai Tanggal</label>
            <Calendar value={dateTo} onChange={(e) => setDateTo(e.value)} dateFormat="dd/mm/yy" showIcon placeholder="Pilih tanggal" />
          </div>
        </div>
        <div className="col-6">
          <div className="field">
            <label className="font-semibold text-sm">Ukuran Kertas</label>
            <Dropdown value={config.paperSize} options={paperSizes} onChange={(e) => onChangeSelect(e, "paperSize")} optionLabel="name" />
          </div>
        </div>
        <div className="col-6">
          <div className="field">
            <label className="font-semibold text-sm">Orientasi</label>
            <Dropdown value={config.orientation} options={orientationOptions} onChange={(e) => onChangeSelect(e, "orientation")} optionLabel="label" />
          </div>
        </div>
        <div className="col-12"><label className="font-semibold text-sm">Margin (mm)</label></div>
        {[["marginTop","Atas"],["marginBottom","Bawah"],["marginLeft","Kiri"],["marginRight","Kanan"]].map(([key, label]) => (
          <div key={key} className="col-6">
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon" style={{ minWidth: 52 }}>{label}</span>
              <InputNumber value={config[key]} onValueChange={(e) => onChangeNumber(e, key)} min={0} max={40} />
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}