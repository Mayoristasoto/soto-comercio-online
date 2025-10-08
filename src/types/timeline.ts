export interface Shift {
  id: string;
  employee_id: string;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  duration: string; // H:MM format
  status?: string;
  location?: string;
  notes?: string;
  color_hint?: string;
}

export interface Employee {
  id: string;
  name: string;
  surname?: string;
  role: string;
  avatar_url?: string;
  location?: string;
  team?: string;
}

export interface TimelineFilter {
  location?: string;
  role?: string;
  team?: string;
}

export interface ShiftOverlap {
  shift1: string;
  shift2: string;
  overlapMinutes: number;
}

export interface ShiftBlock {
  shift: Shift;
  startPercent: number;
  widthPercent: number;
}
