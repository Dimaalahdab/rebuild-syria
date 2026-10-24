import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateProjectStatus } from '@workspace/api-client-react';
import type { Project } from '@workspace/api-client-react';
import { ShieldCheck, X } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n';
import { isDemoRecord } from '@/lib/demo';
import { invalidateMunicipalityData } from '@/lib/invalidate';

export function LegacyProjects({ projects, pin }: { projects: Project[]; pin: string }) {
  const { t, label, errorMessage } = useI18n();
  const qc = useQueryClient();
  const status = useUpdateProjectStatus({ request: { headers: { 'X-Admin-Pin': pin } } });
  const [error, setError] = useState<{ e: unknown; key: TKey } | null>(null);
  const run = (id: string, s: 'open' | 'rejected', key: TKey) => {
    setError(null);
    status.mutate({ id, data: { status: s } }, { onSuccess: () => { void invalidateMunicipalityData(qc); }, onError: e => setError({ e, key }) });
  };
  return <section aria-labelledby="legacy-title">
    <h2 id="legacy-title" className="text-xl font-extrabold">{t('admin.projects')} <span className="tag">{projects.length}</span></h2>
    {error && <div role="alert" className="notice notice-error mb-3 mt-3">{t(error.key)}: {errorMessage(error.e, error.key)}</div>}
    {!projects.length ? <div className="surface empty-state mt-3">{t('admin.projectsEmpty')}</div> : projects.map(p => <article className="surface data-card mt-3" key={p.id} data-testid={`card-pending-project-${p.id}`}>
      <div className="flex flex-wrap justify-between gap-2"><span className="tag">{label(p.city)} · <span dir="auto">{p.neighborhood}</span></span><span className="flex gap-2">{isDemoRecord(p) && <span className="tag tag-gold">{t('ui.demoData')}</span>}<span className="tag tag-gold">{p.isSafe ? t('admin.safe') : t('admin.needsSafety')}</span></span></div>
      <h3 dir="auto" className="text-start">{p.title}</h3><p dir="auto" className="text-start">{p.description}</p>
      <div className="action-row mt-4"><button className="action-primary" disabled={status.isPending || !p.isSafe} onClick={() => run(p.id, 'open', 'admin.approveFailed')} data-testid={`button-approve-${p.id}`}><ShieldCheck size={16}/>{t('admin.approve')}</button><button className="action-danger" disabled={status.isPending} onClick={() => run(p.id, 'rejected', 'admin.rejectFailed')} data-testid={`button-reject-${p.id}`}><X size={16}/>{t('admin.reject')}</button></div>
    </article>)}
  </section>;
}
