const labels: Record<string, string> = {
  Waste: 'النفايات', Roads: 'الطرق', Lighting: 'الإنارة',
  'Public spaces': 'المساحات العامة', Buildings: 'المباني', Other: 'أخرى',
  new: 'بانتظار المراجعة', verified: 'موثّق', referred: 'يُحال إلى الجهات المختصة',
  pending: 'بانتظار الاعتماد', open: 'مفتوح', in_progress: 'قيد التنفيذ',
  completed: 'مكتمل', rejected: 'مرفوض',
  Cleaning: 'التنظيف', Painting: 'الدهان', Gardening: 'الزراعة',
  Organization: 'التنظيم', Transportation: 'النقل', Engineering: 'الهندسة',
  Electrical: 'الكهرباء', Construction: 'البناء', Photography: 'التصوير', Design: 'التصميم',
};
export const arabicLabel = (value: string) => labels[value] ?? value;
