'use client';
import { Dialog }  from 'primereact/dialog';
import { Tag }     from 'primereact/tag';
import { Divider } from 'primereact/divider';

const STATUS_SEVERITY = {
  Pending:       'warning',
  Scheduled:     'info',
  'In Progress': 'success',
  Completed:     'success',
  Delayed:       'danger',
  Failed:        'danger',
};

// ← DIUBAH: tambah timeZone WIB
const fmt = (val) =>
  val ? new Date(val).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Jakarta',
  }) : '-';

const fmtBool = (val) => (
  <Tag
    value={val ? 'Ya' : 'Tidak'}
    severity={val ? 'success' : 'secondary'}
    style={{ fontSize: '0.75rem' }}
  />
);

const SectionTitle = ({ icon, title }) => (
  <div className="flex align-items-center gap-2 mb-3">
    <i className={`pi ${icon}`} style={{ color: 'var(--primary-color)', fontSize: '0.95rem' }} />
    <span className="font-bold text-sm" style={{ color: 'var(--primary-color)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {title}
    </span>
  </div>
);

const Row = ({ label, value }) => (
  <div
    className="flex justify-content-between align-items-center py-2"
    style={{ borderBottom: '1px solid var(--surface-border)' }}
  >
    <span className="text-color-secondary text-sm" style={{ minWidth: '200px' }}>{label}</span>
    <span className="font-medium text-right text-sm">{value ?? '-'}</span>
  </div>
);

const Section = ({ children }) => (
  <div className="border-round p-3 mb-3" style={{ background: 'var(--surface-ground)' }}>
    {children}
  </div>
);

export default function JobDetailDialog({ visible, onHide, job }) {
  if (!job) return null;

  const durasiAktual = job.actual_start && job.actual_end
    ? Math.round((new Date(job.actual_end) - new Date(job.actual_start)) / 60000)
    : null;

  const durasiJadwal = job.scheduled_start && job.scheduled_end
    ? Math.round((new Date(job.scheduled_end) - new Date(job.scheduled_start)) / 60000)
    : null;

  const selisih = durasiAktual && durasiJadwal ? durasiAktual - durasiJadwal : null;

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2 flex-wrap">
          <span className="font-bold" style={{ fontSize: '1rem' }}>Detail Job</span>
          <span className="text-color-secondary font-normal">—</span>
          <span className="font-bold" style={{ color: 'var(--primary-color)' }}>{job.job_id}</span>
          <Tag value={job.job_status} severity={STATUS_SEVERITY[job.job_status] || 'info'} style={{ fontSize: '0.75rem' }} />
          {job.is_urgent       && <Tag value="URGENT"    severity="danger" style={{ fontSize: '0.75rem' }} />}
          {job.deadline_warning && <Tag value="TERLAMBAT" severity="danger" style={{ fontSize: '0.75rem', background: '#7c2d12' }} />}
        </div>
      }
      visible={visible}
      style={{ width: '700px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div style={{ maxHeight: '76vh', overflowY: 'auto', paddingRight: '4px' }}>

        <Section>
          <SectionTitle icon="pi-id-card" title="Identitas Job" />
          <Row label="Job ID"             value={job.job_id} />
          <Row label="Operation Type"     value={job.operation_type} />
          <Row label="Machine ID"         value={job.machine_id} />
          <Row label="Assigned Machine"   value={job.assigned_machine_id ?? '-'} />
          <Row label="Material ID"        value={job.material_id} />
          <Row label="Material Digunakan" value={job.material_used ? `${job.material_used} unit` : '-'} />
        </Section>

        <Section>
          <SectionTitle icon="pi-cog" title="Parameter Teknis" />
          <Row label="Processing Time"      value={`${job.processing_time} menit`} />
          <Row label="Energy Consumption"   value={`${job.energy_consumption} kWh`} />
          <Row label="Machine Availability" value={`${job.machine_availability}%`} />
          <Row label="Makespan"             value={job.makespan ? `${job.makespan} menit` : '-'} />
        </Section>

        <Section>
          <SectionTitle icon="pi-calendar-times" title="Deadline" />
          <Row label="Deadline"           value={fmt(job.deadline)} />
          <Row label="Deadline Customer"  value={fmt(job.deadline_customer)} />
          <Row label="Deadline Predicted" value={fmt(job.deadline_predicted)} />
          <Row label="Deadline Manual"    value={fmtBool(job.deadline_is_manual)} />
          <Row
            label="Deadline Warning"
            value={
              job.deadline_warning
                ? <Tag value="Terlewat" severity="danger"  style={{ fontSize: '0.75rem' }} />
                : <Tag value="Aman"     severity="success" style={{ fontSize: '0.75rem' }} />
            }
          />
        </Section>

        <Section>
          <SectionTitle icon="pi-calendar" title="Jadwal" />
          <Row label="Scheduled Start" value={fmt(job.scheduled_start)} />
          <Row label="Scheduled End"   value={fmt(job.scheduled_end)} />
          <Row label="Durasi Jadwal"   value={durasiJadwal ? `${durasiJadwal} menit` : '-'} />
        </Section>

        <Section>
          <SectionTitle icon="pi-check-circle" title="Aktual Pelaksanaan" />
          <Row label="Actual Start"  value={fmt(job.actual_start)} />
          <Row label="Actual End"    value={fmt(job.actual_end)} />
          <Row label="Durasi Aktual" value={durasiAktual ? `${durasiAktual} menit` : '-'} />
          {selisih !== null && (
            <Row
              label="Selisih Jadwal vs Aktual"
              value={
                <span style={{ fontWeight: 600, color: selisih > 0 ? '#ef4444' : selisih < 0 ? '#22c55e' : '#6366f1' }}>
                  {selisih > 0
                    ? `+${selisih} menit (terlambat)`
                    : selisih < 0
                    ? `${selisih} menit (lebih cepat)`
                    : 'Tepat waktu'}
                </span>
              }
            />
          )}
        </Section>

        <Section>
          <SectionTitle icon="pi-chart-bar" title="Optimisasi & Prioritas" />
          <Row label="Fuzzy Score"           value={job.fuzzy_score            ?? '-'} />
          <Row label="Priority Score"        value={job.priority_score         ?? '-'} />
          <Row label="Optimization Category" value={job.optimization_category  ?? '-'} />
          <Row label="Priority Override"     value={fmtBool(job.priority_override)} />
          <Row label="Is Urgent"             value={fmtBool(job.is_urgent)} />
          <Row label="Reschedule Count"      value={job.reschedule_count ?? 0} />
        </Section>

        <Section>
          <SectionTitle icon="pi-info-circle" title="Metadata" />
          <Row label="Created At" value={fmt(job.created_at)} />
          <Row label="Updated At" value={fmt(job.updated_at)} />
        </Section>

      </div>
    </Dialog>
  );
}