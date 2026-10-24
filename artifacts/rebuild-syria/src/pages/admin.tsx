import { useState } from 'react';
import { getGetMunicipalityDashboardQueryKey, useGetMunicipalityDashboard } from '@workspace/api-client-react';
import { PageFrame, PlatformShell } from '@/components/platform-shell';
import { AiLabel } from '@/components/ai-label';
import { useI18n } from '@/i18n';
import { PinGate } from '@/components/municipality/pin-gate';
import { DashboardCounters } from '@/components/municipality/counters';
import { ReportInbox } from '@/components/municipality/report-inbox';
import { ApplicationsPanel } from '@/components/municipality/applications-panel';
import { LegacyProjects } from '@/components/municipality/legacy-projects';

/** Municipality Dashboard (لوحة البلدية): PIN-protected, PIN kept only in this page's memory. */
export default function AdminPage() {
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const query = useGetMunicipalityDashboard({
    request: { headers: { 'X-Admin-Pin': pin } },
    query: { enabled: requested, queryKey: [...getGetMunicipalityDashboardQueryKey(), attempt], retry: false },
  });
  const statusOf = (v: unknown) => (v as { status?: number })?.status;
  const data = query.data;
  return <PlatformShell><PageFrame eyebrow={t('admin.eyebrow')} title={t('admin.title')} intro={t('admin.intro')}>
    <PinGate pin={pin} setPin={setPin} requested={requested} onSubmit={() => { setRequested(true); setAttempt(v => v + 1); }} onClear={() => { setPin(''); setRequested(false); }}/>
    {requested && (query.isLoading ? <div className="space-y-3" role="status" aria-label={t('ui.loading')}><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div>
      : query.isError ? <div role="alert" className="notice notice-error mb-5" data-testid="dashboard-error">{statusOf(query.error) === 401 ? t('admin.pinInvalidQueue') : t('admin.loadFailed')}<button className="ms-2 font-bold underline" onClick={() => setAttempt(v => v + 1)}>{t('ui.retry')}</button></div>
      : data && <div className="space-y-8">
        <p className="notice notice-green flex gap-2 items-center m-0"><AiLabel/>{t('ai.onlySuggests')}</p>
        <DashboardCounters counters={data.counters}/>
        <ReportInbox reports={data.reports} pin={pin}/>
        <ApplicationsPanel applications={data.applications} pin={pin}/>
        <LegacyProjects projects={data.pendingProjects} pin={pin}/>
      </div>)}
  </PageFrame></PlatformShell>;
}
