'use client';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';

const statusConfig = {
  draft:    { label: 'Draft',    severity: 'secondary' },
  final:    { label: 'Final',    severity: 'success'   },
  revised:  { label: 'Revised',  severity: 'warning'   },
};

const DetailJadwal = ({ visible, onHide, data }) => {
  if (!data) return null;
  const st = statusConfig[data.status_jadwal] || { label: data.status_jadwal, severity: 'info' };

  const Row = ({ label, value }) => (
    <div className="flex justify-content-between align-items-center py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <span className="text-color-secondary text-sm font-medium">{label}</span>
      <span className="font-semibold text-sm">{value ?? '-'}</span>
    </div>
  );

  return (
    <Dialog
      header={`Detail Jadwal — ${data.schedule_code}`}
      visible={visible}
      style={{ width: '500px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-3">
        <div className="flex justify-content-between align-items-center mb-4 p-3 border-round" style={{ background: '#f8fafc' }}>
          <div>
            <div className="text-2xl font-bold">{data.schedule_code}</div>
            <div className="text-color-secondary text-sm mt-1">Jadwal Produksi</div>
          </div>
          <Tag value={st.label} severity={st.severity} style={{ fontSize: '0.85rem', padding: '6px 14px' }} />
        </div>

        <div className="mb-4">
          <div className="text-xs font-bold text-color-secondary mb-2 uppercase" style={{ letterSpacing: '0.08em' }}>Statistik</div>
          <Row label="Makespan" value={`${data.makespan} menit`} />
          <Row label="Total Jobs" value={data.total_jobs} />
          <Row label="Total Mesin" value={data.total_machines} />
          <Row label="Revisi ke-" value={data.revision_count || 0} />
          <Row label="Status Final" value={data.is_final ? '✅ Final' : '❌ Belum Final'} />
        </div>

        <div className="mb-4">
          <div className="text-xs font-bold text-color-secondary mb-2 uppercase" style={{ letterSpacing: '0.08em' }}>Validasi</div>
          <Row label="Divalidasi oleh" value={data.validated_by_name} />
          <Row label="Waktu Validasi" value={data.validated_at ? new Date(data.validated_at).toLocaleString('id-ID') : '-'} />
        </div>

        {data.revision_note && (
          <div className="mb-4">
            <div className="text-xs font-bold text-color-secondary mb-2 uppercase" style={{ letterSpacing: '0.08em' }}>Catatan Revisi</div>
            <div className="p-3 border-round text-sm" style={{ background: '#fff8e1', border: '1px solid #ffe082' }}>
              {data.revision_note}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-bold text-color-secondary mb-2 uppercase" style={{ letterSpacing: '0.08em' }}>Waktu</div>
          <Row label="Dibuat" value={new Date(data.created_at).toLocaleString('id-ID')} />
          <Row label="Diperbarui" value={new Date(data.updated_at).toLocaleString('id-ID')} />
        </div>

        <div className="flex justify-content-end mt-4">
          <Button label="Tutup" icon="pi pi-times" className="p-button-text" onClick={onHide} />
        </div>
      </div>
    </Dialog>
  );
};

export default DetailJadwal;