// Test personas — must match scripts/seed-test-users.mjs. Importing those
// values here would create a runtime dependency on the seed script's
// shape, so we duplicate the credentials with a comment to keep them in
// sync. If you add a persona to the seed script, add it here too.

export interface Persona {
  role: 'client' | 'supplier' | 'admin';
  email: string;
  password: string;
}

export const PERSONAS: Record<'client' | 'supplier' | 'admin', Persona> = {
  client: {
    role: 'client',
    email: 'ahmed.client.test@example.com',
    password: 'TestClient2026!',
  },
  supplier: {
    role: 'supplier',
    email: 'm.supplier.test@example.com',
    password: 'TestSupplier2026!',
  },
  admin: {
    role: 'admin',
    email: 'sara.admin.test@example.com',
    password: 'TestAdmin2026!',
  },
};
