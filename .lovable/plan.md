

## Problem

Gonzalo Justiniano (ID: `96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4`) has an existing "entrada" record for today (fichaje ID: `381e2a98-9a71-496f-9893-ed06723b5142`), which causes the kiosk to show "Iniciar Pausa / Finalizar Jornada" instead of allowing a fresh check-in. No `novedades_vistas` records exist for today, so the novedad should appear on the next "entrada".

## Fix

Run a migration to delete today's fichaje record for Gonzalo Justiniano:

```sql
DELETE FROM fichajes
WHERE id = '381e2a98-9a71-496f-9893-ed06723b5142';
```

After this, you can do a fresh facial recognition check-in and the novedades alert should appear.

