/**
 * Sanitizer Module Tests
 * Critical security tests for XSS prevention
 */

import { describe, it, expect } from 'vitest';
import { 
    sanitizeMessageHtml, 
    sanitizeText, 
    sanitizeUrl,
    isSanitizerAvailable 
} from '../../src/js/ui/sanitizer.js';

describe('sanitizer', () => {
    describe('isSanitizerAvailable', () => {
        it('should return true when DOMPurify is available', () => {
            expect(isSanitizerAvailable()).toBe(true);
        });
    });

    describe('sanitizeMessageHtml', () => {
        describe('XSS Prevention', () => {
            it('should remove script tags', () => {
                const dirty = '<p>Hello</p><script>alert("xss")</script>';
                const clean = sanitizeMessageHtml(dirty);
                expect(clean).not.toContain('<script');
                expect(clean).not.toContain('alert');
                expect(clean).toContain('Hello');
            });

            it('should remove inline event handlers', () => {
                const dirty = '<img src="x" onerror="alert(1)">';
                const clean = sanitizeMessageHtml(dirty);
                expect(clean).not.toContain('onerror');
                expect(clean).not.toContain('alert');
            });

            it('should remove onclick handlers', () => {
                const dirty = '<div onclick="alert(1)">Click me</div>';
                const clean = sanitizeMessageHtml(dirty);
                expect(clean).not.toContain('onclick');
            });

            it('should remove onmouseover handlers', () => {
                const dirty = '<span onmouseover="alert(1)">Hover</span>';
                const clean = sanitizeMessageHtml(dirty);
                expect(clean).not.toContain('onmouseover');
            });

            it('should remove javascript: URLs in href', () => {
                const dirty = '<a href="javascript:alert(1)">Click</a>';
                const clean = sanitizeMessageHtml(dirty);
                expect(clean).not.toContain('javascript:');
            });

            it('should remove data:text/html URLs', () => {
                const dirty = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
                const clean = sanitizeMessageHtml(dirty);
                expect(clean).not.toContain('data:text/html');
            });

            it('should remove SVG with onload', () => {
                const dirty = '<svg onload="alert(1)"></svg>';
                const clean = sanitizeMessageHtml(dirty);
                expect(clean).not.toContain('onload');
            });

            // Note: CSS expression() was IE-specific and is not relevant for modern browsers
            // DOMPurify does not sanitize it as it's not a threat in modern environments
        });

        describe('Allowed HTML', () => {
            it('should allow basic formatting tags', () => {
                const safe = '<p><strong>Bold</strong> and <em>italic</em></p>';
                const clean = sanitizeMessageHtml(safe);
                expect(clean).toContain('<strong>');
                expect(clean).toContain('<em>');
            });

            it('should allow line breaks', () => {
                const safe = 'Line 1<br>Line 2';
                const clean = sanitizeMessageHtml(safe);
                expect(clean).toContain('<br');
            });

            it('should allow code tags', () => {
                const safe = '<code>const x = 1;</code>';
                const clean = sanitizeMessageHtml(safe);
                expect(clean).toContain('<code>');
            });

            it('should allow pre tags', () => {
                const safe = '<pre>formatted text</pre>';
                const clean = sanitizeMessageHtml(safe);
                expect(clean).toContain('<pre>');
            });

            it('should allow safe links with http', () => {
                const safe = '<a href="https://example.com">Link</a>';
                const clean = sanitizeMessageHtml(safe);
                expect(clean).toContain('href="https://example.com"');
            });

            it('should add target="_blank" to links', () => {
                const safe = '<a href="https://example.com">Link</a>';
                const clean = sanitizeMessageHtml(safe);
                expect(clean).toContain('target="_blank"');
            });

            it('should add rel="noopener noreferrer" to links', () => {
                const safe = '<a href="https://example.com">Link</a>';
                const clean = sanitizeMessageHtml(safe);
                expect(clean).toContain('noopener');
                expect(clean).toContain('noreferrer');
            });
        });

        describe('Edge Cases', () => {
            it('should handle empty string', () => {
                expect(sanitizeMessageHtml('')).toBe('');
            });

            it('should handle null', () => {
                expect(sanitizeMessageHtml(null)).toBe('');
            });

            it('should handle undefined', () => {
                expect(sanitizeMessageHtml(undefined)).toBe('');
            });

            it('should preserve plain text', () => {
                const text = 'Hello World!';
                expect(sanitizeMessageHtml(text)).toBe(text);
            });

            it('should handle nested malicious tags', () => {
                const dirty = '<div><script><script>alert(1)</script></script></div>';
                const clean = sanitizeMessageHtml(dirty);
                expect(clean).not.toContain('<script');
            });
        });

        describe('YouTube Embeds', () => {
            it('should allow YouTube nocookie iframes', () => {
                const safe = '<iframe src="https://www.youtube-nocookie.com/embed/abc123"></iframe>';
                const clean = sanitizeMessageHtml(safe);
                expect(clean).toContain('youtube-nocookie.com');
            });

            it('should remove non-YouTube iframes', () => {
                const dirty = '<iframe src="https://evil.com/embed"></iframe>';
                const clean = sanitizeMessageHtml(dirty);
                expect(clean).not.toContain('evil.com');
            });

            it('should remove regular YouTube iframes (not nocookie)', () => {
                const dirty = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>';
                const clean = sanitizeMessageHtml(dirty);
                // Should strip the src but keep the iframe tag
                expect(clean).not.toContain('youtube.com/embed');
            });
        });
    });

    describe('sanitizeText', () => {
        it('should strip all HTML tags', () => {
            const dirty = '<p>Hello <b>World</b></p>';
            const clean = sanitizeText(dirty);
            expect(clean).not.toContain('<');
            expect(clean).not.toContain('>');
            expect(clean).toContain('Hello');
            expect(clean).toContain('World');
        });

        it('should remove script tags completely', () => {
            const dirty = '<script>alert(1)</script>';
            const clean = sanitizeText(dirty);
            expect(clean).not.toContain('script');
            expect(clean).not.toContain('alert');
        });

        it('should handle empty string', () => {
            expect(sanitizeText('')).toBe('');
        });

        it('should handle null', () => {
            expect(sanitizeText(null)).toBe('');
        });

        it('should preserve plain text', () => {
            const text = 'Just plain text';
            expect(sanitizeText(text)).toBe(text);
        });

        it('should strip style tags', () => {
            const dirty = '<style>body{background:red}</style>Content';
            const clean = sanitizeText(dirty);
            expect(clean).not.toContain('<style');
            expect(clean).toContain('Content');
        });
    });

    describe('sanitizeUrl', () => {
        describe('Safe URLs', () => {
            it('should allow https URLs', () => {
                const url = 'https://example.com/page';
                expect(sanitizeUrl(url)).toBe(url);
            });

            it('should allow http URLs', () => {
                const url = 'http://example.com/page';
                expect(sanitizeUrl(url)).toBe(url);
            });

            it('should allow mailto URLs', () => {
                const url = 'mailto:test@example.com';
                expect(sanitizeUrl(url)).toBe(url);
            });

            it('should allow data:image URLs', () => {
                const url = 'data:image/png;base64,abc123';
                expect(sanitizeUrl(url)).toBe(url);
            });

            it('should allow data:video URLs', () => {
                const url = 'data:video/mp4;base64,abc123';
                expect(sanitizeUrl(url)).toBe(url);
            });

            it('should allow blob URLs', () => {
                const url = 'blob:https://example.com/abc-123';
                expect(sanitizeUrl(url)).toBe(url);
            });
        });

        describe('Dangerous URLs', () => {
            it('should reject javascript: URLs', () => {
                expect(sanitizeUrl('javascript:alert(1)')).toBe('');
            });

            it('should reject javascript: with spaces', () => {
                expect(sanitizeUrl('  javascript:alert(1)')).toBe('');
            });

            it('should reject javascript: case insensitive', () => {
                expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
            });

            it('should reject data:text/html URLs', () => {
                expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
            });

            it('should reject vbscript: URLs', () => {
                expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
            });

            it('should reject invalid URLs', () => {
                expect(sanitizeUrl('not-a-valid-url')).toBe('');
            });

            it('should reject file: protocol', () => {
                expect(sanitizeUrl('file:///etc/passwd')).toBe('');
            });
        });

        describe('Edge Cases', () => {
            it('should handle empty string', () => {
                expect(sanitizeUrl('')).toBe('');
            });

            it('should handle null', () => {
                expect(sanitizeUrl(null)).toBe('');
            });

            it('should handle undefined', () => {
                expect(sanitizeUrl(undefined)).toBe('');
            });

            it('should handle URLs with query strings', () => {
                const url = 'https://example.com/search?q=test&page=1';
                expect(sanitizeUrl(url)).toBe(url);
            });

            it('should handle URLs with hash', () => {
                const url = 'https://example.com/page#section';
                expect(sanitizeUrl(url)).toBe(url);
            });
        });
    });
});
