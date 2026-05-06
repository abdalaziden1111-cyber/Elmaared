-- ======================================
-- 4. Chat + Messages
-- ======================================

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_id UUID,
  client_unread_count INT DEFAULT 0,
  supplier_unread_count INT DEFAULT 0,
  admin_unread_count INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX idx_chats_rfq ON chats(rfq_id);
CREATE INDEX idx_chats_client ON chats(client_id);
CREATE INDEX idx_chats_supplier ON chats(supplier_id);
CREATE INDEX idx_chats_user_latest ON chats(client_id, last_message_at DESC NULLS LAST);

-- Messages — NO soft delete, NO update, NO delete. Immutable audit trail.
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_role user_role NOT NULL,
  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  attachment_size_bytes BIGINT,
  is_admin_intervention BOOLEAN DEFAULT FALSE,
  is_panic_alert BOOLEAN DEFAULT FALSE,
  panic_reason TEXT,
  read_by_client_at TIMESTAMPTZ,
  read_by_supplier_at TIMESTAMPTZ,
  read_by_admin_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_panic ON messages(chat_id) WHERE is_panic_alert = TRUE;
