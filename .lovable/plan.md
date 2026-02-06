

## Fix: Make "apercibimiento" warning visible in late arrival alert

### Problem
The warning text was added but is not visible in the UI, likely due to small font size and low contrast against the dark card background.

### Solution
Move the warning outside the incidence details section and make it larger/more prominent so it cannot be missed. Place it as a standalone highlighted section between the incidence card and the countdown.

### Technical Changes

**File: `src/components/kiosko/LlegadaTardeAlert.tsx`**

1. Remove the current small warning text from inside the incidence card (lines 141-143)
2. Add a new prominent warning section between the incidence `<Card>` and the countdown `<div>`, styled with:
   - Larger font size (`text-sm sm:text-base md:text-lg`)
   - Yellow/amber warning background for contrast
   - Bold text with warning icon
   - Example:
   ```
   <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-6 text-center">
     <p className="text-sm sm:text-base md:text-lg font-bold text-yellow-400">
       En caso de repetirse, sera apercibido/a.
     </p>
   </div>
   ```

This ensures the warning is clearly visible regardless of screen size or theme.
