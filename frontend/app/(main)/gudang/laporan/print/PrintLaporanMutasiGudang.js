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

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const sourceLabel = (type) => {
  if (type === "procurement") return "Pengadaan";
  if (type === "production")  return "Produksi";
  if (type === "adjustment")  return "Penyesuaian";
  return type || "-";
};

const movementLabel = (type) => (type === "in" ? "Masuk" : "Keluar");

const formatDateTime = (val) =>
  val
    ? new Date(val).toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "-";

export default function PrintLaporanMutasiGudang({
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

  const getPeriodeLabel = () => {
    if (filterBulan === 0) return `Tahun ${filterTahun}`;
    const bln = bulanOptions.find((b) => b.value === filterBulan)?.label || "";
    return `${bln} ${filterTahun}`;
  };

  const fetchReport = async () => {
    const params = new URLSearchParams({ year: filterTahun });
    if (filterBulan > 0) params.append("month", filterBulan);

    const res = await fetch(`${BASE_URL}/materials/stock-movements/report?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal memuat data mutasi stok");
    return json;
  };

  const drawAccentTitle = (doc, text, x, y, color = [139, 92, 246], fontSize = 10) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(1.2);
    doc.line(x, y - 3, x, y + 3);
    doc.setLineWidth(0.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.text(text, x + 4, y);
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
    doc.setFillColor(139, 92, 246);
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
      `Laporan Mutasi Stok Bahan Baku — Gudang - Periode: ${getPeriodeLabel()} - Dicetak: ${todayStr}`,
      pw / 2, y + 10,
      { align: "center" }
    );

    y += 18;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pw - mR, y);
    y += 7;

    /* ── RINGKASAN ── */
    drawAccentTitle(doc, "RINGKASAN MUTASI", mL, y);
    y += 7;

    const boxW = (pw - mL - mR - 9) / 4;
    const summaryItems = [
      { label: "Total Masuk",  value: summary.count_in,       color: [34, 197, 94]  },
      { label: "Qty Masuk",    value: round2(summary.total_qty_in),  color: [16, 185, 129] },
      { label: "Total Keluar", value: summary.count_out,      color: [239, 68, 68]  },
      { label: "Qty Keluar",   value: round2(summary.total_qty_out), color: [220, 38, 38]  },
    ];

    summaryItems.forEach((item, i) => {
      const bx = mL + i * (boxW + 3);
      doc.setFillColor(...item.color);
      doc.roundedRect(bx, y, boxW, 14, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(String(item.value), bx + boxW / 2, y + 7, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, bx + boxW / 2, y + 12, { align: "center" });
    });

    y += 20;

    /* ── TABEL MUTASI ── */
    const tableRows = data.map((d, idx) => [
      idx + 1,
      d.kode_bahan_baku || "-",
      d.material_name   || "-",
      d.nama_satuan     || "-",
      movementLabel(d.movement_type),
      sourceLabel(d.source_type),
      round2(d.quantity),
      round2(d.stock_before),
      round2(d.stock_after),
      formatDateTime(d.created_at),
    ]);

    autoTable(doc, {
      startY: y,
      head: [[
        "No", "Kode", "Nama Bahan Baku", "Satuan",
        "Jenis", "Sumber", "Qty", "Stok Sebelum", "Stok Sesudah", "Waktu",
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
        fillColor:  [139, 92, 246],
        textColor:  255,
        fontStyle:  "bold",
        halign:     "center",
        valign:     "middle",
      },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center" },
        1: { cellWidth: 20, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 36, halign: "left"   },
        3: { cellWidth: 14, halign: "center" },
        4: { cellWidth: 16, halign: "center" },
        5: { cellWidth: 20, halign: "center" },
        6: { cellWidth: 14, halign: "center" },
        7: { cellWidth: 20, halign: "center" },
        8: { cellWidth: 20, halign: "center" },
        9: { cellWidth: 28, halign: "center" },
      },
      didParseCell(data) {
        if (data.section === "body") {
          if (data.column.index === 4) {
            const val = data.cell.raw;
            if (val === "Masuk")  data.cell.styles.textColor = [34, 197, 94];
            if (val === "Keluar") data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          }
          if (data.column.index === 5) {
            const val = data.cell.raw;
            if (val === "Pengadaan")   data.cell.styles.textColor = [245, 158, 11];
            if (val === "Produksi")    data.cell.styles.textColor = [14, 165, 233];
            if (val === "Penyesuaian") data.cell.styles.textColor = [107, 114, 128];
          }
        }
      },
      didDrawPage({ pageNumber }) {
        const count = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(
          `Halaman ${pageNumber} dari ${count} | Dicetak: ${todayStr} | Jadwalin ERP — Gudang`,
          pw - mR, ph - 6,
          { align: "right" }
        );
      },
    });

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
    doc.text(`Madiun, ${todayStr}`, ttdX, ttdY);
    doc.text("Mengetahui,",         ttdX, ttdY + 5);
    doc.text("Kepala Gudang,",      ttdX, ttdY + 10);
    ttdY += 28;
    doc.setFont("helvetica", "bold");
    doc.text("( __________________ )", ttdX, ttdY);

    return doc;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, summary } = await fetchReport();
      if (!data || data.length === 0) {
        alert(`Tidak ada data mutasi stok untuk periode ${getPeriodeLabel()}.`);
        return;
      }

      const doc  = generatePDF(data, summary);
      const name = `Laporan_Mutasi_Stok_${getPeriodeLabel().replace(/ /g, "_")}.pdf`;

      setPdfUrl(doc.output("datauristring"));
      setFileName(name);
      setJsPdfPreviewOpen(true);
      onHide();
    } catch (err) {
      alert("Gagal memproses laporan mutasi stok: " + err.message);
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
          <i className="pi pi-arrow-right-arrow-left" style={{ color: "#8b5cf6" }} />
          <span>Cetak Laporan Mutasi Stok</span>
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
            style={{ background: "#8b5cf6", borderColor: "#8b5cf6" }}
          />
        </div>
      }
      draggable={false}
      dismissableMask
    >
      <div className="grid p-fluid">
        <div className="col-12">
          <p className="text-color-secondary text-sm mt-0 mb-0">
            Laporan memuat riwayat keluar-masuk stok bahan baku (pengadaan,
            produksi, dan penyesuaian manual) untuk periode yang dipilih.
          </p>
        </div>

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