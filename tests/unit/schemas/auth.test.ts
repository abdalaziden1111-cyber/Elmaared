import { describe, it, expect } from 'vitest';
import { loginSchema, signupClientSchema, signupSupplierSchema } from '@/schemas/auth';

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: '12345678' });
    expect(result.success).toBe(false);
  });
});

describe('signupClientSchema', () => {
  const validClient = {
    email: 'sara@company.sa',
    password: 'Pass1234!',
    fullName: 'سارة العتيبي',
    phone: '+966512345678',
    companyName: 'شركة الإبداع',
    crNumber: '1010123456',
    size: 'mid' as const,
    city: 'Riyadh',
  };

  it('accepts valid client signup', () => {
    const result = signupClientSchema.safeParse(validClient);
    expect(result.success).toBe(true);
  });

  it('rejects CR number with wrong length', () => {
    const result = signupClientSchema.safeParse({ ...validClient, crNumber: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects CR number with letters', () => {
    const result = signupClientSchema.safeParse({ ...validClient, crNumber: '10101234AB' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone format', () => {
    const result = signupClientSchema.safeParse({ ...validClient, phone: '0512345678' });
    expect(result.success).toBe(false);
  });

  it('rejects missing company name', () => {
    const result = signupClientSchema.safeParse({ ...validClient, companyName: '' });
    expect(result.success).toBe(false);
  });
});

describe('signupSupplierSchema', () => {
  const validSupplier = {
    email: 'supplier@test.sa',
    password: 'Pass1234!',
    fullName: 'أحمد المورد',
    phone: '+966599887766',
    companyName: 'مؤسسة المعارض',
    crNumber: '4030567890',
    specializations: ['booth' as const],
    cities: ['Riyadh'],
  };

  it('accepts valid supplier signup', () => {
    const result = signupSupplierSchema.safeParse(validSupplier);
    expect(result.success).toBe(true);
  });

  it('rejects empty specializations', () => {
    const result = signupSupplierSchema.safeParse({ ...validSupplier, specializations: [] });
    expect(result.success).toBe(false);
  });

  it('rejects empty cities', () => {
    const result = signupSupplierSchema.safeParse({ ...validSupplier, cities: [] });
    expect(result.success).toBe(false);
  });

  it('accepts valid IBAN', () => {
    const result = signupSupplierSchema.safeParse({
      ...validSupplier,
      iban: 'SA0380000000608010167519',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid IBAN', () => {
    const result = signupSupplierSchema.safeParse({ ...validSupplier, iban: 'INVALID' });
    expect(result.success).toBe(false);
  });
});
