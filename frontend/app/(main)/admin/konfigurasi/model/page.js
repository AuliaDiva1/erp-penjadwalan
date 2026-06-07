'use client';
import { useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';

export default function ModelPrediksiPage() {
  const toast = useRef(null);

  const pipeline = [
    {
      step: '1',
      label: 'Penentuan Deadline',
      metode: 'Rule-Based',
      color: '#6366f1',
      deskripsi: 'Deadline dihitung deterministik: Deadline = Scheduled_Start + Processing_Time. Tidak memerlukan model machine learning.',
      input: ['Processing Time (menit)', 'Scheduled Start'],
      output: 'Deadline otomatis per job',
    },
    {
      step: '2',
      label: 'Penilaian Prioritas',
      metode: 'Fuzzy Mamdani',
      color: '#f59e0b',
      deskripsi: 'Skor prioritas dihitung menggunakan 27 rules inferensi fuzzy dengan defuzzifikasi centroid dan pembobotan operation type.',
      input: ['Processing Time', 'Energy Consumption', 'Machine Availability', 'Operation Type'],
      output: 'Skor prioritas 0–100',
    },
    {
      step: '3',
      label: 'Optimasi Penjadwalan',
      metode: 'CCEA + SADS',
      color: '#22c55e',
      deskripsi: 'Cooperative Co-Evolution Algorithm dengan Self-Adaptive Decomposition Strategy mengoptimalkan urutan job dan alokasi mesin untuk meminimalkan makespan.',
      input: ['Skor prioritas Fuzzy', 'Processing Time', 'Daftar mesin', 'Deadline'],
      output: 'Jadwal optimal + Makespan minimal',
    },
  ];

  return (
    <div>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Informasi Pipeline Penjadwalan</h2>
        <p className="m-0 text-color-secondary text-sm">
          Pipeline terpadu: Rule-Based Deadline → Fuzzy Mamdani → CCEA
        </p>
      </div>

      {/* INFO BANNER */}
      <div
        className="card p-4 mb-4 flex align-items-start gap-3"
        style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
      >
        <i className="pi pi-info-circle mt-1" style={{ color: '#3b82f6', fontSize: '1.2rem' }} />
        <div className="text-sm" style={{ color: '#1e40af' }}>
          <b>Cara kerja pipeline:</b> Sistem tidak menggunakan model machine learning yang dilatih secara offline.
          Seluruh proses berjalan menggunakan algoritma deterministik (rule-based deadline)
          dan algoritma komputasi cerdas (Fuzzy Mamdani + CCEA) yang tidak memerlukan training data.
          Parameter dapat dikonfigurasi melalui halaman Konfigurasi.
        </div>
      </div>

      {/* PIPELINE STEPS */}
      <div className="grid">
        {pipeline.map((p) => (
          <div key={p.step} className="col-12 lg:col-4">
            <div className="card h-full" style={{ borderTop: `4px solid ${p.color}` }}>
              <div className="flex align-items-center gap-2 mb-3">
                <div
                  className="flex align-items-center justify-content-center border-circle font-bold text-white"
                  style={{ width: '2rem', height: '2rem', background: p.color, fontSize: '0.9rem' }}
                >
                  {p.step}
                </div>
                <div>
                  <div className="font-semibold">{p.label}</div>
                  <Tag value={p.metode} style={{ background: p.color, fontSize: '0.7rem' }} />
                </div>
              </div>

              <p className="text-sm text-color-secondary mb-3">{p.deskripsi}</p>

              <div className="mb-3">
                <div className="text-xs font-semibold mb-2 text-color-secondary">INPUT</div>
                {p.input.map((inp, i) => (
                  <div key={i} className="flex align-items-center gap-2 mb-1">
                    <i className="pi pi-arrow-right text-xs" style={{ color: p.color }} />
                    <span className="text-sm">{inp}</span>
                  </div>
                ))}
              </div>

              <div
                className="p-2 border-round text-sm"
                style={{ background: 'var(--surface-ground)' }}
              >
                <span className="text-color-secondary text-xs font-semibold">OUTPUT: </span>
                <span className="font-semibold text-sm">{p.output}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PARAMETER SUMMARY */}
      <div className="card mt-2">
        <h3 className="mt-0 mb-3">Parameter Algoritma</h3>
        <div className="grid">
          {[
            { label: 'Fuzzy Rules',         value: '27 rules',         sub: '3 variabel × 3 himpunan' },
            { label: 'Metode Defuzzifikasi', value: 'Centroid',         sub: 'Center of Gravity'       },
            { label: 'CCEA Populasi',        value: '100 individu',     sub: 'Default, dapat diubah'   },
            { label: 'CCEA Iterasi',         value: '1000 generasi',    sub: 'Default, dapat diubah'   },
            { label: 'Crossover Rate',       value: '80%',              sub: 'OX Crossover'            },
            { label: 'Mutation Rate',        value: '20%',              sub: 'Insertion Mutation'      },
            { label: 'Dekomposisi',          value: 'SADS',             sub: 'Self-Adaptive'           },
            { label: 'Elitism Rate',         value: '20%',              sub: 'Top individu dipertahankan' },
          ].map((item, i) => (
            <div key={i} className="col-12 md:col-6 lg:col-3">
              <div className="p-3 border-round" style={{ background: 'var(--surface-ground)' }}>
                <div className="text-xs text-color-secondary mb-1">{item.label}</div>
                <div className="font-bold mb-1">{item.value}</div>
                <div className="text-xs text-color-secondary">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}