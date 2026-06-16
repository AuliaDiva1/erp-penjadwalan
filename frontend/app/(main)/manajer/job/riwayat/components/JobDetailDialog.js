'use client';
import { Dialog }  from 'primereact/dialog';
import { Tag }     from 'primereact/tag';

const STATUS_SEVERITY = {
  Pending: 'warning', Scheduled: 'info', 'In Progress': 'success',
  Completed: 'success', Delayed: 'danger', Failed: 'danger',
};

const fmt = (val) => val ? new Date(val).toLocaleString('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  timeZone: 'Asia/Jakarta',
}) : '-';

const fmtBool = (val) => (
  <Tag value={val ? 'Ya' : 'Tidak'} severity={val ? 'success' : 'secondary'}
    style={{ fontSize: '0.7rem' }} />
);

const SECTIONS = [
  {
    icon: 'pi-id-card', title: 'Identitas Job',
    fields: (j) => [
      ['Job ID', j.job_id],
      ['Operation Type', j.operation_type],
      ['Machine ID', j.assigned_machine_id ?? j.machine_id ?? '-'],
      ['Assigned Machine', j.assigned_machine_name ?? j.machine_name ?? '-'],
      ['Material ID', j.material_id],
      ['Material Digunakan', j.material_used ? `${j.material_used} unit` : '-'],
    ],
  },
  {
    icon: 'pi-cog', title: 'Parameter Teknis',
    fields: (j) => [
      ['Processing Time', `${j.processing_time} menit`],
      ['Energy Consumption', `${j.energy_consumption} kWh`],
      ['Machine Availability', `${j.machine_availability}%`],
      ['Makespan', j.makespan ? `${j.makespan} menit` : '-'],
    ],
  },
  {
    icon: 'pi-calendar-times', title: 'Deadline',
    fields: (j) => [
      ['Deadline', fmt(j.deadline)],
      ['Deadline Customer', fmt(j.deadline_customer)],
      ['Deadline Predicted', fmt(j.deadline_predicted)],
      ['Deadline Manual', fmtBool(j.deadline_is_manual)],
      ['Deadline Warning', j.deadline_warning
        ? <Tag value="Terlewat" severity="danger"  style={{ fontSize: '0.7rem' }} />
        : <Tag value="Aman"     severity="success" style={{ fontSize: '0.7rem' }} />],
    ],
  },
  {
    icon: 'pi-calendar', title: 'Jadwal',
    fields: (j, extra) => [
      ['Scheduled Start', fmt(j.scheduled_start)],
      ['Scheduled End', fmt(j.scheduled_end)],
      ['Durasi Jadwal', extra.durasiJadwal ? `${extra.durasiJadwal} menit` : '-'],
    ],
  },
  {
    icon: 'pi-check-circle', title: 'Aktual Pelaksanaan',
    fields: (j, extra) => [
      ['Actual Start', fmt(j.actual_start)],
      ['Actual End', fmt(j.actual_end)],
      ['Durasi Aktual', extra.durasiAktual ? `${extra.durasiAktual} menit` : '-'],
      ...(extra.selisih !== null ? [[
        'Selisih Jadwal vs Aktual',
        <span style={{ fontWeight: 600, color: extra.selisih > 0 ? '#ef4444' : extra.selisih < 0 ? '#22c55e' : '#6366f1' }}>
          {extra.selisih > 0 ? `+${extra.selisih} menit (terlambat)` : extra.selisih < 0 ? `${extra.selisih} menit (lebih cepat)` : 'Tepat waktu'}
        </span>,
      ]] : []),
    ],
  },
  {
    icon: 'pi-chart-bar', title: 'Optimisasi & Prioritas',
    fields: (j) => [
      ['Fuzzy Score', j.fuzzy_score ?? '-'],
      ['Priority Score', j.priority_score ?? '-'],
      ['Optimization Category', j.optimization_category ?? '-'],
      ['Priority Override', fmtBool(j.priority_override)],
      ['Is Urgent', fmtBool(j.is_urgent)],
      ['Reschedule Count', j.reschedule_count ?? 0],
    ],
  },
  {
    icon: 'pi-info-circle', title: 'Metadata',
    fields: (j) => [
      ['Created At', fmt(j.created_at)],
      ['Updated At', fmt(j.updated_at)],
    ],
  },
];

export default function JobDetailDialog({ visible, onHide, job }) {
  if (!job) return null;

  const durasiAktual = job.actual_start && job.actual_end
    ? Math.round((new Date(job.actual_end) - new Date(job.actual_start)) / 60000) : null;
  const durasiJadwal = job.scheduled_start && job.scheduled_end
    ? Math.round((new Date(job.scheduled_end) - new Date(job.scheduled_start)) / 60000) : null;
  const selisih = durasiAktual && durasiJadwal ? durasiAktual - durasiJadwal : null;
  const extra = { durasiAktual, durasiJadwal, selisih };

  return (
    <Dialog
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'var(--primary-color)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <i className="pi pi-list" style={{ fontSize: '0.9rem', color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              Detail Job &nbsp;
              <span style={{ color: 'var(--primary-color)' }}>{job.job_id}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              <Tag value={job.job_status} severity={STATUS_SEVERITY[job.job_status] || 'info'} style={{ fontSize: '0.7rem' }} />
              {job.is_urgent        && <Tag value="URGENT"    severity="danger" style={{ fontSize: '0.7rem' }} />}
              {job.deadline_warning && <Tag value="TERLAMBAT" severity="danger" style={{ fontSize: '0.7rem', background: '#7c2d12' }} />}
            </div>
          </div>
        </div>
      }
      visible={visible} style={{ width: '680px' }}
      modal onHide={onHide} draggable={false} dismissableMask
      contentStyle={{ padding: '0 1.25rem 1.25rem' }}
    >
      <div style={{ maxHeight: '74vh', overflowY: 'auto', paddingRight: 4 }}>
        {SECTIONS.map((sec) => {
          const rows = sec.fields(job, extra);
          return (
            <div key={sec.title} style={{
              marginBottom: 12, borderRadius: 10,
              border: '1px solid var(--surface-border)',
              overflow: 'hidden',
            }}>
              {/* Section header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                background: 'var(--surface-ground)',
                borderBottom: '1px solid var(--surface-border)',
              }}>
                <i className={`pi ${sec.icon}`} style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }} />
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  color: 'var(--primary-color)',
                }}>
                  {sec.title}
                </span>
              </div>
              {/* Rows */}
              {rows.map(([label, value], i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '8px 14px',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--surface-border)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'var(--surface-ground)',
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', minWidth: 180 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500, textAlign: 'right' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}