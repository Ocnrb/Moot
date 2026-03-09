/**
 * Configuration Module Tests
 * Tests for centralized application configuration
 */

import { describe, it, expect } from 'vitest';
import { CONFIG, getRpcEndpoints, getNetworkParams } from '../../src/js/config.js';

describe('config', () => {
    describe('CONFIG object', () => {
        it('should have network configuration', () => {
            expect(CONFIG.network).toBeDefined();
            expect(CONFIG.network.chainId).toBe(137);
            expect(CONFIG.network.name).toBe('Polygon Mainnet');
        });

        it('should have valid currency config', () => {
            expect(CONFIG.network.currency.symbol).toBe('POL');
            expect(CONFIG.network.currency.decimals).toBe(18);
        });

        it('should have at least one RPC endpoint', () => {
            expect(CONFIG.network.rpcEndpoints).toBeDefined();
            expect(Array.isArray(CONFIG.network.rpcEndpoints)).toBe(true);
            expect(CONFIG.network.rpcEndpoints.length).toBeGreaterThan(0);
        });

        it('should have retry configuration', () => {
            expect(CONFIG.retry).toBeDefined();
            expect(CONFIG.retry.maxAttempts).toBeGreaterThan(0);
            expect(CONFIG.retry.baseDelayMs).toBeGreaterThan(0);
        });

        it('should have stream configuration', () => {
            expect(CONFIG.stream).toBeDefined();
            expect(CONFIG.stream.initialMessages).toBeGreaterThan(0);
            expect(CONFIG.stream.loadMoreCount).toBeGreaterThan(0);
        });

        it('should have storage configuration', () => {
            expect(CONFIG.storage).toBeDefined();
            expect(CONFIG.storage.logstoreNode).toMatch(/^0x[a-fA-F0-9]+$/);
            expect(['streamr', 'logstore']).toContain(CONFIG.storage.defaultProvider);
        });

        it('should have app metadata', () => {
            expect(CONFIG.app).toBeDefined();
            expect(CONFIG.app.name).toBe('pombo');
            expect(CONFIG.app.version).toBeDefined();
        });
    });

    describe('getRpcEndpoints', () => {
        it('should return array of objects with url property', () => {
            const endpoints = getRpcEndpoints();
            expect(Array.isArray(endpoints)).toBe(true);
            endpoints.forEach(endpoint => {
                expect(endpoint).toHaveProperty('url');
                expect(typeof endpoint.url).toBe('string');
            });
        });

        it('should return valid HTTP(S) URLs', () => {
            const endpoints = getRpcEndpoints();
            endpoints.forEach(endpoint => {
                expect(endpoint.url).toMatch(/^https?:\/\//);
            });
        });

        it('should return same number of endpoints as config', () => {
            const endpoints = getRpcEndpoints();
            expect(endpoints.length).toBe(CONFIG.network.rpcEndpoints.length);
        });
    });

    describe('getNetworkParams', () => {
        it('should return correctly formatted chainId', () => {
            const params = getNetworkParams();
            expect(params.chainId).toBe('0x89'); // 137 in hex
        });

        it('should include chain name', () => {
            const params = getNetworkParams();
            expect(params.chainName).toBe(CONFIG.network.name);
        });

        it('should include native currency', () => {
            const params = getNetworkParams();
            expect(params.nativeCurrency).toEqual(CONFIG.network.currency);
        });

        it('should include RPC URLs array', () => {
            const params = getNetworkParams();
            expect(Array.isArray(params.rpcUrls)).toBe(true);
            expect(params.rpcUrls).toEqual(CONFIG.network.rpcEndpoints);
        });

        it('should include block explorer URLs', () => {
            const params = getNetworkParams();
            expect(Array.isArray(params.blockExplorerUrls)).toBe(true);
            expect(params.blockExplorerUrls).toContain(CONFIG.network.blockExplorer);
        });
    });
});
