export type StepPart = { text: string } | { text: string; seconds: number };

// "10 minutes", "1.5 hours", "10-12 min", "45 seconds", and the Hebrew forms. "חצי שעה" is 30 min, a bare "שעה" one hour, "שעתיים" two.
const TIME =
  /(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?|שעות|שעה|דקות|דקה|דק׳|דק'|שניות|שנייה|שניה)(?![\p{L}])|((?:חצי|רבע)\s+שעה|half an hour|half hour|quarter of an hour)|(שעתיים)|(?<![\p{L}\d])(שעה|hour)(?![\p{L}])/giu;

function secondsPer(unit: string): number {
  const u = unit.toLowerCase();
  if (/^(hour|hr|שעה|שעות)/.test(u)) return 3600;
  if (/^(sec|שני)/.test(u)) return 1;
  return 60;
}

/** Splits a step into plain text and tappable time phrases. Hours are counted as minutes (1 hour = 60 min). */
export function splitStepTimes(step: string): StepPart[] {
  const parts: StepPart[] = [];
  let last = 0;
  for (const m of step.matchAll(TIME)) {
    const start = m.index ?? 0;
    let seconds: number;
    if (m[1]) seconds = Number(m[1].replace(",", ".")) * secondsPer(m[2]);
    else if (m[3]) seconds = /רבע|quarter/i.test(m[3]) ? 900 : 1800;
    else if (m[4]) seconds = 7200;
    else seconds = 3600;
    seconds = Math.round(seconds);
    if (seconds <= 0) continue;
    if (start > last) parts.push({ text: step.slice(last, start) });
    parts.push({ text: m[0], seconds });
    last = start + m[0].length;
  }
  if (last < step.length) parts.push({ text: step.slice(last) });
  return parts;
}
