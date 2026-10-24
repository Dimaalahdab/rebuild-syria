import type { QueryClient } from '@tanstack/react-query';
import {
  getGetMunicipalityDashboardQueryKey,
  getGetProjectsQueryKey,
  getGetReportsQueryKey,
} from '@workspace/api-client-react';

/** Refresh everything a decision / application can change: reports, projects, dashboard, user activity + notifications. */
export function invalidateMunicipalityData(qc: QueryClient) {
  const roots = [getGetReportsQueryKey()[0], getGetProjectsQueryKey()[0], getGetMunicipalityDashboardQueryKey()[0]];
  return qc.invalidateQueries({
    predicate: q => {
      const head = q.queryKey[0];
      if (typeof head !== 'string') return false;
      return roots.some(r => head === r || head.startsWith(`${r}/`)) || /^\/api\/users\/[^/]+\/(activity|notifications|projects|impact)/.test(head);
    },
  });
}
