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

const bulanOptions = [
  { label: "Semua Bulan", value: 0  },
  { label: "Januari",     value: 1  },
  { label: "Februari",    value: 2  },
  { label: "Maret",       value: 3  },
  { label: "April",       value: 4  },
  { label: "Mei",         value: 5  },
  { label: "Juni",        value: 6  },
  { label: "Juli",        value: 7  },
  { label: "Agustus",     value: 8  },
  { label: "September",   value: 9  },
  { label: "Oktober",     value: 10 },
  { label: "November",    value: 11 },
  { label: "Desember",    value: 12 },
];

const yearOptions = () => {
  const cur = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({
    label: String(cur - i),
    value: cur - i,
  }));
};

const statusLabel = (status) => {
  if (status === "pending")     return "Pending";
  if (status === "in_progress") return "Diproses";
  if (status === "completed")   return "Selesai";
  return status || "-";
};

const statusColor = (status) => {
  if (status === "completed")   return [34, 197, 94];
  if (status === "in_progress") return [245, 158, 11];
  if (status === "pending")     return [239, 68, 68];
  return [156, 163, 175];
};

const formatDate = (val) =>
  val
    ? new Date(val).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "-";

export default function PrintLaporanPengadaan({
  visible,
  onHide,
  setPdfUrl,
  setFileName,
  setJsPdfPreviewOpen,
}) {
  const [loading, setLoading] = useState(false);
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1);
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear());
  const [config, setConfig] = useState({
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
    const params = new URLSearchParams({ year: filterTahun });
    if (filterBulan > 0) params.append("month", filterBulan);

    const res  = await fetch(`${BASE_URL}/procurements/report?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal memuat data pengadaan");
    return json;
  };

  const drawAccentTitle = (doc, text, x, y, color = [245, 158, 11], fontSize = 10) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(1.2);
    doc.line(x, y - 3, x, y + 3);
    doc.setLineWidth(0.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.text(text, x + 4, y);
  };

  const getPeriodeLabel = () => {
    if (filterBulan === 0) return `Tahun ${filterTahun}`;
    const bln = bulanOptions.find((b) => b.value === filterBulan)?.label || "";
    return `${bln} ${filterTahun}`;
  };

  const generatePDF = (data, summary) => {
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
    doc.setFillColor(245, 158, 11);
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
      `Laporan Pengadaan Bahan Baku - Periode: ${getPeriodeLabel()} - Dicetak: ${todayStr}`,
      pw / 2, y + 10,
      { align: "center" }
    );

    y += 18;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pw - mR, y);
    y += 7;

    /* ── RINGKASAN EKSEKUTIF ── */
    drawAccentTitle(doc, "RINGKASAN PENGADAAN", mL, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    const col2 = pw / 4;
    const col3 = pw / 2;
    const col4 = (pw * 3) / 4;

    doc.text(`Total Pengadaan  : ${summary.total}`,          mL,   y);
    doc.text(`Pending          : ${summary.pending}`,         col2, y);
    doc.text(`Diproses         : ${summary.in_progress}`,     col3, y);
    doc.text(`Selesai          : ${summary.completed}`,       col4, y);
    y += 5;
    doc.text(`Total Qty        : ${summary.totalQty}`,        mL,   y);
    doc.text(`Auto-triggered   : ${summary.auto}`,            col2, y);
    doc.text(`Manual           : ${summary.manual}`,          col3, y);
    y += 9;

    /* ── TABEL DATA PENGADAAN ── */
    const tableRows = data.map((d, idx) => [
      idx + 1,
      d.kode_bahan_baku || "-",
      d.material_name   || "-",
      d.nama_satuan     || "-",
      d.current_stock_at_trigger ?? 0,
      d.required_qty    || 0,
      d.is_auto ? "Otomatis" : "Manual",
      statusLabel(d.status),
      formatDate(d.created_at),
      formatDate(d.updated_at),
    ]);

    autoTable(doc, {
      startY: y,
      head: [[
        "No", "Kode Bahan", "Nama Bahan Baku", "Satuan",
        "Stok Saat Trigger", "Qty Dibutuhkan",
        "Jenis", "Status", "Tgl Dibuat", "Tgl Update",
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
        fillColor:  [245, 158, 11],
        textColor:  255,
        fontStyle:  "bold",
        halign:     "center",
        valign:     "middle",
      },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center" },
        1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 40, halign: "left"   },
        3: { cellWidth: 16, halign: "center" },
        4: { cellWidth: 24, halign: "center" },
        5: { cellWidth: 24, halign: "center" },
        6: { cellWidth: 20, halign: "center" },
        7: { cellWidth: 20, halign: "center" },
        8: { cellWidth: 24, halign: "center" },
        9: { cellWidth: 24, halign: "center" },
      },
      didParseCell(data) {
        if (data.section === "body") {
          // Kolom Status
          if (data.column.index === 7) {
            const row    = tableRows[data.row.index];
            const rawSts = row?.[7];
            if (rawSts === "Selesai")  data.cell.styles.textColor = [34, 197, 94];
            if (rawSts === "Diproses") data.cell.styles.textColor = [245, 158, 11];
            if (rawSts === "Pending")  data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          }
          // Kolom Jenis
          if (data.column.index === 6) {
            const val = data.cell.raw;
            if (val === "Otomatis") data.cell.styles.textColor = [99, 102, 241];
            if (val === "Manual")   data.cell.styles.textColor = [14, 165, 233];
            data.cell.styles.fontStyle = "bold";
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

    /* ── REKAP PER MATERIAL ── */
    // Group by material
    const materialMap = {};
    for (const d of data) {
      const key = d.material_id;
      if (!materialMap[key]) {
        materialMap[key] = {
          kode:        d.kode_bahan_baku || "-",
          nama:        d.material_name   || "-",
          satuan:      d.nama_satuan     || "-",
          total:       0,
          pending:     0,
          in_progress: 0,
          completed:   0,
          totalQty:    0,
        };
      }
      materialMap[key].total++;
      materialMap[key].totalQty += Number(d.required_qty || 0);
      if (d.status === "pending")     materialMap[key].pending++;
      if (d.status === "in_progress") materialMap[key].in_progress++;
      if (d.status === "completed")   materialMap[key].completed++;
    }

    const rekapRows = Object.values(materialMap).map((m, idx) => [
      idx + 1,
      m.kode,
      m.nama,
      m.satuan,
      m.total,
      m.pending,
      m.in_progress,
      m.completed,
      m.totalQty,
    ]);

    if (rekapRows.length > 0) {
      let ry = doc.lastAutoTable.finalY + 10;
      if (ry > ph - mB - 40) {
        doc.addPage();
        ry = mT;
      }

      drawAccentTitle(doc, "REKAP PER BAHAN BAKU", mL, ry);
      ry += 4;

      autoTable(doc, {
        startY: ry,
        head: [[
          "No", "Kode", "Nama Bahan Baku", "Satuan",
          "Total Pengadaan", "Pending", "Diproses", "Selesai", "Total Qty",
        ]],
        body: rekapRows,
        margin: { left: mL, right: mR, bottom: mB + 10 },
        styles: {
          fontSize:    8,
          cellPadding: 3,
          lineColor:   [230, 230, 230],
          lineWidth:   0.1,
        },
        headStyles: {
          fillColor:  [245, 158, 11],
          textColor:  255,
          fontStyle:  "bold",
          halign:     "center",
          valign:     "middle",
        },
        columnStyles: {
          0: { cellWidth: 8,  halign: "center" },
          1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
          2: { cellWidth: 50, halign: "left"   },
          3: { cellWidth: 16, halign: "center" },
          4: { cellWidth: 24, halign: "center" },
          5: { cellWidth: 18, halign: "center" },
          6: { cellWidth: 18, halign: "center" },
          7: { cellWidth: 18, halign: "center" },
          8: { cellWidth: 22, halign: "center" },
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
    }

    /* ── TANDA TANGAN ── */
    let ttdY = doc.lastAutoTable.finalY + 12;
    if (ttdY > ph - mB - 30) {
      doc.addPage();
      ttdY = mT + 10;
    }

    const ttdX = pw - mR - 60;
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.setFont("helvetica", "normal");
    doc.text("Disetujui Oleh,",            ttdX, ttdY);
    doc.text("Administrator,",             ttdX, ttdY + 5);
    ttdY += 22;
    doc.setFont("helvetica", "bold");
    doc.text("( _____________________ )",  ttdX, ttdY);

    return doc;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, summary } = await fetchReport();
      if (!data || data.length === 0) {
        alert(`Tidak ada data pengadaan untuk periode ${getPeriodeLabel()}.`);
        return;
      }

      const doc  = generatePDF(data, summary);
      const name = `Laporan_Pengadaan_${getPeriodeLabel().replace(/ /g, "_")}.pdf`;

      setPdfUrl(doc.output("datauristring"));
      setFileName(name);
      setJsPdfPreviewOpen(true);
      onHide();
    } catch (err) {
      alert("Gagal memproses laporan pengadaan: " + err.message);
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
          <i className="pi pi-shopping-cart" style={{ color: "#f59e0b" }} />
          <span>Ekspor PDF Laporan Pengadaan</span>
        </div>
      }
      style={{ width: "440px" }}
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
            style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
          />
        </div>
      }
      draggable={false}
      dismissableMask
    >
      <div className="grid p-fluid">
        <div className="col-12">
          <p className="text-color-secondary text-sm mt-0 mb-0">
            Laporan memuat riwayat pengadaan bahan baku beserta rekap per
            material untuk periode yang dipilih.
          </p>
        </div>

        {/* FILTER PERIODE */}
        <div className="col-12">
          <label className="font-semibold text-sm block mb-2">Periode Laporan</label>
        </div>
        <div className="col-8">
          <div className="field">
            <label className="text-sm">Bulan</label>
            <Dropdown
              value={filterBulan}
              options={bulanOptions}
              onChange={(e) => setFilterBulan(e.value)}
              optionLabel="label"
            />
          </div>
        </div>
        <div className="col-4">
          <div className="field">
            <label className="text-sm">Tahun</label>
            <Dropdown
              value={filterTahun}
              options={yearOptions()}
              onChange={(e) => setFilterTahun(e.value)}
              optionLabel="label"
            />
          </div>
        </div>

        {/* KONFIGURASI KERTAS */}
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