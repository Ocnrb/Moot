/**
 * GasEstimator Module Tests
 * Tests for gas price formatting and estimation utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GasEstimator } from '../../src/js/ui/GasEstimator.js';

describe('GasEstimator', () => {
    describe('formatPOL', () => {
        it('should format very small amounts', () => {
            expect(GasEstimator.formatPOL(1e10)).toBe('< 0.0001 POL'); // 0.00000001 POL
        });

        it('should format small amounts with 4 decimals', () => {
            const wei = 0.001 * 1e18; // 0.001 POL
            expect(GasEstimator.formatPOL(wei)).toBe('~0.0010 POL');
        });

        it('should format medium amounts with 3 decimals', () => {
            const wei = 0.5 * 1e18; // 0.5 POL
            expect(GasEstimator.formatPOL(wei)).toBe('~0.500 POL');
        });

        it('should format larger amounts with 3 decimals', () => {
            const wei = 1.5 * 1e18; // 1.5 POL
            expect(GasEstimator.formatPOL(wei)).toBe('~1.500 POL');
        });

        it('should handle zero', () => {
            expect(GasEstimator.formatPOL(0)).toBe('< 0.0001 POL');
        });
    });

    describe('formatGwei', () => {
        it('should format gwei correctly', () => {
            const wei = 30 * 1e9; // 30 gwei
            expect(GasEstimator.formatGwei(wei)).toBe('30.0 gwei');
        });

        it('should format decimal gwei', () => {
            const wei = 25.5 * 1e9; // 25.5 gwei
            expect(GasEstimator.formatGwei(wei)).toBe('25.5 gwei');
        });

        it('should format low gwei', () => {
            const wei = 1 * 1e9; // 1 gwei
            expect(GasEstimator.formatGwei(wei)).toBe('1.0 gwei');
        });
    });

    describe('formatBalancePOL', () => {
        it('should return "Error" for null', () => {
            expect(GasEstimator.formatBalancePOL(null)).toBe('Error');
        });

        it('should return "Error" for undefined', () => {
            expect(GasEstimator.formatBalancePOL(undefined)).toBe('Error');
        });

        it('should format zero balance', () => {
            expect(GasEstimator.formatBalancePOL(0)).toBe('0 POL');
        });

        it('should format very small balance', () => {
            const wei = 0.00001 * 1e18;
            expect(GasEstimator.formatBalancePOL(wei)).toBe('< 0.0001 POL');
        });

        it('should format small balance with 4 decimals', () => {
            const wei = 0.1234 * 1e18;
            expect(GasEstimator.formatBalancePOL(wei)).toBe('0.1234 POL');
        });

        it('should format medium balance with 3 decimals', () => {
            const wei = 5.678 * 1e18;
            expect(GasEstimator.formatBalancePOL(wei)).toBe('5.678 POL');
        });

        it('should format large balance with 2 decimals', () => {
            const wei = 150.5 * 1e18;
            expect(GasEstimator.formatBalancePOL(wei)).toBe('150.50 POL');
        });
    });

    describe('GAS_UNITS constants', () => {
        it('should have createStream gas estimate', () => {
            expect(GasEstimator.GAS_UNITS.createStream).toBe(420000);
        });

        it('should have setPublicPermissions gas estimate', () => {
            expect(GasEstimator.GAS_UNITS.setPublicPermissions).toBe(80000);
        });

        it('should have setPermissionsBatch gas estimate', () => {
            expect(GasEstimator.GAS_UNITS.setPermissionsBatch).toBe(210000);
        });

        it('should have addStorageNode gas estimate', () => {
            expect(GasEstimator.GAS_UNITS.addStorageNode).toBe(165000);
        });
    });

    describe('RPC_URLS configuration', () => {
        it('should have multiple RPC endpoints', () => {
            expect(GasEstimator.RPC_URLS.length).toBeGreaterThan(1);
        });

        it('should have polygon RPC URLs', () => {
            GasEstimator.RPC_URLS.forEach(url => {
                expect(url).toContain('polygon');
            });
        });
    });

    describe('CACHE_DURATION', () => {
        it('should cache for 1 minute', () => {
            expect(GasEstimator.CACHE_DURATION).toBe(60000);
        });
    });

    describe('getGasPrice (with mocked fetch)', () => {
        beforeEach(() => {
            // Reset cache before each test
            GasEstimator.cachedGasPrice = null;
            GasEstimator.cacheTime = 0;
            GasEstimator.currentRpcIndex = 0;
        });

        it('should return cached value if still valid', async () => {
            const cachedPrice = 30 * 1e9;
            GasEstimator.cachedGasPrice = cachedPrice;
            GasEstimator.cacheTime = Date.now();
            
            const price = await GasEstimator.getGasPrice();
            expect(price).toBe(cachedPrice);
        });

        it('should return fallback if cache expired and RPC fails', async () => {
            // Set expired cache
            GasEstimator.cachedGasPrice = 20 * 1e9;
            GasEstimator.cacheTime = Date.now() - 120000; // 2 minutes ago
            
            // Mock fetch to fail
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            
            const price = await GasEstimator.getGasPrice();
            
            // Should return fallback 30 gwei
            expect(price).toBe(30 * 1e9);
            
            globalThis.fetch = originalFetch;
        });
    });

    describe('estimateCosts', () => {
        beforeEach(() => {
            // Set a known cached gas price
            GasEstimator.cachedGasPrice = 30 * 1e9; // 30 gwei
            GasEstimator.cacheTime = Date.now();
        });

        it('should calculate public channel cost', async () => {
            const costs = await GasEstimator.estimateCosts();
            
            // Public = createStream + setPublicPermissions + addStorageNode
            const expectedGas = 420000 + 80000 + 165000; // 665000
            const expectedCost = 30 * 1e9 * expectedGas;
            
            expect(costs.public).toBe(expectedCost);
        });

        it('should calculate native channel cost', async () => {
            const costs = await GasEstimator.estimateCosts();
            
            // Native = createStream + setPermissionsBatch + addStorageNode
            const expectedGas = 420000 + 210000 + 165000; // 795000
            const expectedCost = 30 * 1e9 * expectedGas;
            
            expect(costs.native).toBe(expectedCost);
        });

        it('should have password cost equal to public cost', async () => {
            const costs = await GasEstimator.estimateCosts();
            expect(costs.password).toBe(costs.public);
        });

        it('should return formatted values', async () => {
            const costs = await GasEstimator.estimateCosts();
            
            expect(costs.formatted.public).toContain('POL');
            expect(costs.formatted.password).toContain('POL');
            expect(costs.formatted.native).toContain('POL');
            expect(costs.formatted.gasPrice).toContain('gwei');
        });

        it('should return current gas price', async () => {
            const costs = await GasEstimator.estimateCosts();
            expect(costs.gasPrice).toBe(30 * 1e9);
        });
    });
});
