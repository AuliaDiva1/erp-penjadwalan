'use client';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';

const statusConfig = {
  on_track:  { label: 'On Track',  severity: 'success' },
  delayed:   { label: 'Terlambat', severity: 'danger'  },
  completed: { label: 'Selesai',   severity: 'info'    },
  pending:   { label: 'Menunggu',  severity: 'warning' },
};

const jadwalStatusConfig = {
  draft:   { label: 'Draft',   severity: 'secondary' },
  final:   { label: 'Final',   severity: 'success'   },
  revised: { label: 'Revised', severity: 'warning'   },
};

const SectionTitle = ({ label }) => (
  <div
    className="text-xs font-semibold text-color-secondary uppercase mb-2 mt-3"
    style={{ letterSpacing: '0.07em' }}
  >
    {label}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div
    className="flex justify-content-between align-items-center py-2"
    style={{ borderBottom: '1px solid var(--surface-border)' }}
  >
    <span className="text-color-secondary text-sm">{label}</span>
    <span className="text-sm font-medium">{value ?? '-'}</span>
  </div>
);

const StatCard = ({ label, value, unit }) => (
  <div
    className="flex flex-column align-items-center justify-content-center border-round p-3 gap-1"
    style={{ background: 'var(--surface-ground)', flex: '1 1 0', minWidth: 0 }}
  >
    <span className="text-xl font-semibold">
      {value ?? '-'}
      {unit && (
        <span className="text-xs font-normal text-color-secondary ml-1">{unit}</span>
      )}
    </span>
    <span className="text-xs text-color-secondary text-center">{label}</span>
  </div>
);

const DetailJadwal = ({ visible, onHide, data }) => {
  if (!data) return null;

  const st  = statusConfig[data.progress_status]      || { label: data.progress_status,  severity: 'info' };
  const jst = jadwalStatusConfig[data.status_jadwal]  || { label: data.status_jadwal,     severity: 'info' };

  const pct        = data.progress_pct ?? 0;
  const progressColor =
    data.progress_status === 'delayed'   ? '#ef4444' :
    data.progress_status === 'completed' ? '#6366f1' : '#22c55e';

  const formatDate = (val) =>
    val
      ? new Date(val).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '-';

  const formatDateOnly = (val) =>
    val
      ? new Date(val).toLocaleDateString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : '-';

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-calendar text-primary" />
          <span>Detail Jadwal</span>
          <Tag value={jst.label} severity={jst.severity} className="ml-2" style={{ fontSize: '0.75rem' }} />
        </div>
      }
      visible={visible}
      style={{ width: '500px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="px-1">

        {/* KODE + PROGRESS STATUS */}
        <div
          className="flex justify-content-between align-items-center p-3 border-round mb-3"
          style={{ background: 'var(--surface-ground)' }}
        >
          <div>
            <div className="text-xl font-semibold" style={{ letterSpacing: '-0.3px' }}>
              {data.schedule_code}
            </div>
            <div className="text-color-secondary text-sm mt-1">Jadwal Produksi</div>
          </div>
          <Tag value={st.label} severity={st.severity} />
        </div>

        {/* PROGRESS BAR */}
        <div className="mb-4">
          <div className="flex justify-content-between align-items-center mb-2">
            <span className="text-sm text-color-secondary">Realisasi Progress</span>
            <span className="text-sm font-semibold">{pct}%</span>
          </div>
          <ProgressBar
            value={pct}
            showValue={false}
            style={{ height: '8px', borderRadius: '999px', background: 'var(--surface-border)' }}
            color={progressColor}
          />
        </div>

        {/* STAT CARDS */}
        <div className="flex gap-2 mb-4">
          <StatCard label="Makespan"    value={data.makespan}       unit="menit" />
          <StatCard label="Total Jobs"  value={data.total_jobs} />
          <StatCard label="Total Mesin" value={data.total_machines} />
          <StatCard label="Revisi ke-"  value={data.revision_count ?? 0} />
        </div>

        {/* RENTANG JADWAL */}
        <SectionTitle label="Rentang Jadwal" />
        <InfoRow label="Tanggal Mulai"   value={formatDateOnly(data.start_date)} />
        <InfoRow label="Tanggal Selesai" value={formatDateOnly(data.end_date)} />

        {/* VALIDASI */}
        <SectionTitle label="Informasi Validasi" />
        <InfoRow label="Status Final"    value={data.is_final ? 'Sudah Final' : 'Belum Final'} />
        <InfoRow label="Divalidasi Oleh" value={data.validated_by_name} />
        <InfoRow label="Waktu Validasi"  value={formatDate(data.validated_at)} />

        {/* CATATAN REVISI */}
        {data.revision_note && (
          <>
            <SectionTitle label="Catatan Revisi" />
            <div
              className="p-3 border-round text-sm line-height-3"
              style={{ background: 'var(--yellow-50)', border: '1px solid var(--yellow-200)', color: 'var(--yellow-900)' }}
            >
              {data.revision_note}
            </div>
          </>
        )}

        {/* WAKTU SISTEM */}
        <SectionTitle label="Waktu Sistem" />
        <InfoRow label="Dibuat"      value={formatDate(data.created_at)} />
        <InfoRow label="Diperbarui"  value={formatDate(data.updated_at)} />

        <div className="flex justify-content-end mt-4">
          <Button
            label="Tutup"
            icon="pi pi-times"
            className="p-button-text"
            onClick={onHide}
          />
        </div>

      </div>
    </Dialog>
  );
};

export default DetailJadwal;