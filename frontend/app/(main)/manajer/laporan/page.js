"use client";

import { useRef, useState } from "react";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag";

import PrintLaporanJobPeriode from "./print/PrintLaporanJobPeriode";
import PrintLaporanRealisasiProduksi from "./print/PrintLaporanRealisasiProduksi";
import PrintLaporanKeterlambatan from "./print/PrintLaporanKeterlambatan";
import PDFViewer from "./print/PDFViewer";

const laporanList = [
  {
    key: "periode",
    icon: "pi pi-list",
    title: "Laporan Job Per Periode",
    description:
      "Rekap semua job dalam rentang tanggal tertentu, lengkap dengan status, mesin, material, durasi, dan jadwal. Bisa difilter per status job.",
    color: "#6366f1",
    bg: "#eef2ff",
    badge: "Per Periode",
    badgeSeverity: "info",
    ready: true,
  },
  {
    key: "realisasi",
    icon: "pi pi-check-circle",
    title: "Laporan Realisasi Produksi",
    description:
      "Job yang sudah selesai (Completed) — membandingkan waktu jadwal vs aktual pengerjaan, lengkap dengan keterangan tepat waktu atau terlambat.",
    color: "#22c55e",
    bg: "#f0fdf4",
    badge: "Completed",
    badgeSeverity: "success",
    ready: true,
  },
  {
    key: "keterlambatan",
    icon: "pi pi-clock",
    title: "Laporan Keterlambatan",
    description:
      "Daftar job yang melewati waktu jadwal (deadline warning aktif), diurutkan untuk kebutuhan evaluasi dan eskalasi ke supervisor.",
    color: "#ef4444",
    bg: "#fef2f2",
    badge: "Urgent",
    badgeSeverity: "danger",
    ready: true,
  },
];

export default function LaporanProduksiPage() {
  const toast = useRef(null);

  const [printPeriodeVisible, setPrintPeriodeVisible] = useState(false);
  const [printRealisasiVisible, setPrintRealisasiVisible] = useState(false);
  const [printKeterlambatanVisible, setPrintKeterlambatanVisible] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const handleGenerate = (key) => {
    if (key === "periode")       { setPrintPeriodeVisible(true);       return; }
    if (key === "realisasi")     { setPrintRealisasiVisible(true);     return; }
    if (key === "keterlambatan") { setPrintKeterlambatanVisible(true); return; }
    toast.current.show({ severity: "info", summary: "Segera Hadir", detail: "Laporan ini sedang dalam pengembangan.", life: 3000 });
  };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Laporan Produksi</h2>
        <p className="m-0 text-color-secondary text-sm">{today}</p>
      </div>

      <div className="grid">
        {laporanList.map((item) => (
          <div key={item.key} className="col-12 md:col-6 lg:col-4">
            <div className="card p-4 h-full flex flex-column" style={{ borderTop: `3px solid ${item.color}`, gap: 0 }}>
              <div className="flex align-items-center justify-content-between mb-3">
                <div className="flex align-items-center justify-content-center border-round" style={{ width: 44, height: 44, background: item.bg }}>
                  <i className={item.icon} style={{ fontSize: "1.3rem", color: item.color }} />
                </div>
                <Tag value={item.badge} severity={item.badgeSeverity} style={{ fontSize: "0.7rem" }} />
              </div>

              <div className="font-semibold mb-2" style={{ fontSize: "0.95rem", color: "var(--text-color)" }}>
                {item.title}
              </div>

              <p className="text-color-secondary text-sm m-0 mb-4" style={{ lineHeight: 1.6, flexGrow: 1 }}>
                {item.description}
              </p>

              <div className="flex align-items-center justify-content-between">
                {item.ready ? (
                  <Button
                    label="Generate PDF" icon="pi pi-print" size="small"
                    onClick={() => handleGenerate(item.key)}
                    style={{ background: item.color, borderColor: item.color }}
                  />
                ) : (
                  <Button label="Segera Hadir" icon="pi pi-clock" size="small" disabled className="p-button-secondary p-button-outlined" />
                )}
                {item.ready && (
                  <span className="text-xs text-color-secondary">
                    <i className="pi pi-check-circle mr-1" style={{ color: "#22c55e" }} />
                    Siap digunakan
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <PrintLaporanJobPeriode
        visible={printPeriodeVisible}
        onHide={() => setPrintPeriodeVisible(false)}
        setPdfUrl={setPdfUrl}
        setFileName={setFileName}
        setJsPdfPreviewOpen={setPdfPreviewOpen}
      />

      <PrintLaporanRealisasiProduksi
        visible={printRealisasiVisible}
        onHide={() => setPrintRealisasiVisible(false)}
        setPdfUrl={setPdfUrl}
        setFileName={setFileName}
        setJsPdfPreviewOpen={setPdfPreviewOpen}
      />

      <PrintLaporanKeterlambatan
        visible={printKeterlambatanVisible}
        onHide={() => setPrintKeterlambatanVisible(false)}
        setPdfUrl={setPdfUrl}
        setFileName={setFileName}
        setJsPdfPreviewOpen={setPdfPreviewOpen}
      />

      <Dialog
        visible={pdfPreviewOpen}
        onHide={() => setPdfPreviewOpen(false)}
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-file-pdf text-red-500" />
            <span>{fileName || "Laporan"}</span>
          </div>
        }
        style={{ width: "92vw", height: "92vh" }}
        modal maximizable
        contentStyle={{ padding: 0, height: "calc(92vh - 60px)" }}
      >
        <PDFViewer pdfUrl={pdfUrl} fileName={fileName} />
      </Dialog>
    </div>
  );
}