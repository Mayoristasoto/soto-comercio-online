

## Plan: Fix Gonzalo Justiniano's theme to light

### Problem
Gonzalo Justiniano has `theme_mode: "system"` saved in `user_theme_preferences`, and his custom colors (`primary: 0 29% 59%`, `secondary: 180 6% 33%`, `accent: 36 36% 73%`) produce a dark appearance. His system preference is likely set to dark, so "system" resolves to dark mode.

### Solution

1. **Database migration**: Update Gonzalo's `user_theme_preferences` row to set `theme_mode = 'light'` and clear `custom_colors` to `null` so the default light theme applies cleanly.

2. **Default theme is already `light`** in `App.tsx` line 84 (`defaultTheme="light"`), so no code change needed there. The issue is only Gonzalo's saved DB preference overriding the default.

### File changes
- **New migration**: `UPDATE user_theme_preferences SET theme_mode = 'light', custom_colors = NULL WHERE user_id = '2f297b66-1086-471f-83e3-abab3743fc2b'`

That's it. One migration, no code changes.

