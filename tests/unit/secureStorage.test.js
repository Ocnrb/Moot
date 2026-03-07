/**
 * SecureStorage Module Tests
 * Tests for guest mode and data accessor functions
 * 
 * Note: Full crypto tests require mocking CryptoKey which is complex.
 * These tests focus on guest mode (memory-only) which doesn't need crypto.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { secureStorage } from '../../src/js/secureStorage.js';

describe('secureStorage', () => {
    // Store original state to restore after tests
    let originalCache;
    let originalIsUnlocked;
    let originalIsGuestMode;
    let originalAddress;

    beforeEach(() => {
        // Save current state
        originalCache = secureStorage.cache;
        originalIsUnlocked = secureStorage.isUnlocked;
        originalIsGuestMode = secureStorage.isGuestMode;
        originalAddress = secureStorage.address;
    });

    afterEach(() => {
        // Restore original state
        secureStorage.cache = originalCache;
        secureStorage.isUnlocked = originalIsUnlocked;
        secureStorage.isGuestMode = originalIsGuestMode;
        secureStorage.address = originalAddress;
    });

    describe('initAsGuest', () => {
        it('should initialize guest mode successfully', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const result = secureStorage.initAsGuest(address);
            
            expect(result).toBe(true);
            expect(secureStorage.isGuestMode).toBe(true);
            expect(secureStorage.isUnlocked).toBe(true);
        });

        it('should normalize address to lowercase', () => {
            const address = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
            secureStorage.initAsGuest(address);
            
            expect(secureStorage.address).toBe(address.toLowerCase());
        });

        it('should initialize empty cache', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            secureStorage.initAsGuest(address);
            
            expect(secureStorage.cache).toBeDefined();
            expect(secureStorage.cache.channels).toEqual([]);
            expect(secureStorage.cache.trustedContacts).toEqual({});
            expect(secureStorage.cache.ensCache).toEqual({});
        });

        it('should not have storage key in guest mode', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            secureStorage.initAsGuest(address);
            
            expect(secureStorage.storageKey).toBeNull();
        });
    });

    describe('Data Accessors (Guest Mode)', () => {
        beforeEach(() => {
            // Initialize guest mode for testing data accessors
            secureStorage.initAsGuest('0x1234567890abcdef1234567890abcdef12345678');
        });

        describe('getChannels / setChannels', () => {
            it('should get empty channels array initially', () => {
                expect(secureStorage.getChannels()).toEqual([]);
            });

            it('should set and get channels', async () => {
                const channels = [
                    { streamId: 'channel-1', name: 'Test 1', type: 'open' },
                    { streamId: 'channel-2', name: 'Test 2', type: 'closed' }
                ];
                
                await secureStorage.setChannels(channels);
                expect(secureStorage.getChannels()).toEqual(channels);
            });
        });

        describe('getUsername / setUsername', () => {
            it('should get null username initially', () => {
                expect(secureStorage.getUsername()).toBeNull();
            });

            it('should set and get username', async () => {
                await secureStorage.setUsername('TestUser');
                expect(secureStorage.getUsername()).toBe('TestUser');
            });
        });

        describe('getTrustedContacts / setTrustedContacts', () => {
            it('should get empty contacts initially', () => {
                expect(secureStorage.getTrustedContacts()).toEqual({});
            });

            it('should set and get contacts', async () => {
                const contacts = {
                    '0xabc': { name: 'Alice', trusted: true },
                    '0xdef': { name: 'Bob', trusted: true }
                };
                
                await secureStorage.setTrustedContacts(contacts);
                expect(secureStorage.getTrustedContacts()).toEqual(contacts);
            });
        });

        describe('getENSCache / setENSCache', () => {
            it('should get empty ENS cache initially', () => {
                expect(secureStorage.getENSCache()).toEqual({});
            });

            it('should set and get ENS cache', async () => {
                const cache = {
                    'vitalik.eth': { address: '0x123', timestamp: Date.now() }
                };
                
                await secureStorage.setENSCache(cache);
                expect(secureStorage.getENSCache()).toEqual(cache);
            });
        });

        describe('getNsfwEnabled / setNsfwEnabled', () => {
            it('should return false by default', () => {
                expect(secureStorage.getNsfwEnabled()).toBe(false);
            });

            it('should set and get nsfw enabled', async () => {
                await secureStorage.setNsfwEnabled(true);
                expect(secureStorage.getNsfwEnabled()).toBe(true);
            });
        });

        describe('getYouTubeEmbedsEnabled / setYouTubeEmbedsEnabled', () => {
            it('should return true by default', () => {
                expect(secureStorage.getYouTubeEmbedsEnabled()).toBe(true);
            });

            it('should set and get youtube embeds enabled', async () => {
                await secureStorage.setYouTubeEmbedsEnabled(false);
                expect(secureStorage.getYouTubeEmbedsEnabled()).toBe(false);
            });
        });

        describe('getGraphApiKey / setGraphApiKey', () => {
            it('should get null api key initially', () => {
                expect(secureStorage.getGraphApiKey()).toBeNull();
            });

            it('should set and get api key', async () => {
                await secureStorage.setGraphApiKey('test-api-key');
                expect(secureStorage.getGraphApiKey()).toBe('test-api-key');
            });
        });

        describe('getSessionData / setSessionData / clearSessionData', () => {
            it('should get null session data initially', () => {
                expect(secureStorage.getSessionData()).toBeNull();
            });

            it('should set and get session data', async () => {
                const sessionData = { token: 'abc123', expires: Date.now() };
                await secureStorage.setSessionData(sessionData);
                expect(secureStorage.getSessionData()).toEqual(sessionData);
            });

            it('should clear session data', async () => {
                await secureStorage.setSessionData({ token: 'abc' });
                await secureStorage.clearSessionData();
                expect(secureStorage.getSessionData()).toBeNull();
            });
        });
    });

    describe('Locked State', () => {
        it('should return empty arrays when not unlocked', () => {
            secureStorage.isUnlocked = false;
            secureStorage.cache = { channels: ['test'] };
            
            expect(secureStorage.getChannels()).toEqual([]);
        });

        it('should return null for username when not unlocked', () => {
            secureStorage.isUnlocked = false;
            secureStorage.cache = { username: 'Test' };
            
            expect(secureStorage.getUsername()).toBeNull();
        });
    });

    describe('getStorageKey', () => {
        it('should return prefixed storage key', () => {
            secureStorage.address = '0xabc123';
            const key = secureStorage.getStorageKey();
            
            expect(key).toBe('pombo_secure_0xabc123');
        });
    });

    describe('saveToStorage (Guest Mode)', () => {
        it('should not persist in guest mode', async () => {
            const localStorageSpy = vi.spyOn(localStorage, 'setItem');
            
            secureStorage.initAsGuest('0x1234567890abcdef1234567890abcdef12345678');
            await secureStorage.setUsername('Test');
            await secureStorage.saveToStorage();
            
            // In guest mode, no localStorage calls should happen
            expect(localStorageSpy).not.toHaveBeenCalled();
            
            localStorageSpy.mockRestore();
        });
    });

    describe('Constants', () => {
        it('should have correct storage prefix', () => {
            expect(secureStorage.STORAGE_PREFIX).toBe('pombo_secure_');
        });

        it('should have reasonable PBKDF2 iterations', () => {
            // Should be at least 100,000 for security
            expect(secureStorage.PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(100000);
        });
    });
});
