/**
 * Crypto Module Tests
 * Tests for encryption utilities and key management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cryptoManager } from '../../src/js/crypto.js';

describe('cryptoManager', () => {
    beforeEach(() => {
        // Clear cache before each test
        cryptoManager.clearCache();
    });

    describe('arrayBufferToBase64', () => {
        it('should convert Uint8Array to base64', () => {
            const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
            const result = cryptoManager.arrayBufferToBase64(bytes);
            expect(result).toBe('SGVsbG8=');
        });

        it('should handle empty array', () => {
            const bytes = new Uint8Array([]);
            const result = cryptoManager.arrayBufferToBase64(bytes);
            expect(result).toBe('');
        });

        it('should handle single byte', () => {
            const bytes = new Uint8Array([65]); // 'A'
            const result = cryptoManager.arrayBufferToBase64(bytes);
            expect(result).toBe('QQ==');
        });

        it('should handle binary data', () => {
            const bytes = new Uint8Array([0, 255, 128, 64]);
            const result = cryptoManager.arrayBufferToBase64(bytes);
            expect(atob(result)).toBe(String.fromCharCode(0, 255, 128, 64));
        });
    });

    describe('base64ToArrayBuffer', () => {
        it('should convert base64 to Uint8Array', () => {
            const base64 = 'SGVsbG8='; // "Hello"
            const result = cryptoManager.base64ToArrayBuffer(base64);
            expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
        });

        it('should handle empty string', () => {
            const result = cryptoManager.base64ToArrayBuffer('');
            expect(result).toEqual(new Uint8Array([]));
        });

        it('should handle single character base64', () => {
            const result = cryptoManager.base64ToArrayBuffer('QQ==');
            expect(result).toEqual(new Uint8Array([65]));
        });

        it('should roundtrip with arrayBufferToBase64', () => {
            const original = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
            const base64 = cryptoManager.arrayBufferToBase64(original);
            const result = cryptoManager.base64ToArrayBuffer(base64);
            expect(result).toEqual(original);
        });
    });

    describe('generateSalt', () => {
        it('should generate 16 byte salt', () => {
            const salt = cryptoManager.generateSalt();
            expect(salt).toBeInstanceOf(Uint8Array);
            expect(salt.length).toBe(16);
        });

        it('should generate different salts each time', () => {
            const salt1 = cryptoManager.generateSalt();
            const salt2 = cryptoManager.generateSalt();
            // Very unlikely to be equal
            expect(salt1).not.toEqual(salt2);
        });
    });

    describe('generateIV', () => {
        it('should generate 12 byte IV', () => {
            const iv = cryptoManager.generateIV();
            expect(iv).toBeInstanceOf(Uint8Array);
            expect(iv.length).toBe(12);
        });

        it('should generate different IVs each time', () => {
            const iv1 = cryptoManager.generateIV();
            const iv2 = cryptoManager.generateIV();
            // Very unlikely to be equal
            expect(iv1).not.toEqual(iv2);
        });
    });

    describe('generateRandomHex', () => {
        it('should generate default 32 character hex (16 bytes)', () => {
            const hex = cryptoManager.generateRandomHex();
            expect(hex).toMatch(/^[0-9a-f]{32}$/);
        });

        it('should generate specified length', () => {
            const hex = cryptoManager.generateRandomHex(8);
            expect(hex).toMatch(/^[0-9a-f]{16}$/); // 8 bytes = 16 hex chars
        });

        it('should generate different hex each time', () => {
            const hex1 = cryptoManager.generateRandomHex();
            const hex2 = cryptoManager.generateRandomHex();
            expect(hex1).not.toBe(hex2);
        });

        it('should handle single byte', () => {
            const hex = cryptoManager.generateRandomHex(1);
            expect(hex).toMatch(/^[0-9a-f]{2}$/);
        });
    });

    describe('sha256', () => {
        it('should hash empty string', async () => {
            const hash = await cryptoManager.sha256('');
            // SHA-256 of empty string
            expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        });

        it('should hash "hello"', async () => {
            const hash = await cryptoManager.sha256('hello');
            // SHA-256 of "hello"
            expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
        });

        it('should produce different hashes for different inputs', async () => {
            const hash1 = await cryptoManager.sha256('input1');
            const hash2 = await cryptoManager.sha256('input2');
            expect(hash1).not.toBe(hash2);
        });

        it('should produce consistent hash for same input', async () => {
            const hash1 = await cryptoManager.sha256('test');
            const hash2 = await cryptoManager.sha256('test');
            expect(hash1).toBe(hash2);
        });

        it('should return 64 character hex string', async () => {
            const hash = await cryptoManager.sha256('anything');
            expect(hash).toMatch(/^[0-9a-f]{64}$/);
        });
    });

    describe('getCacheKey', () => {
        it('should create cache key from password and salt', () => {
            const password = 'testpass';
            const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            const key = cryptoManager.getCacheKey(password, salt);
            expect(key).toContain('testpass:');
            expect(key).toContain('0102030405060708090a0b0c0d0e0f10');
        });

        it('should create different keys for different passwords', () => {
            const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            const key1 = cryptoManager.getCacheKey('password1', salt);
            const key2 = cryptoManager.getCacheKey('password2', salt);
            expect(key1).not.toBe(key2);
        });

        it('should create different keys for different salts', () => {
            const password = 'testpass';
            const salt1 = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
            const salt2 = new Uint8Array([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
            const key1 = cryptoManager.getCacheKey(password, salt1);
            const key2 = cryptoManager.getCacheKey(password, salt2);
            expect(key1).not.toBe(key2);
        });
    });

    describe('clearCache', () => {
        it('should clear the cache', async () => {
            // Add something to cache
            const salt = cryptoManager.generateSalt();
            await cryptoManager.deriveKey('password', salt);
            
            expect(cryptoManager.getCacheStats().size).toBeGreaterThan(0);
            
            cryptoManager.clearCache();
            
            expect(cryptoManager.getCacheStats().size).toBe(0);
        });
    });

    describe('getCacheStats', () => {
        it('should return cache statistics', () => {
            const stats = cryptoManager.getCacheStats();
            expect(stats).toHaveProperty('size');
            expect(stats).toHaveProperty('maxSize');
            expect(typeof stats.size).toBe('number');
            expect(stats.maxSize).toBe(10);
        });

        it('should reflect cache size changes', async () => {
            const initialSize = cryptoManager.getCacheStats().size;
            
            const salt = cryptoManager.generateSalt();
            await cryptoManager.deriveKey('password', salt);
            
            expect(cryptoManager.getCacheStats().size).toBe(initialSize + 1);
        });
    });

    describe('encrypt/decrypt roundtrip', () => {
        it('should encrypt and decrypt text', async () => {
            const plaintext = 'Hello, World!';
            const password = 'secretpassword123';
            
            const encrypted = await cryptoManager.encrypt(plaintext, password);
            const decrypted = await cryptoManager.decrypt(encrypted, password);
            
            expect(decrypted).toBe(plaintext);
        });

        it('should encrypt and decrypt unicode', async () => {
            const plaintext = '你好世界 🎉 مرحبا';
            const password = 'password';
            
            const encrypted = await cryptoManager.encrypt(plaintext, password);
            const decrypted = await cryptoManager.decrypt(encrypted, password);
            
            expect(decrypted).toBe(plaintext);
        });

        it('should encrypt and decrypt empty string', async () => {
            const plaintext = '';
            const password = 'password';
            
            const encrypted = await cryptoManager.encrypt(plaintext, password);
            const decrypted = await cryptoManager.decrypt(encrypted, password);
            
            expect(decrypted).toBe(plaintext);
        });

        it('should encrypt and decrypt long text', async () => {
            const plaintext = 'A'.repeat(10000);
            const password = 'password';
            
            const encrypted = await cryptoManager.encrypt(plaintext, password);
            const decrypted = await cryptoManager.decrypt(encrypted, password);
            
            expect(decrypted).toBe(plaintext);
        });

        it('should produce different ciphertext for same plaintext', async () => {
            const plaintext = 'Same message';
            const password = 'password';
            
            const encrypted1 = await cryptoManager.encrypt(plaintext, password);
            const encrypted2 = await cryptoManager.encrypt(plaintext, password);
            
            // Due to random salt/IV, ciphertext should be different
            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should fail with wrong password', async () => {
            const plaintext = 'Secret message';
            const password = 'correctpassword';
            const wrongPassword = 'wrongpassword';
            
            const encrypted = await cryptoManager.encrypt(plaintext, password);
            
            await expect(
                cryptoManager.decrypt(encrypted, wrongPassword)
            ).rejects.toThrow();
        });
    });

    describe('encryptJSON/decryptJSON roundtrip', () => {
        it('should encrypt and decrypt object', async () => {
            const obj = { name: 'Test', value: 123, nested: { foo: 'bar' } };
            const password = 'password';
            
            const encrypted = await cryptoManager.encryptJSON(obj, password);
            const decrypted = await cryptoManager.decryptJSON(encrypted, password);
            
            expect(decrypted).toEqual(obj);
        });

        it('should encrypt and decrypt array', async () => {
            const arr = [1, 2, 3, 'four', { five: 5 }];
            const password = 'password';
            
            const encrypted = await cryptoManager.encryptJSON(arr, password);
            const decrypted = await cryptoManager.decryptJSON(encrypted, password);
            
            expect(decrypted).toEqual(arr);
        });

        it('should encrypt and decrypt null', async () => {
            const password = 'password';
            
            const encrypted = await cryptoManager.encryptJSON(null, password);
            const decrypted = await cryptoManager.decryptJSON(encrypted, password);
            
            expect(decrypted).toBeNull();
        });
    });

    describe('key cache LRU behavior', () => {
        it('should cache derived keys', async () => {
            const salt = cryptoManager.generateSalt();
            const password = 'test';
            
            await cryptoManager.deriveKey(password, salt);
            const size1 = cryptoManager.getCacheStats().size;
            
            // Second call with same params should use cache
            await cryptoManager.deriveKey(password, salt);
            const size2 = cryptoManager.getCacheStats().size;
            
            expect(size2).toBe(size1); // No new entry
        });

        it('should evict oldest entries when full', async () => {
            // Fill cache beyond max size
            for (let i = 0; i < 15; i++) {
                const salt = cryptoManager.generateSalt();
                await cryptoManager.deriveKey(`password${i}`, salt);
            }
            
            // Should not exceed max size
            expect(cryptoManager.getCacheStats().size).toBeLessThanOrEqual(10);
        });
    });
});
