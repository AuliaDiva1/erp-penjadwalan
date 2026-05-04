'use client';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import FormInputJob from './components/FormInputJob';

export default function InputJobBaruPage() {
  const router = useRouter();

  return (
    <div>
      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Input Job Baru</h2>
          <p className="m-0 text-color-secondary text-sm">
            Tambah job produksi baru ke dalam sistem
          </p>
        </div>
        <Button
          label="Lihat Riwayat"
          icon="pi pi-list"
          severity="secondary"
          text
          onClick={() => router.push('/manajer/job')}
        />
      </div>

      <div className="card p-3 mb-4 flex align-items-start gap-3"
        style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <i className="pi pi-info-circle mt-1" style={{ color: '#3b82f6' }} />
        <div className="text-sm" style={{ color: '#1e40af' }}>
          Setelah job ditambahkan dengan status <b>Pending</b>, jalankan pipeline algoritma
          untuk mendapatkan jadwal optimal. Sistem akan otomatis memeriksa ketersediaan stok
          bahan baku dan memprediksi deadline via Random Forest.
        </div>
      </div>

      <FormInputJob />
    </div>
  );
}