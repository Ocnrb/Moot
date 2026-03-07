/**
 * AvatarGenerator Module Tests
 * Tests for deterministic SVG avatar generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
    generateAvatar,
    generateAvatarDataUri,
    getAvatar,
    clearAvatarCache,
    getAddressColor,
    avatarGenerator
} from '../../src/js/ui/AvatarGenerator.js';

describe('AvatarGenerator', () => {
    // Clear cache before each test to ensure isolation
    beforeEach(() => {
        clearAvatarCache();
    });

    describe('generateAvatar', () => {
        it('should return valid SVG string', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const svg = generateAvatar(address);
            expect(svg).toContain('<svg');
            expect(svg).toContain('</svg>');
            expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
        });

        it('should generate consistent avatar for same address', () => {
            const address = '0xabcdef1234567890abcdef1234567890abcdef12';
            const svg1 = generateAvatar(address);
            const svg2 = generateAvatar(address);
            expect(svg1).toBe(svg2);
        });

        it('should generate different avatars for different addresses', () => {
            const svg1 = generateAvatar('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
            const svg2 = generateAvatar('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
            expect(svg1).not.toBe(svg2);
        });

        it('should be case-insensitive for addresses', () => {
            const address = '0xAbCdEf1234567890ABCDEF1234567890abcdef12';
            const svg1 = generateAvatar(address.toLowerCase());
            const svg2 = generateAvatar(address.toUpperCase());
            expect(svg1).toBe(svg2);
        });

        it('should use default size of 32', () => {
            const svg = generateAvatar('0x1234567890abcdef1234567890abcdef12345678');
            expect(svg).toContain('width="32"');
            expect(svg).toContain('height="32"');
            expect(svg).toContain('viewBox="0 0 32 32"');
        });

        it('should respect custom size', () => {
            const svg = generateAvatar('0x1234567890abcdef1234567890abcdef12345678', 64);
            expect(svg).toContain('width="64"');
            expect(svg).toContain('height="64"');
            expect(svg).toContain('viewBox="0 0 64 64"');
        });

        it('should respect custom border radius', () => {
            const svg1 = generateAvatar('0x1234567890abcdef1234567890abcdef12345678', 32, 0);
            const svg2 = generateAvatar('0x1234567890abcdef1234567890abcdef12345678', 32, 0.5);
            // rx should be different
            expect(svg1).toContain('rx="0"');
            expect(svg2).toContain('rx="16"'); // 32 * 0.5
        });

        it('should handle null address with fallback', () => {
            const svg = generateAvatar(null);
            expect(svg).toContain('<svg');
            expect(svg).toContain('</svg>');
        });

        it('should handle undefined address with fallback', () => {
            const svg = generateAvatar(undefined);
            expect(svg).toContain('<svg');
            expect(svg).toContain('</svg>');
        });

        it('should handle empty string with fallback', () => {
            const svg = generateAvatar('');
            expect(svg).toContain('<svg');
            expect(svg).toContain('</svg>');
        });

        it('should include rect for background', () => {
            const svg = generateAvatar('0x1234567890abcdef1234567890abcdef12345678');
            expect(svg).toContain('<rect');
            expect(svg).toContain('fill="');
        });

        it('should include path for shape', () => {
            const svg = generateAvatar('0x1234567890abcdef1234567890abcdef12345678');
            expect(svg).toContain('<path');
            expect(svg).toContain('d="');
        });

        it('should include transform for rotation', () => {
            const svg = generateAvatar('0x1234567890abcdef1234567890abcdef12345678');
            expect(svg).toContain('transform="rotate(');
        });
    });

    describe('generateAvatarDataUri', () => {
        it('should return valid data URI', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const dataUri = generateAvatarDataUri(address);
            expect(dataUri).toMatch(/^data:image\/svg\+xml,/);
        });

        it('should contain encoded SVG', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const dataUri = generateAvatarDataUri(address);
            expect(dataUri).toContain('%3Csvg');  // Encoded <svg
        });

        it('should be consistent for same address', () => {
            const address = '0xabcdef1234567890abcdef1234567890abcdef12';
            const dataUri1 = generateAvatarDataUri(address);
            const dataUri2 = generateAvatarDataUri(address);
            expect(dataUri1).toBe(dataUri2);
        });
    });

    describe('getAvatar (cached)', () => {
        it('should return same result as generateAvatar', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const generated = generateAvatar(address);
            const cached = getAvatar(address);
            expect(cached).toBe(generated);
        });

        it('should cache results', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const result1 = getAvatar(address);
            const result2 = getAvatar(address);
            expect(result1).toBe(result2);
        });

        it('should use different cache keys for different sizes', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const svg32 = getAvatar(address, 32);
            const svg64 = getAvatar(address, 64);
            expect(svg32).not.toBe(svg64);
        });

        it('should use different cache keys for different border radius', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const svg1 = getAvatar(address, 32, 0);
            const svg2 = getAvatar(address, 32, 0.5);
            expect(svg1).not.toBe(svg2);
        });

        it('should handle null address', () => {
            const svg = getAvatar(null);
            expect(svg).toContain('<svg');
        });
    });

    describe('clearAvatarCache', () => {
        it('should clear the cache without errors', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            getAvatar(address); // Add to cache
            expect(() => clearAvatarCache()).not.toThrow();
        });

        it('should force regeneration after clear', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const svg1 = getAvatar(address);
            clearAvatarCache();
            const svg2 = getAvatar(address);
            // Should still be the same result (deterministic)
            expect(svg1).toBe(svg2);
        });
    });

    describe('getAddressColor', () => {
        it('should return valid hex color', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const color = getAddressColor(address);
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        });

        it('should return consistent color for same address', () => {
            const address = '0xabcdef1234567890abcdef1234567890abcdef12';
            const color1 = getAddressColor(address);
            const color2 = getAddressColor(address);
            expect(color1).toBe(color2);
        });

        it('should be case-insensitive', () => {
            const address = '0xAbCdEf1234567890ABCDEF1234567890abcdef12';
            const color1 = getAddressColor(address.toLowerCase());
            const color2 = getAddressColor(address.toUpperCase());
            expect(color1).toBe(color2);
        });

        it('should return different colors for different addresses', () => {
            const color1 = getAddressColor('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
            const color2 = getAddressColor('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
            // Most likely different (could theoretically collide)
            expect(color1).not.toBe(color2);
        });

        it('should handle null with default color', () => {
            const color = getAddressColor(null);
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        });

        it('should handle undefined with default color', () => {
            const color = getAddressColor(undefined);
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        });

        it('should handle empty string with default color', () => {
            const color = getAddressColor('');
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });

    describe('avatarGenerator singleton', () => {
        it('should have generate method', () => {
            expect(typeof avatarGenerator.generate).toBe('function');
        });

        it('should have generateDataUri method', () => {
            expect(typeof avatarGenerator.generateDataUri).toBe('function');
        });

        it('should have get method', () => {
            expect(typeof avatarGenerator.get).toBe('function');
        });

        it('should have clearCache method', () => {
            expect(typeof avatarGenerator.clearCache).toBe('function');
        });

        it('should have getColor method', () => {
            expect(typeof avatarGenerator.getColor).toBe('function');
        });

        it('should produce same results as direct functions', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            expect(avatarGenerator.generate(address)).toBe(generateAvatar(address));
            expect(avatarGenerator.getColor(address)).toBe(getAddressColor(address));
        });
    });
});
