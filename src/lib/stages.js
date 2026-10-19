// Application stages, shared by My List and the application workspace (user_firms.status).
export const STAGES = [
  { value: 'saved', label: 'Saved' },
  { value: 'researching', label: 'Researching' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'not-pursuing', label: 'Not pursuing' },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.value, s.label]));
// Old tracker values from before migration 004.
const LEGACY = { Researching: 'researching', Applied: 'applied', 'Heard Back': 'interviewing', Callback: 'interviewing', Offer: 'offer', Rejected: 'not-pursuing' };
export const stageOf = (row) => LEGACY[row.status] ?? (STAGE_LABEL[row.status] ? row.status : 'saved');

/** Patch for moving to a stage; the first move to Applied records the date. */
export function stagePatch(row, stage) {
  const patch = { status: stage };
  if (stage === 'applied' && !row.applied_at) patch.applied_at = new Date().toISOString();
  return patch;
}
