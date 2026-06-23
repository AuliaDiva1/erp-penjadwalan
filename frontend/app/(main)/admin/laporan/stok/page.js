"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { RadioButton } from "primereact/radiobutton";
import PrintLaporanStok from "./print/PrintLaporanStok";
import PrintLaporanJadwal from "./print/PrintLaporanJadwal";
import PrintLaporanMesin from "./print/PrintLaporanMesin";
import PrintLaporanPengadaan from "./print/PrintLaporanPengadaan";
import PDFViewer from "./print/PDFViewer";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("TOKEN") : "");

const laporanList = [
  {
    key: "stok",
    icon: "pi pi-box",
    title: "Laporan Stok Bahan Baku",
    description:
      "Kondisi stok semua bahan baku hari ini, termasuk stok tersedia, reservasi aktif, batas minimum, dan status (Aman / Kritis / Habis).",
    color: "#6366f1",
    bg: "#eef2ff",
    badge: "Real-time",
    badgeSeverity: "info",
    ready: true,
  },
  {
    key: "jadwal",
    icon: "pi pi-calendar",
    title: "Laporan Jadwal Produksi",
    description:
      "Rekap jadwal produksi per periode, status setiap job (Pending, Scheduled, In Progress, Done, Terlambat), dan ringkasan urutan kerja per mesin.",
    color: "#0ea5e9",
    bg: "#e0f2fe",
    badge: "Per Periode",
    badgeSeverity: "info",
    ready: true,
  },
  {
    key: "mesin",
    icon: "pi pi-server",
    title: "Laporan Kinerja Mesin",
    description:
      "Utilisasi mesin, jumlah job per mesin, waktu aktif vs idle, dan performa keseluruhan setiap mesin produksi.",
    color: "#10b981",
    bg: "#ecfdf5",
    badge: "Per Mesin",
    badgeSeverity: "success",
    ready: true,
  },
  {
    key: "pengadaan",
    icon: "pi pi-shopping-cart",
    title: "Laporan Pengadaan",
    description:
      "Riwayat pengadaan bahan baku otomatis maupun manual, status pengadaan (Pending, Diproses, Selesai), dan total kebutuhan material.",
    color: "#f59e0b",
    bg: "#fffbeb",
    badge: "Riwayat",
    badgeSeverity: "warning",
    ready: true,
  },
];

const bulanOptions = [
  { label: "Januari",   value: 1  },
  { label: "Februari",  value: 2  },
  { label: "Maret",     value: 3  },
  { label: "April",     value: 4  },
  { label: "Mei",       value: 5  },
  { label: "Juni",      value: 6  },
  { label: "Juli",      value: 7  },
  { label: "Agustus",   value: 8  },
  { label: "September", value: 9  },
  { label: "Oktober",   value: 10 },
  { label: "November",  value: 11 },
  { label: "Desember",  value: 12 },
];

