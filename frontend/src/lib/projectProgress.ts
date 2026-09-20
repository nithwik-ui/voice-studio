export function getDeterministicProgress(status: string): number {
  switch (status?.toUpperCase()) {
    case 'DRAFT': return 5;
    case 'ASSIGNED': return 10;
    case 'IN_PROGRESS': return 30;
    case 'EDITED_VIDEO_UPLOADED': return 50;
    case 'SUBMITTED': return 70;
    case 'UNDER_REVIEW': return 80;
    case 'REVISION_REQUIRED':
    case 'REVISION_REQUESTED': return 60;
    case 'RESUBMITTED': return 80;
    case 'APPROVED':
    case 'COMPLETED': return 100;
    default: return 10;
  }
}

export function formatStatus(status: string): { label: string; colorClass: string } {
  switch (status?.toUpperCase()) {
    case 'ASSIGNED':
      return { label: 'Assigned', colorClass: 'bg-primary-container/40 text-on-primary-container border-primary/20' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', colorClass: 'bg-secondary-container/40 text-on-secondary-container border-secondary/20' };
    case 'EDITED_VIDEO_UPLOADED':
      return { label: 'Edited Video Ready', colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return { label: 'Awaiting Review', colorClass: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'REVISION_REQUIRED':
    case 'REVISION_REQUESTED':
      return { label: 'Revision Required', colorClass: 'bg-error/10 text-error border-error/20' };
    case 'RESUBMITTED':
      return { label: 'Resubmitted', colorClass: 'bg-sky-50 text-sky-800 border-sky-200' };
    case 'APPROVED':
    case 'COMPLETED':
      return { label: 'Completed', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    default:
      return { label: status || 'Assigned', colorClass: 'bg-surface-container-high text-on-surface-variant' };
  }
}
