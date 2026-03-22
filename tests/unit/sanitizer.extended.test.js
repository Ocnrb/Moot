/**
 * sanitizer.js Extended Tests
 * Covers: escapeHtmlFallback (via DOMPurify throw), catch blocks in sanitizeMessageHtml/sanitizeText,
 * isSanitizerAvailable catch, data: URI rejection for non-image/video, iframe without src
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DOMPurify from 'dompurify';
import {
    sanitizeMessageHtml,
    sanitizeText,
    sanitizeUrl,
    isSanitizerAvailable
} from '../../src/js/ui/sanitizer.js';

describe('sanitizer.js extended', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ==================== DOMPurify error fallback paths ====================
    describe('sanitizeMessageHtml fallback on DOMPurify error', () => {
        it('should fall back to HTML escaping when DOMPurify.sanitize throws', () => {
            vi.spyOn(DOMPurify, 'sanitize').mockImplementation(() => {
                throw new Error('DOMPurify crash');
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = sanitizeMessageHtml('<b>Hello</b> & "world"');

            expect(result).toBe('&lt;b&gt;Hello&lt;/b&gt; &amp; &quot;world&quot;');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('DOMPurify error'),
                expect.any(Error)
            );
        });

        it('should escape special characters in fallback', () => {
            vi.spyOn(DOMPurify, 'sanitize').mockImplementation(() => {
                throw new Error('crash');
            });
            vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = sanitizeMessageHtml("Tom's <script> & \"quotes\"");

            expect(result).toBe("Tom&#39;s &lt;script&gt; &amp; &quot;quotes&quot;");
        });
    });

    describe('sanitizeText fallback on DOMPurify error', () => {
        it('should fall back to HTML escaping when DOMPurify.sanitize throws', () => {
            vi.spyOn(DOMPurify, 'sanitize').mockImplementation(() => {
                throw new Error('DOMPurify crash');
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = sanitizeText('<script>alert(1)</script>');

            expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    // ==================== escapeHtmlFallback edge cases ====================
    describe('escapeHtmlFallback (via DOMPurify throw)', () => {
        beforeEach(() => {
            vi.spyOn(DOMPurify, 'sanitize').mockImplementation(() => {
                throw new Error('forced');
            });
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        it('should escape ampersands', () => {
            expect(sanitizeMessageHtml('a & b')).toBe('a &amp; b');
        });

        it('should escape angle brackets', () => {
            expect(sanitizeMessageHtml('<div>')).toBe('&lt;div&gt;');
        });

        it('should escape double quotes', () => {
            expect(sanitizeMessageHtml('"hello"')).toBe('&quot;hello&quot;');
        });

        it('should escape single quotes', () => {
            expect(sanitizeMessageHtml("it's")).toBe("it&#39;s");
        });

        it('should handle string with all special chars', () => {
            expect(sanitizeMessageHtml('&<>"\''))
                .toBe('&amp;&lt;&gt;&quot;&#39;');
        });
    });

    // ==================== isSanitizerAvailable catch ====================
    describe('isSanitizerAvailable error handling', () => {
        it('should return false when DOMPurify.isSupported throws', () => {
            const origDescriptor = Object.getOwnPropertyDescriptor(DOMPurify, 'isSupported');
            Object.defineProperty(DOMPurify, 'isSupported', {
                get() { throw new Error('not supported'); },
                configurable: true
            });

            try {
                expect(isSanitizerAvailable()).toBe(false);
            } finally {
                if (origDescriptor) {
                    Object.defineProperty(DOMPurify, 'isSupported', origDescriptor);
                } else {
                    delete DOMPurify.isSupported;
                }
            }
        });
    });

    // ==================== sanitizeUrl: non-image/video data: URIs ====================
    describe('sanitizeUrl data: URI rejection', () => {
        it('should reject data:application/pdf URIs', () => {
            expect(sanitizeUrl('data:application/pdf;base64,abc')).toBe('');
        });

        it('should reject data:text/plain URIs', () => {
            expect(sanitizeUrl('data:text/plain;base64,abc')).toBe('');
        });

        it('should reject data:application/javascript URIs', () => {
            expect(sanitizeUrl('data:application/javascript,alert(1)')).toBe('');
        });

        it('should reject bare data: URI', () => {
            expect(sanitizeUrl('data:,hello')).toBe('');
        });

        it('should reject data:text/css URIs', () => {
            expect(sanitizeUrl('data:text/css,body{}')).toBe('');
        });
    });

    // ==================== iframe without src (DOMPurify hook branch) ====================
    describe('DOMPurify hook edge cases', () => {
        it('should handle iframe without src attribute', () => {
            const dirty = '<iframe></iframe>';
            const clean = sanitizeMessageHtml(dirty);
            // Should keep iframe tag but not crash
            expect(clean).toContain('<iframe');
        });

        it('should handle iframe with empty src', () => {
            const dirty = '<iframe src=""></iframe>';
            const clean = sanitizeMessageHtml(dirty);
            expect(clean).not.toContain('src=""');
        });
    });
});
