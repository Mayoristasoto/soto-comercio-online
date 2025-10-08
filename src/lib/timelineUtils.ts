import { Shift, ShiftOverlap, ShiftBlock } from '@/types/timeline';

/**
 * Detect overlapping shifts for the same employee
 */
export function detectOverlaps(shifts: Shift[]): ShiftOverlap[] {
  const overlaps: ShiftOverlap[] = [];

  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const shift1 = shifts[i];
      const shift2 = shifts[j];

      const overlap = calculateOverlap(shift1, shift2);
      if (overlap > 0) {
        overlaps.push({
          shift1: shift1.id,
          shift2: shift2.id,
          overlapMinutes: overlap,
        });
      }
    }
  }

  return overlaps;
}

/**
 * Calculate overlap between two shifts in minutes
 */
function calculateOverlap(shift1: Shift, shift2: Shift): number {
  const [s1StartH, s1StartM] = shift1.start_time.split(':').map(Number);
  const [s1EndH, s1EndM] = shift1.end_time.split(':').map(Number);
  const [s2StartH, s2StartM] = shift2.start_time.split(':').map(Number);
  const [s2EndH, s2EndM] = shift2.end_time.split(':').map(Number);

  const s1Start = s1StartH * 60 + s1StartM;
  let s1End = s1EndH * 60 + s1EndM;
  const s2Start = s2StartH * 60 + s2StartM;
  let s2End = s2EndH * 60 + s2EndM;

  // Handle overnight shifts
  if (s1End < s1Start) s1End += 24 * 60;
  if (s2End < s2Start) s2End += 24 * 60;

  // Calculate overlap
  const overlapStart = Math.max(s1Start, s2Start);
  const overlapEnd = Math.min(s1End, s2End);

  return Math.max(0, overlapEnd - overlapStart);
}

/**
 * Generate shift blocks with positioning for timeline grid
 */
export function getShiftBlocks(
  shifts: Shift[],
  fromHour: number,
  toHour: number
): ShiftBlock[] {
  const blocks: ShiftBlock[] = [];
  const totalMinutes = (toHour - fromHour) * 60;

  shifts.forEach((shift) => {
    const [startH, startM] = shift.start_time.split(':').map(Number);
    const [endH, endM] = shift.end_time.split(':').map(Number);

    const shiftStartMinutes = startH * 60 + startM;
    const shiftEndMinutes = endH * 60 + endM;
    const rangeStartMinutes = fromHour * 60;

    // Calculate position relative to the visible range
    let startOffset = shiftStartMinutes - rangeStartMinutes;
    let duration = shiftEndMinutes >= shiftStartMinutes
      ? shiftEndMinutes - shiftStartMinutes
      : (24 * 60) - shiftStartMinutes + shiftEndMinutes;

    // Handle shifts that start before visible range
    if (startOffset < 0) {
      duration += startOffset;
      startOffset = 0;
    }

    // Handle shifts that extend beyond visible range
    if (startOffset + duration > totalMinutes) {
      duration = totalMinutes - startOffset;
    }

    const startPercent = (startOffset / totalMinutes) * 100;
    const widthPercent = (duration / totalMinutes) * 100;

    if (widthPercent > 0) {
      blocks.push({
        shift,
        startPercent,
        widthPercent,
      });
    }
  });

  return blocks;
}

/**
 * Generate a deterministic color from a string
 */
export function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;
  const saturation = 65 + (hash % 20);
  const lightness = 45 + (hash % 15);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Format minutes to HH:MM
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Parse time string to minutes
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
