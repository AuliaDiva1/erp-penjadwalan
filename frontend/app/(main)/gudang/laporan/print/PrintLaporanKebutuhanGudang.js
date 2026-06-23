'use client';
import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const paperSizes = [
  { name: 'A4',     value: 'A4'        },
  { name: 'F4',     value: [215, 330]  },
  { name: 'Letter', value: 'Letter'    },
];

const orientationOptions = [
  { label: 'Portrait',  value: 'portrait'  },
  { label: 'Landscape', value: 'landscape' },
];

const periodeOptions = [
  { label: 'Mingguan', value: 'mingguan' },
  { label: 'Bulanan',  value: 'bulanan'  },
  { label: 'Keduanya', value: 'keduanya' },
];

export default function PrintLaporanRekomendasiGudang({
  visible, onHide, setPdfUrl, setFileName, setJsPdfPreviewOpen, data = [],
}) {
  const [loading, setLoading] = useState(false);
  const [config,  setConfig]  = useState({
    paperSize:   'A4',
    orientation: 'landscape',
    marginTop:   15,
    marginBottom: 15,
    marginLeft:  15,
    marginRight: 15,
    periode:     'keduanya',
  });

  const set = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: config.orientation,
      unit:        'mm',
      format:      config.paperSize,
    });

    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const mL = config.marginLeft;
    const mT = config.marginTop;
    const mR = config.marginRight;
    const mB = config.marginBottom;

    const today      = new Date();
    const todayStr   = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const generatedAt = today.toLocaleString('id-ID');

    let y = mT;

    /* kop */
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(mL, y, 14, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('J', mL + 7, y + 9.5, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('JADWALIN — Sistem Penjadwalan Produksi', pw / 2, y + 5, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Laporan Rekomendasi Pengadaan Bahan Baku', pw / 2, y + 10, { align: 'center' });

    y += 18;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pw - mR, y);
    y += 5;

    /* judul */
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('REKOMENDASI PENGADAAN BAHAN BAKU', pw / 2, y + 5, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Berdasarkan histori pemakaian produksi 90 hari terakhir  |  ${todayStr}`, pw / 2, y + 11, { align: 'center' });
    doc.text(`Dicetak pada: ${generatedAt}`, pw / 2, y + 16, { align: 'center' });
    y += 22;

    /* summary boxes */
    const total  = data.length;
    const urgent = data.filter(d => d.perlu_pengadaan).length;
    const aman   = data.filter(d => !d.perlu_pengadaan).length;

    const summaryItems = [
      { label: 'Total Material',  value: total,  color: [99,  102, 241] },
      { label: 'Perlu Pengadaan', value: urgent, color: [239, 68,  68]  },
      { label: 'Stok Aman',       value: aman,   color: [34,  197, 94]  },
    ];

    const boxW = (pw - mL - mR - 6) / 3;
    summaryItems.forEach((item, i) => {
      const bx = mL + i * (boxW + 3);
      doc.setFillColor(...item.color);
      doc.roundedRect(bx, y, boxW, 14, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.value), bx + boxW / 2, y + 7, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, bx + boxW / 2, y + 12, { align: 'center' });
    });
    y += 20;

    /* tabel */
    const showMinggu  = config.periode === 'mingguan'  || config.periode === 'keduanya';
    const showBulanan = config.periode === 'bulanan'   || config.periode === 'keduanya';

    const head = ['No', 'Kode', 'Nama Bahan Baku', 'Sat', 'Stok Saat Ini', 'Rata/Hari', 'Stok Cukup'];
    if (showMinggu)  head.push('Rek. Mingguan');
    if (showBulanan) head.push('Rek. Bulanan');
    head.push('Status');

    const rows = data.map((d, idx) => {
      const row = [
        idx + 1,
        d.kode_bahan_baku,
        d.material_name,
        d.nama_satuan,
        d.current_stock,
        d.rata_per_hari,
        d.stok_cukup_hari >= 999 ? '∞' : `${d.stok_cukup_hari} hari`,
      ];
      if (showMinggu)  row.push(`${d.rek_mingguan} ${d.nama_satuan}`);
      if (showBulanan) row.push(`${d.rek_bulanan} ${d.nama_satuan}`);
      row.push(d.perlu_pengadaan ? 'Perlu Pengadaan' : 'Aman');
      return row;
    });

    const statusColIdx = head.length - 1;

    autoTable(doc, {
      startY: y,
      head:   [head],
      body:   rows,
      margin: { left: mL, right: mR, bottom: mB + 8 },
      styles:     { fontSize: 8, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
      },
      bodyStyles: { textColor: [30, 30, 30] },
      didParseCell(d) {
        if (d.section === 'body') {
          if (d.column.index === statusColIdx) {
            d.cell.styles.fontStyle = 'bold';
            d.cell.styles.textColor = d.cell.raw === 'Perlu Pengadaan' ? [239, 68, 68] : [34, 197, 94];
          }
          if (d.column.index === 6) {
            const val = d.cell.raw;
            if (val !== '∞' && parseInt(val) <= 7)  d.cell.styles.textColor = [239, 68, 68];
            if (val !== '∞' && parseInt(val) <= 14) d.cell.styles.textColor = [245, 158, 11];
          }
          const row = data[d.row.index];
          if (row?.perlu_pengadaan) d.cell.styles.fillColor = [254, 242, 242];
        }
      },
      didDrawPage({ pageNumber }) {
        const count = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Halaman ${pageNumber} dari ${count}  |  Jadwalin ERP — Gudang`, pw - mR, ph - 6, { align: 'right' });
      },
    });

    /* catatan */
    let noteY = doc.lastAutoTable.finalY + 8;
    if (noteY > ph - mB - 40) { doc.addPage(); noteY = mT + 5; }
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Catatan: Rekomendasi dihitung dari rata-rata pemakaian harian × 7 (mingguan) atau × 30 (bulanan). Data diambil dari histori pemakaian produksi 90 hari terakhir.',
      mL, noteY, { maxWidth: pw - mL - mR }
    );

    /* ttd */
    let ttdY = noteY + 16;
    if (ttdY > ph - mB - 35) { doc.addPage(); ttdY = mT + 5; }
    const ttdX = pw - mR - 55;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.text(`Madiun, ${todayStr}`, ttdX, ttdY);
    doc.text('Mengetahui,',         ttdX, ttdY + 5);
    doc.text('Kepala Gudang,',      ttdX, ttdY + 10);
    ttdY += 28;
    doc.setFont('helvetica', 'bold');
    doc.text('( __________________ )', ttdX, ttdY);

    return doc;
  };

  const handleGenerate = () => {
    if (!data.length) { alert('Tidak ada data rekomendasi.'); return; }
    setLoading(true);
    try {
      const doc     = generatePDF();
      const dateTag = new Date().toISOString().split('T')[0];
      const name    = `Laporan_Rekomendasi_Pengadaan_${dateTag}.pdf`;
      setPdfUrl(doc.output('datauristring'));
      setFileName(name);
      setJsPdfPreviewOpen(true);
      onHide();
    } catch (err) {
      alert('Gagal generate laporan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex justify-content-end gap-2">
      <Button label="Batal" icon="pi pi-times" severity="secondary" onClick={onHide} />
      <Button
        label="Generate PDF"
        icon="pi pi-print"
        onClick={handleGenerate}
        loading={loading}
        style={{ background: '#10b981', borderColor: '#10b981' }}
      />
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-calendar-plus" style={{ color: '#10b981' }} />
          <span>Cetak Laporan Rekomendasi Pengadaan</span>
        </div>
      }
      style={{ width: '440px' }}
      modal footer={footer} draggable={false} dismissableMask
    >
      <div className="grid p-fluid">
        <div className="col-12">
          <p className="text-color-secondary text-sm mt-0">
            Laporan memuat rekomendasi qty pengadaan berdasarkan rata-rata pemakaian produksi 90 hari terakhir.
          </p>
        </div>

        <div className="col-12">
          <div className="field">
            <label className="font-semibold text-sm">Tampilkan Periode</label>
            <Dropdown
              value={config.periode}
              options={periodeOptions}
              onChange={(e) => set('periode', e.value)}
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
              onChange={(e) => set('paperSize', e.value)}
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
              onChange={(e) => set('orientation', e.value)}
              optionLabel="label"
            />
          </div>
        </div>

        <div className="col-12">
          <label className="font-semibold text-sm">Margin (mm)</label>
        </div>
        {[['marginTop','Atas'],['marginBottom','Bawah'],['marginLeft','Kiri'],['marginRight','Kanan']].map(([key, label]) => (
          <div key={key} className="col-6">
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon" style={{ minWidth: 52 }}>{label}</span>
              <InputNumber value={config[key]} onValueChange={(e) => set(key, e.value ?? 0)} min={0} max={50} />
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}