import { getGetAppConfigQueryKey, useGetAppConfig } from '@workspace/api-client-react';
import { useI18n } from '@/i18n';

/** Pilot city from the server config. `canonical` is what the API stores; `display` is localized. */
export function useCity() {
  const { language } = useI18n();
  const query = useGetAppConfig({ query: { queryKey: getGetAppConfigQueryKey(), staleTime: Infinity, retry: false } });
  const cfg = query.data;
  return {
    canonical: cfg?.cityName || 'حمص',
    display: language === 'ar' ? cfg?.cityNameAr || 'حمص' : cfg?.cityNameEn || 'Homs',
  };
}
