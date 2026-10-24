import type { MunicipalityDashboardCounters } from '@workspace/api-client-react';
import { useI18n } from '@/i18n';
import { DECISION_STATUSES } from '@/lib/report-decision';

const ORDER = ['new', ...DECISION_STATUSES];
export function DashboardCounters({ counters }: { counters: MunicipalityDashboardCounters }) {
  const { t, label, fmtNumber } = useI18n();
  const by = counters.reportsByStatus ?? {};
  const keys = [...ORDER, ...Object.keys(by).filter(k => !ORDER.includes(k))];
  const avg = counters.averageDecisionHours;
  return <div className="dash-counters mb-7" data-testid="dashboard-counters">
    <div className="surface dash-stat"><div className="c mb-3">{t('dash.cnt.byStatus')}</div><div className="status-chips">{keys.map(k => <span key={k} className={`st-badge st-${k}`} data-testid={`counter-status-${k}`}>{label(k)} · {fmtNumber(by[k] ?? 0)}</span>)}</div></div>
    <div className="surface dash-stat"><div className="v" data-testid="counter-pending-applications">{fmtNumber(counters.pendingApplications)}</div><div className="c">{t('dash.cnt.pending')}</div></div>
    <div className="surface dash-stat"><div className="v" data-testid="counter-average-hours">{avg === null || avg === undefined ? '—' : t('dash.cnt.avgValue', { n: fmtNumber(Math.round(avg * 10) / 10) })}</div><div className="c">{t('dash.cnt.avg')}{avg === null || avg === undefined ? ` · ${t('dash.cnt.avgNone')}` : ''}</div></div>
  </div>;
}
