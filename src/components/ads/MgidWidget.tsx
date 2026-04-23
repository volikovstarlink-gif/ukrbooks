'use client';

interface MgidWidgetProps {
  placement: string;
  className?: string;
  minHeight?: number;
}

// DISABLED 2026-04-24 — user kept only `ukrbooks-popunder` + `ukrbooks-preroll-pod`.
// MGID widgets (native ad recommendations) are off for now. Retained as no-op
// component so call sites don't need edits; re-enable by restoring original.
export default function MgidWidget(_props: MgidWidgetProps) {
  return null;
}
