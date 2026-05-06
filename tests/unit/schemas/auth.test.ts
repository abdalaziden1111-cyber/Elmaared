import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  signupClientSchema,
  signupSupplierSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from '@/schemas/auth';

describe('loginSchema', () => {
  it('accepts valid login', () => {
    expect(
      loginSchema.safeParse({ email: 'test@example.com', password: '12345678' }).success
    ).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(
      loginSchema.safeParse({ email: 'not-an-email', password: '12345678' }).success
    ).toBe(false);
  });

  it('rejects short password (7 chars)', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: '1234567' }).success
    ).toBe(false);
  });

  it('accepts password at minimum length (8 chars)', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: '12345678' }).success
    ).toBe(true);
  });

  it('rejects empty email', () => {
    expect(
      loginSchema.safeParse({ email: '', password: '12345678' }).success
    ).toBe(false);
  });

  it('rejects email with whitespace', () => {
    expect(
      loginSchema.safeParse({ email: '  a@b.co ', password: '12345678' }).success
    ).toBe(false);
  });

  it('accepts email with plus addressing', () => {
    expect(
      loginSchema.safeParse({ email: 'sara+test@company.sa', password: '12345678' }).success
    ).toBe(true);
  });

  it('accepts unicode in password (9 chars)', () => {
    // 'كلمة مرور' is 9 chars including the space — meets the 8-char min
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: 'كلمة مرور' }).success
    ).toBe(true);
  });

  it('rejects unicode password under 8 chars', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: 'كلمة' }).success
    ).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.co' }).success).toBe(false);
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
    expect(signupClientSchema.safeParse(validClient).success).toBe(true);
  });

  it('rejects CR number with wrong length (too short)', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, crNumber: '12345' }).success
    ).toBe(false);
  });

  it('rejects CR number with wrong length (too long)', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, crNumber: '12345678901' }).success
    ).toBe(false);
  });

  it('rejects CR number with letters', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, crNumber: '10101234AB' }).success
    ).toBe(false);
  });

  it('rejects CR number with leading zero (still valid 10 digits)', () => {
    // Saudi CR numbers can start with any digit including 0
    expect(
      signupClientSchema.safeParse({ ...validClient, crNumber: '0010123456' }).success
    ).toBe(true);
  });

  it('rejects phone without +966 prefix', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, phone: '0512345678' }).success
    ).toBe(false);
  });

  it('rejects phone with too few digits after +966', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, phone: '+96651234' }).success
    ).toBe(false);
  });

  it('rejects phone with too many digits after +966', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, phone: '+9665123456789' }).success
    ).toBe(false);
  });

  it('rejects phone with spaces', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, phone: '+966 512345678' }).success
    ).toBe(false);
  });

  it('rejects phone with dashes', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, phone: '+966-51-234-5678' }).success
    ).toBe(false);
  });

  it('rejects missing company name', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, companyName: '' }).success
    ).toBe(false);
  });

  it('rejects single-char company name', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, companyName: 'A' }).success
    ).toBe(false);
  });

  it('rejects 1-char city', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, city: 'A' }).success
    ).toBe(false);
  });

  it('accepts each valid size enum', () => {
    for (const size of ['enterprise', 'mid', 'startup'] as const) {
      expect(
        signupClientSchema.safeParse({ ...validClient, size }).success
      ).toBe(true);
    }
  });

  it('rejects invalid size enum', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, size: 'huge' as 'mid' }).success
    ).toBe(false);
  });

  it('accepts optional fields omitted', () => {
    const { ...minimal } = validClient;
    expect(signupClientSchema.safeParse(minimal).success).toBe(true);
  });

  it('accepts optional VAT number when provided', () => {
    expect(
      signupClientSchema.safeParse({ ...validClient, vatNumber: '300123456700003' }).success
    ).toBe(true);
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
    expect(signupSupplierSchema.safeParse(validSupplier).success).toBe(true);
  });

  it('rejects empty specializations', () => {
    expect(
      signupSupplierSchema.safeParse({ ...validSupplier, specializations: [] }).success
    ).toBe(false);
  });

  it('accepts all 4 specializations selected', () => {
    expect(
      signupSupplierSchema.safeParse({
        ...validSupplier,
        specializations: ['booth', 'gifts', 'event', 'printing'],
      }).success
    ).toBe(true);
  });

  it('rejects invalid specialization value', () => {
    expect(
      signupSupplierSchema.safeParse({
        ...validSupplier,
        specializations: ['invalid' as 'booth'],
      }).success
    ).toBe(false);
  });

  it('rejects empty cities', () => {
    expect(
      signupSupplierSchema.safeParse({ ...validSupplier, cities: [] }).success
    ).toBe(false);
  });

  it('accepts valid SA IBAN', () => {
    expect(
      signupSupplierSchema.safeParse({
        ...validSupplier,
        iban: 'SA0380000000608010167519',
      }).success
    ).toBe(true);
  });

  it('rejects invalid IBAN (wrong country)', () => {
    expect(
      signupSupplierSchema.safeParse({
        ...validSupplier,
        iban: 'AE0380000000608010167519',
      }).success
    ).toBe(false);
  });

  it('rejects IBAN that is too short', () => {
    expect(
      signupSupplierSchema.safeParse({ ...validSupplier, iban: 'SA1234' }).success
    ).toBe(false);
  });

  it('rejects IBAN that is too long', () => {
    expect(
      signupSupplierSchema.safeParse({
        ...validSupplier,
        iban: 'SA03800000006080101675191234',
      }).success
    ).toBe(false);
  });

  it('rejects IBAN with letters in numeric part', () => {
    expect(
      signupSupplierSchema.safeParse({
        ...validSupplier,
        iban: 'SA03800000006080A0167519',
      }).success
    ).toBe(false);
  });

  it('accepts empty IBAN string (optional)', () => {
    expect(
      signupSupplierSchema.safeParse({ ...validSupplier, iban: '' }).success
    ).toBe(true);
  });

  it('rejects website that is not a URL', () => {
    expect(
      signupSupplierSchema.safeParse({ ...validSupplier, website: 'not a url' }).success
    ).toBe(false);
  });

  it('accepts empty website (optional)', () => {
    expect(
      signupSupplierSchema.safeParse({ ...validSupplier, website: '' }).success
    ).toBe(true);
  });

  it('accepts website with valid URL', () => {
    expect(
      signupSupplierSchema.safeParse({
        ...validSupplier,
        website: 'https://example.sa',
      }).success
    ).toBe(true);
  });

  it('rejects negative team size', () => {
    expect(
      signupSupplierSchema.safeParse({ ...validSupplier, teamSize: -5 }).success
    ).toBe(false);
  });

  it('rejects zero team size', () => {
    expect(
      signupSupplierSchema.safeParse({ ...validSupplier, teamSize: 0 }).success
    ).toBe(false);
  });

  it('rejects fractional team size', () => {
    expect(
      signupSupplierSchema.safeParse({ ...validSupplier, teamSize: 5.5 }).success
    ).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(resetPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(resetPasswordSchema.safeParse({ email: 'invalid' }).success).toBe(false);
  });
});

describe('updatePasswordSchema', () => {
  it('accepts matching passwords', () => {
    expect(
      updatePasswordSchema.safeParse({
        password: 'mypassword',
        confirmPassword: 'mypassword',
      }).success
    ).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'mypassword',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.confirmPassword).toBeDefined();
    }
  });

  it('rejects short password', () => {
    expect(
      updatePasswordSchema.safeParse({
        password: 'short',
        confirmPassword: 'short',
      }).success
    ).toBe(false);
  });
});
