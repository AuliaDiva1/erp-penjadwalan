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
  { name: "A4",     value: "A4"       },
  { name: "F4",     value: [215, 330] },
  { name: "Letter", value: "Letter"   },
];

const orientationOptions = [
  { label: "Portrait",  value: "portrait"  },
  { label: "Landscape", value: "landscape" },
];

const statusColor = (status) => {
  if (status === "active")      return [34, 197, 94];
  if (status === "maintenance") return [245, 158, 11];
  if (status === "breakdown")   return [239, 68, 68];
  return [156, 163, 175];
};

const statusLabel = (status) => {
  if (status === "active")      return "Aktif";
  if (status === "maintenance") return "Maintenance";
  if (status === "breakdown")   return "Breakdown";
  if (status === "inactive")    return "Tidak Aktif";
  return status || "-";
};

export default function PrintLaporanMesin({
  visible,
  onHide,
  setPdfUrl,
  setFileName,
  setJsPdfPreviewOpen,
}) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig]   = useState({
    paperSize:    "A4",
    orientation:  "landscape",
    marginTop:    15,
    marginBottom: 15,
    marginLeft:   15,
    marginRight:  15,
  });

  const onChangeNumber = (e, name) =>
    setConfig((prev) => ({ ...prev, [name]: e.value ?? 0 }));
  const onChangeSelect = (e, name) =>
    setConfig((prev) => ({ ...prev, [name]: e.value }));

  const fetchReport = async () => {
    const res  = await fetch(`${BASE_URL}/machines/report`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal memuat data mesin");
    return json.data;
  };

  /* ── Helper: garis aksen warna di kiri judul ── */
  const drawAccentTitle = (doc, text, x, y, color = [16, 185, 129], fontSize = 10) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(1.2);
    doc.line(x, y - 3, x, y + 3);
    doc.setLineWidth(0.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.text(text, x + 4, y);
  };

  const generatePDF = (machines) => {
    const doc = new jsPDF({
      orientation: config.orientation,
      unit:        "mm",
      format:      config.paperSize,
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

    /* ── KOP ── */
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(mL, y, 14, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("J", mL + 7, y + 9.5, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text("JADWALIN - Sistem Penjadwalan Produksi", pw / 2, y + 5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Laporan Kinerja Mesin - Dicetak: ${todayStr}`,
      pw / 2, y + 10,
      { align: "center" }
    );

    y += 18;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pw - mR, y);
    y += 7;

    /* ── RINGKASAN EKSEKUTIF ── */
    drawAccentTitle(doc, "RINGKASAN EKSEKUTIF", mL, y);
    y += 7;

    const totalMesin     = machines.length;
    const aktif          = machines.filter((m) => m.status === "active").length;
    const maintenance    = machines.filter((m) => m.status === "maintenance").length;
    const breakdown      = machines.filter((m) => m.status === "breakdown").length;
    const totalJobs      = machines.reduce((a, m) => a + m.totalJobs, 0);
    const totalSelesai   = machines.reduce((a, m) => a + m.completedJobs, 0);
    const totalTerlambat = machines.reduce((a, m) => a + m.lateJobs, 0);
    const avgUtil        = machines.length
      ? parseFloat(
          (machines.reduce((a, m) => a + m.utilization, 0) / machines.length).toFixed(1)
        )
      : 0;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    const col2 = pw / 4;
    const col3 = pw / 2;
    const col4 = (pw * 3) / 4;

    doc.text(`Total Mesin     : ${totalMesin} Unit`,   mL,   y);
    doc.text(`Aktif           : ${aktif} Unit`,         col2, y);
    doc.text(`Maintenance     : ${maintenance} Unit`,   col3, y);
    doc.text(`Breakdown       : ${breakdown} Unit`,     col4, y);
    y += 5;
    doc.text(`Total Jobs      : ${totalJobs} Job`,      mL,   y);
    doc.text(`Selesai         : ${totalSelesai} Job`,   col2, y);
    doc.text(`Terlambat       : ${totalTerlambat} Job`, col3, y);
    doc.text(`Rata-rata Util. : ${avgUtil}%`,           col4, y);
    y += 9;

    /* ── TABEL PERBANDINGAN KINERJA ── */
    const tableRows = machines.map((m, idx) => [
      idx + 1,
      m.machine_id,
      m.machine_name,
      statusLabel(m.status),
      `${m.machine_availability}%`,
      m.totalJobs,
      m.completedJobs,
      m.delayedJobs + m.failedJobs,
      m.lateJobs,
      `${m.totalMakespanMenit} mnt`,
      `${m.avgProcessingTime} mnt`,
      `${m.utilization}%`,
      `${m.estimasiEnergi} kWh`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [[
        "No", "ID Mesin", "Nama Mesin", "Status", "Availability",
        "Total Job", "Selesai", "Gagal/Delay", "Terlambat",
        "Total Makespan", "Avg. Durasi", "Utilization", "Est. Energi",
      ]],
      body: tableRows,
      margin: { left: mL, right: mR, bottom: mB + 10 },
      styles: {
        fontSize:    8,
        cellPadding: 3,
        lineColor:   [230, 230, 230],
        lineWidth:   0.1,
      },
      headStyles: {
        fillColor:  [16, 185, 129],
        textColor:  255,
        fontStyle:  "bold",
        halign:     "center",
        valign:     "middle",
      },
      columnStyles: {
        0:  { cellWidth: 8,  halign: "center" },
        1:  { cellWidth: 18, halign: "center", fontStyle: "bold" },
        2:  { cellWidth: 32, halign: "left"   },
        3:  { cellWidth: 20, halign: "center" },
        4:  { cellWidth: 22, halign: "center" },
        5:  { cellWidth: 16, halign: "center" },
        6:  { cellWidth: 16, halign: "center" },
        7:  { cellWidth: 20, halign: "center" },
        8:  { cellWidth: 18, halign: "center" },
        9:  { cellWidth: 24, halign: "center" },
        10: { cellWidth: 20, halign: "center" },
        11: { cellWidth: 20, halign: "center" },
        12: { cellWidth: 20, halign: "center" },
      },
      didParseCell(data) {
        if (data.section === "body") {
          if (data.column.index === 3) {
            const raw = machines[data.row.index]?.status;
            data.cell.styles.textColor = statusColor(raw);
            data.cell.styles.fontStyle = "bold";
          }
          if (data.column.index === 11) {
            const val = parseFloat(data.cell.raw);
            if (val >= 75)      data.cell.styles.textColor = [34, 197, 94];
            else if (val >= 40) data.cell.styles.textColor = [245, 158, 11];
            else                data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          }
          if (data.column.index === 8) {
            const val = parseInt(data.cell.raw);
            if (val > 0) {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
      didDrawPage({ pageNumber }) {
        const count = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(
          `Halaman ${pageNumber} dari ${count} | Dicetak: ${todayStr} | Jadwalin ERP`,
          pw - mR, ph - 6,
          { align: "right" }
        );
      },
    });

    /* ── HALAMAN DETAIL PER MESIN ── */
    doc.addPage();
    let dy = mT;

    drawAccentTitle(doc, "DETAIL KINERJA PER MESIN", mL, dy, [16, 185, 129], 11);
    dy += 4;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(mL, dy, pw - mR, dy);
    dy += 7;

    for (const m of machines) {
      if (dy > ph - mB - 55) {
        doc.addPage();
        dy = mT;
      }

      /* Header mesin */
      doc.setFillColor(240, 253, 250);
      doc.roundedRect(mL, dy - 3, pw - mL - mR, 8, 1, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129);
      doc.text(`${m.machine_id}  -  ${m.machine_name}`, mL + 2, dy + 3);

      const sc = statusColor(m.status);
      doc.setTextColor(...sc);
      doc.text(`[ ${statusLabel(m.status)} ]`, pw - mR - 2, dy + 3, { align: "right" });
      dy += 11;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);

      const c2 = mL + 85;
      const c3 = mL + 175;

      doc.text(`Availability    : ${m.machine_availability}%`,      mL, dy);
      doc.text(`Kapasitas/Jam   : ${m.capacity_per_hour || "-"}`,   c2, dy);
      doc.text(`Energy Rate     : ${m.energy_rate || "-"} kWh/jam`, c3, dy);
      dy += 5;

      doc.text(`Total Jobs      : ${m.totalJobs}`,                  mL, dy);
      doc.text(`Selesai         : ${m.completedJobs}`,              c2, dy);
      doc.text(`In Progress     : ${m.inProgressJobs}`,             c3, dy);
      dy += 5;

      doc.text(`Scheduled       : ${m.scheduledJobs}`,              mL, dy);
      doc.text(`Gagal/Delay     : ${m.delayedJobs + m.failedJobs}`, c2, dy);
      doc.text(`Pending         : ${m.pendingJobs}`,                c3, dy);
      dy += 5;

      doc.text(`Terlambat       : ${m.lateJobs} Job`,               mL, dy);
      doc.text(`Total Makespan  : ${m.totalMakespanMenit} mnt`,     c2, dy);
      doc.text(`Avg. Durasi     : ${m.avgProcessingTime} mnt`,      c3, dy);
      dy += 5;

      doc.text(`Utilization     : ${m.utilization}%`,               mL, dy);
      doc.text(`Est. Energi     : ${m.estimasiEnergi} kWh`,         c2, dy);
      dy += 4;

      /* Bar utilization visual */
      const barW     = 80;
      const barH     = 3;
      const fillW    = Math.max(0, Math.min(barW, (m.utilization / 100) * barW));
      const barColor =
        m.utilization >= 75 ? [34, 197, 94]  :
        m.utilization >= 40 ? [245, 158, 11] :
                              [239, 68, 68];

      doc.setFontSize(7.5);
      doc.setTextColor(120);
      doc.text("Utilisasi :", c3, dy);
      const labelW = doc.getTextWidth("Utilisasi :") + 2;

      doc.setFillColor(230, 230, 230);
      doc.roundedRect(c3 + labelW, dy - 2.5, barW, barH, 1, 1, "F");
      doc.setFillColor(...barColor);
      if (fillW > 0) doc.roundedRect(c3 + labelW, dy - 2.5, fillW, barH, 1, 1, "F");
      doc.setTextColor(...barColor);
      doc.text(`${m.utilization}%`, c3 + labelW + barW + 2, dy);

      dy += 7;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(mL, dy, pw - mR, dy);
      dy += 7;
    }

    /* ── TANDA TANGAN ── */
    let ttdY = dy + 6;
    if (ttdY > ph - mB - 30) {
      doc.addPage();
      ttdY = mT + 10;
    }

    const ttdX = pw - mR - 60;
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.setFont("helvetica", "normal");
    doc.text("Disetujui Oleh,",             ttdX, ttdY);
    doc.text("Kepala Produksi,",            ttdX, ttdY + 5);
    ttdY += 22;
    doc.setFont("helvetica", "bold");
    doc.text("( _____________________ )",   ttdX, ttdY);

    return doc;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const machines = await fetchReport();
      if (!machines || machines.length === 0) {
        alert("Tidak ada data mesin untuk dicetak.");
        return;
      }

      const doc  = generatePDF(machines);
      const name = `Laporan_Kinerja_Mesin_${new Date().toISOString().slice(0, 10)}.pdf`;

      setPdfUrl(doc.output("datauristring"));
      setFileName(name);
      setJsPdfPreviewOpen(true);
      onHide();
    } catch (err) {
      alert("Gagal memproses laporan mesin: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-server" style={{ color: "#10b981" }} />
          <span>Ekspor PDF Kinerja Mesin</span>
        </div>
      }
      style={{ width: "420px" }}
      modal
      footer={
        <div className="flex justify-content-end gap-2">
          <Button
            label="Batal"
            icon="pi pi-times"
            severity="secondary"
            onClick={onHide}
          />
          <Button
            label="Generate PDF"
            icon="pi pi-print"
            onClick={handleGenerate}
            loading={loading}
            style={{ background: "#10b981", borderColor: "#10b981" }}
          />
        </div>
      }
      draggable={false}
      dismissableMask
    >
      <div className="grid p-fluid">
        <div className="col-12">
          <p className="text-color-secondary text-sm mt-0 mb-0">
            Laporan memuat ringkasan eksekutif seluruh mesin, tabel perbandingan
            kinerja, dan detail per mesin termasuk utilisasi, estimasi energi,
            dan statistik job lengkap.
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
          ["marginTop",    "Atas"  ],
          ["marginBottom", "Bawah" ],
          ["marginLeft",   "Kiri"  ],
          ["marginRight",  "Kanan" ],
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