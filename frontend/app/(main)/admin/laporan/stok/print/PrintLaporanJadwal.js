"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
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

const formatDate = (val) =>
  val
    ? new Date(val).toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "-";

export default function PrintLaporanJadwal({
  visible,
  onHide,
  scheduleList = [], // array of schedule objects
  setPdfUrl,
  setFileName,
  setJsPdfPreviewOpen,
}) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    paperSize: "A4",
    orientation: "landscape",
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 15,
    marginRight: 15,
  });

  const onChangeNumber = (e, name) =>
    setConfig((prev) => ({ ...prev, [name]: e.value ?? 0 }));
  const onChangeSelect = (e, name) =>
    setConfig((prev) => ({ ...prev, [name]: e.value }));

  /* ── Fetch jobs untuk satu schedule ── */
  const fetchJobsByScheduleId = async (scheduleId) => {
    const res = await fetch(`${BASE_URL}/pipeline/result/${scheduleId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal memuat detail job");
    return json.data.jobs || [];
  };

  /* ── Fetch semua jobs dari semua schedule ── */
  const fetchAllJobs = async () => {
    const results = await Promise.all(
      scheduleList.map(async (s) => {
        const jobs = await fetchJobsByScheduleId(s.id);
        return { schedule: s, jobs };
      })
    );
    return results;
  };

  /* ── Kop surat (hanya di halaman pertama) ── */
  const drawKop = (doc, pw, mL, mT, mR, isFirst) => {
    if (!isFirst) return;
    let y = mT;

    doc.setFillColor(14, 165, 233);
    doc.roundedRect(mL, y, 14, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("J", mL + 7, y + 9.5, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text("JADWALIN — Sistem Penjadwalan Produksi", pw / 2, y + 5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Laporan Jadwal Produksi — Dicetak: ${new Date().toLocaleDateString("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })}`,
      pw / 2,
      y + 10,
      { align: "center" }
    );

    y += 18;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pw - mR, y);

    return y + 6;
  };

  /* ── Blok ringkasan per schedule ── */
  const drawScheduleSummary = (doc, schedule, pw, mL, mR, y) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(14, 165, 233);
    doc.text(`▌ ${schedule.schedule_code}`, mL, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    const col2X = pw / 2;

    doc.text(`Kode Jadwal : ${schedule.schedule_code}`, mL, y);
    doc.text(`Total Jobs   : ${schedule.total_jobs} Item`, col2X, y);
    y += 5;
    doc.text(`Status      : ${schedule.status_jadwal?.toUpperCase() || "-"}`, mL, y);
    doc.text(`Total Mesin  : ${schedule.total_machines} Unit`, col2X, y);
    y += 5;
    doc.text(`Makespan    : ${schedule.makespan} Menit`, mL, y);
    doc.text(
      `Divalidasi   : ${schedule.validated_by_name || "-"} (${formatDate(schedule.validated_at)})`,
      col2X,
      y
    );
    y += 8;

    return y;
  };

  /* ── Generate PDF ── */
  const generatePDF = (allData) => {
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

    const todayStr = new Date().toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    let y = mT;
    let isFirstSection = true;

    for (const { schedule, jobs } of allData) {
      /* Jika bukan section pertama, cek apakah perlu halaman baru */
      if (!isFirstSection) {
        doc.addPage();
        y = mT;
      }

      /* Kop hanya di halaman pertama dokumen */
      if (isFirstSection) {
        y = drawKop(doc, pw, mL, mT, mR, true);
      }

      /* Ringkasan schedule */
      y = drawScheduleSummary(doc, schedule, pw, mL, mR, y);

      /* Tabel job */
      const tableRows = jobs.map((job, idx) => [
        idx + 1,
        job.job_id,
        job.operation_type || "-",
        `${job.assigned_machine_code || "-"}\n(${job.assigned_machine_name || "-"})`,
        formatDate(job.scheduled_start),
        formatDate(job.scheduled_end),
        `${job.processing_time} mnt`,
        job.priority_score ? job.priority_score.toFixed(1) : "0.0",
        job.job_status || "Pending",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["No", "Job ID", "Operasi", "Mesin Penugasan", "Mulai Produksi", "Selesai Produksi", "Durasi", "Prioritas", "Status"]],
        body: tableRows,
        margin: { left: mL, right: mR, bottom: mB + 10 },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [230, 230, 230],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [14, 165, 233],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 8,  halign: "center" },
          1: { cellWidth: 18, halign: "center", fontStyle: "bold" },
          2: { cellWidth: 22, halign: "left" },
          3: { cellWidth: 40, halign: "left" },
          4: { cellWidth: 32, halign: "center" },
          5: { cellWidth: 32, halign: "center" },
          6: { cellWidth: 18, halign: "center" },
          7: { cellWidth: 18, halign: "center" },
          8: { cellWidth: 20, halign: "center" },
        },
        didParseCell(data) {
          if (data.section === "body" && data.column.index === 8) {
            const status = data.cell.raw;
            if (status === "Completed" || status === "In Progress")
              data.cell.styles.textColor = [34, 197, 94];
            if (status === "Pending" || status === "Scheduled")
              data.cell.styles.textColor = [245, 158, 11];
            if (status === "Delayed" || status === "Failed")
              data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage({ pageNumber }) {
          const count = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(160);
          doc.text(
            `Halaman ${pageNumber} dari ${count} | Dicetak: ${todayStr} | Jadwalin ERP`,
            pw - mR,
            ph - 6,
            { align: "right" }
          );
        },
      });

      y = doc.lastAutoTable.finalY + 6;
      isFirstSection = false;
    }

    /* Tanda tangan — di akhir dokumen */
    let ttdY = y + 6;
    if (ttdY > ph - mB - 30) {
      doc.addPage();
      ttdY = mT + 10;
    }

    const ttdX = pw - mR - 60;
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.setFont("helvetica", "normal");
    doc.text("Disetujui Oleh,", ttdX, ttdY);
    doc.text("Kepala Produksi,", ttdX, ttdY + 5);
    ttdY += 22;
    doc.setFont("helvetica", "bold");
    doc.text("( _____________________ )", ttdX, ttdY);

    return doc;
  };

  const handleGenerate = async () => {
    if (!scheduleList || scheduleList.length === 0) return;
    setLoading(true);
    try {
      const allData = await fetchAllJobs();

      const empty = allData.filter((d) => d.jobs.length === 0);
      if (empty.length === allData.length) {
        alert("Semua jadwal yang dipilih tidak memiliki daftar job produksi.");
        return;
      }

      const filtered = allData.filter((d) => d.jobs.length > 0);
      const doc = generatePDF(filtered);

      const suffix =
        scheduleList.length === 1
          ? scheduleList[0].schedule_code
          : `${scheduleList.length}_Jadwal`;

      const name = `Laporan_Jadwal_${suffix}.pdf`;
      setPdfUrl(doc.output("datauristring"));
      setFileName(name);
      setJsPdfPreviewOpen(true);
      onHide();
    } catch (err) {
      alert("Gagal memproses arsip jadwal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const labelKeterangan =
    scheduleList.length === 0
      ? "Tidak ada jadwal dipilih."
      : scheduleList.length === 1
      ? `Jadwal: ${scheduleList[0]?.schedule_code}`
      : `${scheduleList.length} jadwal akan dikompilasi dalam satu dokumen.`;

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-calendar text-sky-500" />
          <span>Ekspor PDF Jadwal Terperinci</span>
        </div>
      }
      style={{ width: "420px" }}
      modal
      footer={
        <div className="flex justify-content-end gap-2">
          <Button label="Batal" icon="pi pi-times" severity="secondary" onClick={onHide} />
          <Button
            label="Generate PDF"
            icon="pi pi-print"
            onClick={handleGenerate}
            loading={loading}
            disabled={scheduleList.length === 0}
          />
        </div>
      }
      draggable={false}
      dismissableMask
    >
      <div className="grid p-fluid">
        <div className="col-12">
          <p className="text-color-secondary text-sm mt-0 mb-0">
            {labelKeterangan}
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
          <label className="font-semibold text-sm">Margin Dokumen (mm)</label>
        </div>
        {[
          ["marginTop", "Atas"],
          ["marginBottom", "Bawah"],
          ["marginLeft", "Kiri"],
          ["marginRight", "Kanan"],
        ].map(([key, label]) => (
          <div key={key} className="col-6">
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon" style={{ minWidth: 52 }}>
                {label}
              </span>
              <InputNumber
                value={config[key]}
                onValueChange={(e) => onChangeNumber(e, key)}
                min={0}
                max={40}
              />
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}