export default function LaporanPage() {
  const toast = useRef(null);

  const [printStokVisible, setPrintStokVisible]             = useState(false);
  const [printJadwalVisible, setPrintJadwalVisible]         = useState(false);
  const [printMesinVisible, setPrintMesinVisible]           = useState(false);
  const [printPengadaanVisible, setPrintPengadaanVisible]   = useState(false);
  const [pdfUrl, setPdfUrl]                                 = useState(null);
  const [fileName, setFileName]                             = useState("");
  const [pdfPreviewOpen, setPdfPreviewOpen]                 = useState(false);

  // State jadwal
  const [listJadwal, setListJadwal]                         = useState([]);
  const [filterMode, setFilterMode]                         = useState("all");
  const [selectedSchedules, setSelectedSchedules]           = useState([]);
  const [filterMonth, setFilterMonth]                       = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear]                         = useState(new Date().getFullYear());
  const [selectorDialogVisible, setSelectorDialogVisible]   = useState(false);
  const [schedulesForPrint, setSchedulesForPrint]           = useState([]);

  const fetchDaftarJadwal = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/schedules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setListJadwal(json.data);
    } catch (err) {
      console.error("Gagal mengambil opsi jadwal:", err);
    }
  };

  useEffect(() => {
    fetchDaftarJadwal();
  }, []);

  const yearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({
      label: String(currentYear - i),
      value: currentYear - i,
    }));
  };

  const getSchedulesForPrint = () => {
    if (filterMode === "all")      return listJadwal;
    if (filterMode === "specific") return selectedSchedules;
    if (filterMode === "month") {
      return listJadwal.filter((s) => {
        const d = new Date(s.created_at);
        return (
          d.getMonth() + 1 === filterMonth &&
          d.getFullYear() === filterYear
        );
      });
    }
    return [];
  };

  const handleGenerate = (key) => {
    if (key === "stok") {
      setPrintStokVisible(true);
      return;
    }

    if (key === "jadwal") {
      if (listJadwal.length === 0) {
        toast.current.show({
          severity: "warn",
          summary:  "Data Kosong",
          detail:   "Tidak ditemukan master data jadwal untuk dicetak.",
          life:     3000,
        });
        return;
      }
      setSelectorDialogVisible(true);
      return;
    }

    if (key === "mesin") {
      setPrintMesinVisible(true);
      return;
    }

    if (key === "pengadaan") {
      setPrintPengadaanVisible(true);
      return;
    }

    toast.current.show({
      severity: "info",
      summary:  "Segera Hadir",
      detail:   "Laporan ini sedang dalam pengembangan.",
      life:     3000,
    });
  };

  const handleLanjutkan = () => {
    const hasil = getSchedulesForPrint();
    if (hasil.length === 0) {
      toast.current.show({
        severity: "warn",
        summary:  "Tidak Ada Jadwal",
        detail:
          filterMode === "month"
            ? "Tidak ada jadwal di bulan/tahun yang dipilih."
            : "Pilih minimal satu jadwal.",
        life: 3000,
      });
      return;
    }
    setSchedulesForPrint(hasil);
    setSelectorDialogVisible(false);
    setPrintJadwalVisible(true);
  };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });

  return (
    <div>
      <Toast ref={toast} />

      {/* HEADER */}
      <div className="mb-4">
        <h2 className="m-0 mb-1">Laporan Admin</h2>
        <p className="m-0 text-color-secondary text-sm">{today}</p>
      </div>

      {/* KARTU LAPORAN */}
      <div className="grid">
        {laporanList.map((item) => (
          <div key={item.key} className="col-12 md:col-6">
            <div
              className="card p-4 h-full flex flex-column"
              style={{ borderTop: `3px solid ${item.color}`, gap: 0 }}
            >
              <div className="flex align-items-center justify-content-between mb-3">
                <div
                  className="flex align-items-center justify-content-center border-round"
                  style={{ width: 44, height: 44, background: item.bg }}
                >
                  <i
                    className={item.icon}
                    style={{ fontSize: "1.3rem", color: item.color }}
                  />
                </div>
                <Tag
                  value={item.badge}
                  severity={item.badgeSeverity}
                  style={{ fontSize: "0.7rem" }}
                />
              </div>

              <div
                className="font-semibold mb-2"
                style={{ fontSize: "0.95rem", color: "var(--text-color)" }}
              >
                {item.title}
              </div>

              <p
                className="text-color-secondary text-sm m-0 mb-4"
                style={{ lineHeight: 1.6, flexGrow: 1 }}
              >
                {item.description}
              </p>

              <div className="flex align-items-center justify-content-between">
                {item.ready ? (
                  <Button
                    label="Generate PDF"
                    icon="pi pi-print"
                    size="small"
                    onClick={() => handleGenerate(item.key)}
                    style={{ background: item.color, borderColor: item.color }}
                  />
                ) : (
                  <Button
                    label="Segera Hadir"
                    icon="pi pi-clock"
                    size="small"
                    disabled
                    className="p-button-secondary p-button-outlined"
                  />
                )}
                {item.ready && (
                  <span className="text-xs text-color-secondary">
                    <i
                      className="pi pi-check-circle mr-1"
                      style={{ color: "#22c55e" }}
                    />
                    Siap digunakan
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DIALOG FILTER JADWAL */}
      <Dialog
        header="Filter Jadwal Produksi"
        visible={selectorDialogVisible}
        style={{ width: "460px" }}
        modal
        onHide={() => setSelectorDialogVisible(false)}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button
              label="Batal"
              text
              onClick={() => setSelectorDialogVisible(false)}
            />
            <Button
              label="Lanjutkan"
              icon="pi pi-arrow-right"
              onClick={handleLanjutkan}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">

          {/* MODE FILTER */}
          <div>
            <label className="font-semibold text-sm block mb-2">
              Tampilkan Jadwal
            </label>
            <div className="flex flex-column gap-2">
              {[
                { value: "all",      label: "Semua Jadwal"    },
                { value: "specific", label: "Jadwal Tertentu" },
                { value: "month",    label: "Per Bulan"       },
              ].map((opt) => (
                <div key={opt.value} className="flex align-items-center gap-2">
                  <RadioButton
                    inputId={`mode_${opt.value}`}
                    value={opt.value}
                    onChange={(e) => {
                      setFilterMode(e.value);
                      setSelectedSchedules([]);
                    }}
                    checked={filterMode === opt.value}
                  />
                  <label
                    htmlFor={`mode_${opt.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* MODE: SPECIFIC */}
          {filterMode === "specific" && (
            <div className="p-fluid">
              <label className="font-semibold text-sm block mb-2">
                Pilih Kode Jadwal
              </label>
              <MultiSelect
                value={selectedSchedules}
                options={listJadwal}
                onChange={(e) => setSelectedSchedules(e.value)}
                optionLabel="schedule_code"
                placeholder="Pilih satu atau lebih jadwal"
                filter
                display="chip"
                maxSelectedLabels={3}
              />
            </div>
          )}

          {/* MODE: MONTH */}
          {filterMode === "month" && (
            <div className="p-fluid">
              <label className="font-semibold text-sm block mb-2">
                Pilih Bulan & Tahun
              </label>
              <div className="grid">
                <div className="col-8">
                  <Dropdown
                    value={filterMonth}
                    options={bulanOptions}
                    onChange={(e) => setFilterMonth(e.value)}
                    placeholder="Bulan"
                  />
                </div>
                <div className="col-4">
                  <Dropdown
                    value={filterYear}
                    options={yearOptions()}
                    onChange={(e) => setFilterYear(e.value)}
                    placeholder="Tahun"
                  />
                </div>
              </div>
              <p className="text-sm text-color-secondary mt-2 mb-0">
                <i className="pi pi-info-circle mr-1" />
                {(() => {
                  const count = listJadwal.filter((s) => {
                    const d = new Date(s.created_at);
                    return (
                      d.getMonth() + 1 === filterMonth &&
                      d.getFullYear() === filterYear
                    );
                  }).length;
                  return count > 0
                    ? `${count} jadwal ditemukan untuk periode ini.`
                    : "Tidak ada jadwal di periode ini.";
                })()}
              </p>
            </div>
          )}

          {/* MODE: ALL */}
          {filterMode === "all" && (
            <p className="text-sm text-color-secondary m-0">
              <i className="pi pi-info-circle mr-1" />
              {listJadwal.length} jadwal akan dimasukkan ke dalam laporan.
            </p>
          )}
        </div>
      </Dialog>

      {/* DIALOG KONFIGURASI STOK */}
      <PrintLaporanStok
        visible={printStokVisible}
        onHide={() => setPrintStokVisible(false)}
        setPdfUrl={setPdfUrl}
        setFileName={setFileName}
        setJsPdfPreviewOpen={setPdfPreviewOpen}
      />

      {/* DIALOG KONFIGURASI JADWAL */}
      <PrintLaporanJadwal
        visible={printJadwalVisible}
        onHide={() => setPrintJadwalVisible(false)}
        scheduleList={schedulesForPrint}
        setPdfUrl={setPdfUrl}
        setFileName={setFileName}
        setJsPdfPreviewOpen={setPdfPreviewOpen}
      />

      {/* DIALOG KONFIGURASI MESIN */}
      <PrintLaporanMesin
        visible={printMesinVisible}
        onHide={() => setPrintMesinVisible(false)}
        setPdfUrl={setPdfUrl}
        setFileName={setFileName}
        setJsPdfPreviewOpen={setPdfPreviewOpen}
      />

      {/* DIALOG KONFIGURASI PENGADAAN */}
      <PrintLaporanPengadaan
        visible={printPengadaanVisible}
        onHide={() => setPrintPengadaanVisible(false)}
        setPdfUrl={setPdfUrl}
        setFileName={setFileName}
        setJsPdfPreviewOpen={setPdfPreviewOpen}
      />

      {/* DIALOG PREVIEW PDF */}
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
        modal
        maximizable
        contentStyle={{ padding: 0, height: "calc(92vh - 60px)" }}
      >
        <PDFViewer pdfUrl={pdfUrl} fileName={fileName} />
      </Dialog>
    </div>
  );
}