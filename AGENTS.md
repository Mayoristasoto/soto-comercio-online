# Architecture rules

- Apply punctuality type filters and ordering through a pure projection shared by the table, employee detail and PDF inputs so exports match the selected incidents without changing stored records.

- Keep pause report pairing and summaries in a shared pure module used by the Fichero view and exports, so on-screen and downloaded durations agree.
- Pause reports are read-only analyses of clock records, not generators of disciplinary incidents; display recorded justifications separately from observed durations.
- Derive break concurrency with exact half-open UTC intervals, split at Argentina day boundaries and grouped by assigned branch; use the same pure analysis in heatmaps and exports to avoid contradictory overlaps, and never infer incomplete breaks.
- Daily break timelines and their browser-generated PDFs consume the shared concurrency segments, preserving selected branch/day and employee coincidence context without publishing employee reports as static public assets.
- Horario 2 schedules live in h2_* tables; state transitions (send, approve, return, publish, new version, copy, template) go only through SECURITY DEFINER h2_* RPCs, and the latest published version wins over fixed shifts when resolving a day's schedule, so the kiosk and lateness checks follow what RRHH published.
- Horario 2 validations and coverage are computed in the pure module src/lib/horario2.ts shared by grid and panels, so warnings and coverage agree.
