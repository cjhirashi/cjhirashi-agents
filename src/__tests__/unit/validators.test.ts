/**
 * Validators Unit Tests
 *
 * Tests for Zod validation schemas used throughout the app
 *
 * Related: Phase 7 - Tarea 4 (Unit Testing Suite)
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import validation schemas (these would be from actual files)
// For now, we'll test common patterns used in the app

describe('Common Validation Patterns', () => {
  describe('Email validation', () => {
    const EmailSchema = z.string().email();

    it('should accept valid email', () => {
      expect(() => EmailSchema.parse('user@example.com')).not.toThrow();
      expect(() => EmailSchema.parse('test.user+tag@domain.co.uk')).not.toThrow();
    });

    it('should reject invalid email', () => {
      expect(() => EmailSchema.parse('notanemail')).toThrow();
      expect(() => EmailSchema.parse('@example.com')).toThrow();
      expect(() => EmailSchema.parse('user@')).toThrow();
      expect(() => EmailSchema.parse('')).toThrow();
    });
  });

  describe('UUID validation', () => {
    const UUIDSchema = z.string().uuid();

    it('should accept valid UUID', () => {
      expect(() => UUIDSchema.parse('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      expect(() => UUIDSchema.parse('not-a-uuid')).toThrow();
      expect(() => UUIDSchema.parse('12345')).toThrow();
      expect(() => UUIDSchema.parse('')).toThrow();
    });
  });

  describe('String length validation', () => {
    const TitleSchema = z.string().min(1).max(200);

    it('should accept valid length', () => {
      expect(() => TitleSchema.parse('Valid Title')).not.toThrow();
      expect(() => TitleSchema.parse('A')).not.toThrow();
      expect(() => TitleSchema.parse('A'.repeat(200))).not.toThrow();
    });

    it('should reject empty string', () => {
      expect(() => TitleSchema.parse('')).toThrow();
    });

    it('should reject too long string', () => {
      expect(() => TitleSchema.parse('A'.repeat(201))).toThrow();
    });
  });

  describe('Number range validation', () => {
    const TemperatureSchema = z.number().min(0).max(2);

    it('should accept valid range', () => {
      expect(() => TemperatureSchema.parse(0)).not.toThrow();
      expect(() => TemperatureSchema.parse(1)).not.toThrow();
      expect(() => TemperatureSchema.parse(2)).not.toThrow();
      expect(() => TemperatureSchema.parse(0.5)).not.toThrow();
    });

    it('should reject out of range', () => {
      expect(() => TemperatureSchema.parse(-1)).toThrow();
      expect(() => TemperatureSchema.parse(3)).toThrow();
    });

    it('should reject non-number', () => {
      expect(() => TemperatureSchema.parse('1' as any)).toThrow();
    });
  });

  describe('Enum validation', () => {
    const StatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);

    it('should accept valid enum values', () => {
      expect(() => StatusSchema.parse('TODO')).not.toThrow();
      expect(() => StatusSchema.parse('IN_PROGRESS')).not.toThrow();
      expect(() => StatusSchema.parse('DONE')).not.toThrow();
    });

    it('should reject invalid enum values', () => {
      expect(() => StatusSchema.parse('INVALID')).toThrow();
      expect(() => StatusSchema.parse('todo')).toThrow(); // Case sensitive
      expect(() => StatusSchema.parse('')).toThrow();
    });
  });

  describe('Array validation', () => {
    const TagsSchema = z.array(z.string());

    it('should accept valid array', () => {
      expect(() => TagsSchema.parse([])).not.toThrow();
      expect(() => TagsSchema.parse(['tag1', 'tag2'])).not.toThrow();
    });

    it('should reject invalid array items', () => {
      expect(() => TagsSchema.parse([1, 2, 3] as any)).toThrow();
      expect(() => TagsSchema.parse(['valid', 123] as any)).toThrow();
    });

    it('should reject non-array', () => {
      expect(() => TagsSchema.parse('not-an-array' as any)).toThrow();
    });
  });

  describe('Optional fields with defaults', () => {
    const ConfigSchema = z.object({
      required: z.string(),
      optional: z.string().optional(),
      withDefault: z.string().default('default-value'),
    });

    it('should accept with all fields', () => {
      const result = ConfigSchema.parse({
        required: 'value',
        optional: 'optional-value',
        withDefault: 'custom-value',
      });

      expect(result.required).toBe('value');
      expect(result.optional).toBe('optional-value');
      expect(result.withDefault).toBe('custom-value');
    });

    it('should accept without optional field', () => {
      const result = ConfigSchema.parse({
        required: 'value',
      });

      expect(result.required).toBe('value');
      expect(result.optional).toBeUndefined();
      expect(result.withDefault).toBe('default-value');
    });

    it('should reject without required field', () => {
      expect(() => ConfigSchema.parse({})).toThrow();
    });
  });

  describe('Datetime validation', () => {
    const DateSchema = z.string().datetime();

    it('should accept valid ISO datetime', () => {
      expect(() => DateSchema.parse('2025-10-26T12:00:00Z')).not.toThrow();
      expect(() => DateSchema.parse('2025-10-26T12:00:00.000Z')).not.toThrow();
    });

    it('should reject invalid datetime', () => {
      expect(() => DateSchema.parse('2025-10-26')).toThrow();
      expect(() => DateSchema.parse('not-a-date')).toThrow();
      expect(() => DateSchema.parse('')).toThrow();
    });
  });

  describe('Nested object validation', () => {
    const UserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
      settings: z.object({
        theme: z.enum(['light', 'dark']),
        notifications: z.boolean(),
      }),
    });

    it('should accept valid nested object', () => {
      const result = UserSchema.parse({
        name: 'John',
        email: 'john@example.com',
        settings: {
          theme: 'dark',
          notifications: true,
        },
      });

      expect(result.name).toBe('John');
      expect(result.settings.theme).toBe('dark');
    });

    it('should reject invalid nested field', () => {
      expect(() =>
        UserSchema.parse({
          name: 'John',
          email: 'john@example.com',
          settings: {
            theme: 'invalid',
            notifications: true,
          },
        })
      ).toThrow();
    });

    it('should reject missing nested field', () => {
      expect(() =>
        UserSchema.parse({
          name: 'John',
          email: 'john@example.com',
          settings: {
            theme: 'dark',
          },
        })
      ).toThrow();
    });
  });

  describe('Union types', () => {
    const ValueSchema = z.union([z.string(), z.number()]);

    it('should accept string', () => {
      expect(() => ValueSchema.parse('text')).not.toThrow();
    });

    it('should accept number', () => {
      expect(() => ValueSchema.parse(123)).not.toThrow();
    });

    it('should reject other types', () => {
      expect(() => ValueSchema.parse(true as any)).toThrow();
      expect(() => ValueSchema.parse({} as any)).toThrow();
    });
  });

  describe('Refinements (custom validation)', () => {
    const PasswordSchema = z
      .string()
      .min(8)
      .refine((val) => /[A-Z]/.test(val), {
        message: 'Password must contain at least one uppercase letter',
      })
      .refine((val) => /[0-9]/.test(val), {
        message: 'Password must contain at least one number',
      });

    it('should accept valid password', () => {
      expect(() => PasswordSchema.parse('MyPass123')).not.toThrow();
    });

    it('should reject too short', () => {
      expect(() => PasswordSchema.parse('Pass1')).toThrow();
    });

    it('should reject without uppercase', () => {
      expect(() => PasswordSchema.parse('mypass123')).toThrow();
    });

    it('should reject without number', () => {
      expect(() => PasswordSchema.parse('MyPassword')).toThrow();
    });
  });

  describe('Transform and coerce', () => {
    const NumberStringSchema = z.string().transform((val) => parseInt(val, 10));

    it('should transform string to number', () => {
      const result = NumberStringSchema.parse('123');
      expect(result).toBe(123);
      expect(typeof result).toBe('number');
    });

    const CoerceSchema = z.coerce.number();

    it('should coerce string to number', () => {
      expect(CoerceSchema.parse('456')).toBe(456);
    });

    it('should keep number as number', () => {
      expect(CoerceSchema.parse(789)).toBe(789);
    });
  });
});

describe('API Request Validation Patterns', () => {
  describe('Pagination parameters', () => {
    const PaginationSchema = z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    });

    it('should apply defaults', () => {
      const result = PaginationSchema.parse({});
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should accept custom values', () => {
      const result = PaginationSchema.parse({ limit: 10, offset: 20 });
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('should reject invalid limit', () => {
      expect(() => PaginationSchema.parse({ limit: 0 })).toThrow();
      expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
    });

    it('should reject negative offset', () => {
      expect(() => PaginationSchema.parse({ offset: -1 })).toThrow();
    });
  });

  describe('Filter parameters', () => {
    const FilterSchema = z.object({
      status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      search: z.string().min(1).max(100).optional(),
      tags: z.array(z.string()).optional(),
    });

    it('should accept no filters', () => {
      const result = FilterSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept all filters', () => {
      const result = FilterSchema.parse({
        status: 'ACTIVE',
        search: 'keyword',
        tags: ['tag1', 'tag2'],
      });

      expect(result.status).toBe('ACTIVE');
      expect(result.search).toBe('keyword');
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    it('should reject invalid status', () => {
      expect(() => FilterSchema.parse({ status: 'INVALID' })).toThrow();
    });

    it('should reject empty search', () => {
      expect(() => FilterSchema.parse({ search: '' })).toThrow();
    });
  });
});
