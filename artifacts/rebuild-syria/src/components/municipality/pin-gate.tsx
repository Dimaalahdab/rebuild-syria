import { KeyRound } from 'lucide-react';
import { useI18n } from '@/i18n';

export function PinGate({ pin, setPin, requested, onSubmit, onClear }: { pin: string; setPin: (v: string) => void; requested: boolean; onSubmit: () => void; onClear: () => void }) {
  const { t } = useI18n();
  return <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="surface form-surface mb-5">
    <div className="brand-mark mb-4"><KeyRound/></div>
    <h2 className="text-xl font-extrabold text-[#244a30]">{t('admin.login')}</h2>
    <p className="status-text mb-2">{t('admin.loginHint')}</p>
    <p className="field-hint mb-5" data-testid="text-demo-pin">{t('admin.demoPin')}</p>
    <div className="field"><label htmlFor="admin-pin">{t('admin.pin')}</label><input id="admin-pin" data-testid="input-admin-pin" dir="ltr" value={pin} onChange={e => setPin(e.target.value)} inputMode="numeric" type="password" autoComplete="off" required/></div>
    <div className="action-row"><button className="action-primary" type="submit" data-testid="button-load-dashboard">{t('admin.load')}</button>{requested && <button className="action-secondary" type="button" onClick={onClear} data-testid="button-clear-pin">{t('admin.clearPin')}</button>}</div>
  </form>;
}
