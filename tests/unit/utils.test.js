/**
 * UI Utils Module Tests
 * Tests for HTML escaping, formatting, and URL utilities
 */

import { describe, it, expect } from 'vitest';
import { 
    escapeHtml,
    escapeAttr,
    formatAddress,
    isValidMediaUrl,
    addressToColor,
    linkify,
    embedYouTubeLinks
} from '../../src/js/ui/utils.js';

describe('utils', () => {
    describe('escapeHtml', () => {
        it('should escape < and >', () => {
            expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
        });

        it('should escape ampersand', () => {
            expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
        });

        it('should escape quotes', () => {
            expect(escapeHtml('"double" and \'single\'')).toBe('&quot;double&quot; and &#39;single&#39;');
        });

        it('should handle all special chars together', () => {
            const dirty = '<script>alert("xss" & \'test\')</script>';
            const clean = escapeHtml(dirty);
            expect(clean).toBe('&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;');
        });

        it('should handle empty string', () => {
            expect(escapeHtml('')).toBe('');
        });

        it('should handle null', () => {
            expect(escapeHtml(null)).toBe('');
        });

        it('should handle undefined', () => {
            expect(escapeHtml(undefined)).toBe('');
        });

        it('should convert numbers to string', () => {
            expect(escapeHtml(123)).toBe('123');
        });

        it('should preserve safe text', () => {
            expect(escapeHtml('Hello World!')).toBe('Hello World!');
        });
    });

    describe('escapeAttr', () => {
        it('should be an alias for escapeHtml', () => {
            const input = '<"test" & \'value\'>';
            expect(escapeAttr(input)).toBe(escapeHtml(input));
        });
    });

    describe('formatAddress', () => {
        it('should format full address with ellipsis', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            expect(formatAddress(address)).toBe('0x1234...5678');
        });

        it('should handle short address', () => {
            const address = '0x12345678';
            expect(formatAddress(address)).toBe('0x1234...5678');
        });

        it('should return Unknown for empty address', () => {
            expect(formatAddress('')).toBe('Unknown');
        });

        it('should return Unknown for null', () => {
            expect(formatAddress(null)).toBe('Unknown');
        });

        it('should return Unknown for undefined', () => {
            expect(formatAddress(undefined)).toBe('Unknown');
        });
    });

    describe('isValidMediaUrl', () => {
        describe('Valid URLs', () => {
            it('should accept https URLs', () => {
                expect(isValidMediaUrl('https://example.com/image.jpg')).toBe(true);
            });

            it('should accept http URLs', () => {
                expect(isValidMediaUrl('http://example.com/video.mp4')).toBe(true);
            });

            it('should accept data:image URLs', () => {
                expect(isValidMediaUrl('data:image/png;base64,abc123')).toBe(true);
            });

            it('should accept data:video URLs', () => {
                expect(isValidMediaUrl('data:video/mp4;base64,abc123')).toBe(true);
            });

            it('should accept blob URLs', () => {
                expect(isValidMediaUrl('blob:https://example.com/abc-123')).toBe(true);
            });
        });

        describe('Invalid URLs', () => {
            it('should reject javascript: URLs', () => {
                expect(isValidMediaUrl('javascript:alert(1)')).toBe(false);
            });

            it('should reject data:text/html URLs', () => {
                expect(isValidMediaUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
            });

            it('should reject file: URLs', () => {
                expect(isValidMediaUrl('file:///etc/passwd')).toBe(false);
            });

            it('should reject empty string', () => {
                expect(isValidMediaUrl('')).toBe(false);
            });

            it('should reject null', () => {
                expect(isValidMediaUrl(null)).toBe(false);
            });

            it('should reject undefined', () => {
                expect(isValidMediaUrl(undefined)).toBe(false);
            });

            it('should reject non-string values', () => {
                expect(isValidMediaUrl(123)).toBe(false);
                expect(isValidMediaUrl({})).toBe(false);
            });

            it('should reject invalid URLs', () => {
                expect(isValidMediaUrl('not-a-url')).toBe(false);
            });
        });
    });

    describe('addressToColor', () => {
        it('should return consistent color for same address', () => {
            const address = '0x1234567890abcdef1234567890abcdef12345678';
            const color1 = addressToColor(address);
            const color2 = addressToColor(address);
            expect(color1).toBe(color2);
        });

        it('should return different colors for different addresses', () => {
            const color1 = addressToColor('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
            const color2 = addressToColor('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
            // Different addresses should have different colors (most of the time)
            // This could theoretically collide, but it's unlikely
            expect(color1).not.toBe(color2);
        });

        it('should return valid hex color', () => {
            const color = addressToColor('0x1234567890abcdef1234567890abcdef12345678');
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });

    describe('linkify', () => {
        it('should convert https URL to link', () => {
            const text = 'Check https://example.com for more';
            const result = linkify(text);
            expect(result).toContain('<a');
            expect(result).toContain('href="https://example.com"');
            expect(result).toContain('target="_blank"');
            expect(result).toContain('rel="noopener noreferrer"');
        });

        it('should convert http URL to link', () => {
            const text = 'Visit http://example.com';
            const result = linkify(text);
            expect(result).toContain('href="http://example.com"');
        });

        it('should handle multiple URLs', () => {
            const text = 'Visit https://a.com and https://b.com';
            const result = linkify(text);
            expect(result.match(/<a/g)).toHaveLength(2);
        });

        it('should truncate long URLs in display', () => {
            const longUrl = 'https://example.com/very/long/path/that/exceeds/fifty/characters/total';
            const text = `Check ${longUrl} out`;
            const result = linkify(text);
            expect(result).toContain('...');
        });

        it('should preserve original href for long URLs', () => {
            const longUrl = 'https://example.com/very/long/path/that/exceeds/fifty/characters';
            const text = `Check ${longUrl} out`;
            const result = linkify(text);
            expect(result).toContain(`href="${longUrl}"`);
        });

        it('should handle empty string', () => {
            expect(linkify('')).toBe('');
        });

        it('should handle null', () => {
            expect(linkify(null)).toBe('');
        });

        it('should not linkify text without URLs', () => {
            const text = 'Just plain text';
            expect(linkify(text)).toBe(text);
        });

        it('should not create links for javascript: protocol', () => {
            // This would need to be pre-escaped to test properly
            const text = 'javascript:alert(1)';
            const result = linkify(text);
            expect(result).not.toContain('<a');
        });

        it('should handle URLs with query parameters', () => {
            const text = 'Check https://example.com?foo=1&bar=2';
            const result = linkify(text);
            expect(result).toContain('<a');
        });

        it('should add proper CSS class to links', () => {
            const text = 'https://example.com';
            const result = linkify(text);
            expect(result).toContain('class="text-[#F6851B]');
        });
    });

    describe('embedYouTubeLinks', () => {
        it('should embed YouTube watch URLs', () => {
            const html = '<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">Video</a>';
            const result = embedYouTubeLinks(html);
            expect(result).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
            expect(result).toContain('class="youtube-embed"');
        });

        it('should embed youtu.be short URLs', () => {
            const html = '<a href="https://youtu.be/dQw4w9WgXcQ" target="_blank">Video</a>';
            const result = embedYouTubeLinks(html);
            expect(result).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
        });

        it('should embed YouTube shorts URLs', () => {
            const html = '<a href="https://www.youtube.com/shorts/dQw4w9WgXcQ" target="_blank">Video</a>';
            const result = embedYouTubeLinks(html);
            expect(result).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
        });

        it('should preserve original link when embedding', () => {
            const html = '<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">Video</a>';
            const result = embedYouTubeLinks(html);
            expect(result).toContain('youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result).toContain('youtube-nocookie.com/embed');
        });

        it('should use privacy-enhanced embed (youtube-nocookie)', () => {
            const html = '<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">Video</a>';
            const result = embedYouTubeLinks(html);
            expect(result).toContain('youtube-nocookie.com');
            expect(result).not.toContain('youtube.com/embed');
        });

        it('should add iframe with proper attributes', () => {
            const html = '<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">Video</a>';
            const result = embedYouTubeLinks(html);
            expect(result).toContain('<iframe');
            expect(result).toContain('allowfullscreen');
            expect(result).toContain('loading="lazy"');
        });

        it('should handle empty string', () => {
            expect(embedYouTubeLinks('')).toBe('');
        });

        it('should handle null', () => {
            expect(embedYouTubeLinks(null)).toBe('');
        });

        it('should not embed non-YouTube links', () => {
            const html = '<a href="https://vimeo.com/123456" target="_blank">Video</a>';
            const result = embedYouTubeLinks(html);
            expect(result).not.toContain('youtube-nocookie.com/embed');
            expect(result).toBe(html);
        });

        it('should not embed invalid video IDs', () => {
            // Video IDs must be exactly 11 chars
            const html = '<a href="https://www.youtube.com/watch?v=short" target="_blank">Video</a>';
            const result = embedYouTubeLinks(html);
            expect(result).not.toContain('<iframe');
        });

        it('should handle multiple YouTube links', () => {
            const html = '<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">V1</a> <a href="https://youtu.be/xG0vi6eMxJo" target="_blank">V2</a>';
            const result = embedYouTubeLinks(html);
            expect(result.match(/youtube-nocookie\.com\/embed/g)).toHaveLength(2);
        });
    });
});
