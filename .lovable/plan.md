
# Fix: PIN verification fails due to hash algorithm mismatch

## Root Cause

The PIN for `noeliatedesco@mayoristasoto.com` is stored correctly in the database, but verification always fails because two different hashing algorithms are used:

- **PIN creation** (`blanquear_pins_con_dni`): Uses `crypt(pin, gen_salt('bf', 8))` which produces **bcrypt** hashes (e.g., `$2a$08$...`)
- **PIN verification** (`hash_pin` function called by `kiosk_verificar_pin`): Uses `SHA256` with a fixed salt, producing a hex string

These are completely incompatible -- the verification will never match.

## Fix

Update the `hash_pin` function to use bcrypt verification instead of SHA256, matching how PINs are stored.

### Database Migration

Replace the `hash_pin` function with one that uses `crypt()` from pgcrypto (bcrypt), and update `kiosk_verificar_pin` to compare using bcrypt's `crypt()` instead of direct hash comparison.

```sql
-- Fix hash_pin to use bcrypt for new PINs
CREATE OR REPLACE FUNCTION hash_pin(p_pin TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN crypt(p_pin, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- Update kiosk_verificar_pin to compare using bcrypt
-- Change the comparison line from:
--   IF v_pin_record.pin_hash = v_hash THEN
-- To:
--   IF v_pin_record.pin_hash = crypt(p_pin, v_pin_record.pin_hash) THEN
-- (bcrypt verification: re-hash with the stored hash as salt)
```

The key change in `kiosk_verificar_pin` is replacing:
```
v_hash := hash_pin(p_pin);
IF v_pin_record.pin_hash = v_hash THEN
```
With:
```
IF v_pin_record.pin_hash = crypt(p_pin, v_pin_record.pin_hash) THEN
```

This is how bcrypt verification works -- you use the stored hash as the salt to re-hash the input, and if the result matches the stored hash, the PIN is correct.

### No frontend changes needed

The frontend code and edge function are already correct. The issue is purely in the database function.
