-- ======================================
-- Phase 4: Chat extensions (admin presence, panic timestamps, cap trigger)
-- ======================================

ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS admin_joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS panic_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS panic_reason TEXT;

-- Cap each RFQ at 4 active (non-archived) chats. Enforced at the DB
-- level so a malicious client can't bypass the application check.
CREATE OR REPLACE FUNCTION enforce_chat_cap() RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM chats
  WHERE rfq_id = NEW.rfq_id AND COALESCE(is_archived, FALSE) = FALSE;

  IF active_count >= 4 THEN
    RAISE EXCEPTION 'CHAT_CAP_REACHED' USING HINT = 'Each RFQ allows up to 4 simultaneous chats.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_cap ON chats;
CREATE TRIGGER trg_chat_cap BEFORE INSERT ON chats
  FOR EACH ROW EXECUTE FUNCTION enforce_chat_cap();
