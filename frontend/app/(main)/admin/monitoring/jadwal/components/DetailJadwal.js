// DetailJadwal.jsx
'use client';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';

const STATUS_CONFIG = {
  draft:   { label: 'Draft',   severity: 'secondary' },
  final:   { label: 'Final',   severity: 'success'   },
  revised: { label: 'Revised', severity: 'warning'   },
};

const formatDate = (val) =>
  val ? new Date(val).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '-';

const InfoRow = ({ label, value }) => (
  <div className="flex justify-content-between py-2"
    style={{ borderBottom: '1px solid var(--surface-border)' }}>
    <span className="text-color-secondary text-sm">{label}</span>
    <span className="font-semibold text-sm">{value ?? '-'}</span>
  </div>
);

export default function DetailJadwal({
  visible, onHide, data,
  onValidasi, onRevisi,
  actionLoading,
}) {
  if (!data) return null;
  const s = STATUS_CONFIG[data.status_jadwal] || { label: data.status_jadwal, severity: 'info' };

  return (
    <Dialog
      header={`Detail — ${data.schedule_code}`}
      visible={visible}
      style={{ width: '480px' }}
      modal onHide={onHide}
      draggable={false} dismissableMask
    >
      <div>
        <div className="flex justify-content-between align-items-center p-3 border-round mb-3"
          style={{ background: 'var(--surface-ground)' }}>
          <div>
            <div className="text-xl font-bold">{data.schedule_code}</div>
            <div className="text-color-secondary text-sm">Jadwal Produksi</div>
          </div>
          <Tag value={s.label} severity={s.severity} />
        </div>

        <InfoRow label="Makespan"       value={`${data.makespan} menit`}       />
        <InfoRow label="Total Jobs"     value={data.total_jobs}                 />
        <InfoRow label="Total Mesin"    value={data.total_machines}             />
        <InfoRow label="Revisi ke-"     value={data.revision_count || 0}        />
        <InfoRow label="Divalidasi"     value={data.validated_by_name || '-'}   />
        <InfoRow label="Waktu Validasi" value={formatDate(data.validated_at)}   />
        <InfoRow label="Dibuat"         value={formatDate(data.created_at)}     />
        <InfoRow label="Diperbarui"     value={formatDate(data.updated_at)}     />

        {data.revision_note && (
          <div className="mt-3 p-3 border-round text-sm"
            style={{ background: '#fff8e1', border: '1px solid #ffe082' }}>
            <div className="font-semibold mb-1 text-xs text-color-secondary uppercase">Catatan Revisi</div>
            {data.revision_note}
          </div>
        )}

        <div className="flex justify-content-end gap-2 mt-4">
          {!data.is_final && (
            <Button label="Validasi" icon="pi pi-check" severity="success"
              onClick={onValidasi} loading={actionLoading} />
          )}
          {data.is_final && (
            <Button label="Ajukan Revisi" icon="pi pi-replay" severity="warning"
              onClick={onRevisi} />
          )}
          <Button label="Tutup" icon="pi pi-times" text onClick={onHide} />
        </div>
      </div>
    </Dialog>
  );
}