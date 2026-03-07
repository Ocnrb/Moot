/**
 * MessageGrouper Module Tests
 * Tests for message grouping logic (stack effect)
 */

import { describe, it, expect } from 'vitest';
import { 
    GroupPosition,
    SpacingType,
    analyzeMessageGroups,
    getGroupPositionClass,
    shouldShowSenderName,
    analyzeSpacing,
    getSpacingClass
} from '../../src/js/ui/MessageGrouper.js';

describe('MessageGrouper', () => {
    // Helper to create test messages
    const createMessage = (sender, timestamp) => ({
        sender,
        timestamp,
        content: 'Test message'
    });

    const SENDER_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const SENDER_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const NOW = Date.now();
    const ONE_MINUTE = 60 * 1000;
    const THREE_MINUTES = 3 * 60 * 1000;

    describe('GroupPosition enum', () => {
        it('should have all position types', () => {
            expect(GroupPosition.SINGLE).toBe('single');
            expect(GroupPosition.FIRST).toBe('first');
            expect(GroupPosition.MIDDLE).toBe('middle');
            expect(GroupPosition.LAST).toBe('last');
        });
    });

    describe('analyzeMessageGroups', () => {
        it('should return empty array for empty input', () => {
            expect(analyzeMessageGroups([])).toEqual([]);
        });

        it('should return empty array for null input', () => {
            expect(analyzeMessageGroups(null)).toEqual([]);
        });

        it('should return empty array for undefined input', () => {
            expect(analyzeMessageGroups(undefined)).toEqual([]);
        });

        it('should mark single message as SINGLE', () => {
            const messages = [createMessage(SENDER_A, NOW)];
            const positions = analyzeMessageGroups(messages);
            expect(positions).toEqual([GroupPosition.SINGLE]);
        });

        it('should mark two consecutive messages from same sender as FIRST and LAST', () => {
            const messages = [
                createMessage(SENDER_A, NOW),
                createMessage(SENDER_A, NOW + ONE_MINUTE)
            ];
            const positions = analyzeMessageGroups(messages);
            expect(positions).toEqual([GroupPosition.FIRST, GroupPosition.LAST]);
        });

        it('should mark three consecutive messages from same sender correctly', () => {
            const messages = [
                createMessage(SENDER_A, NOW),
                createMessage(SENDER_A, NOW + ONE_MINUTE),
                createMessage(SENDER_A, NOW + ONE_MINUTE * 1.5)
            ];
            const positions = analyzeMessageGroups(messages);
            expect(positions).toEqual([
                GroupPosition.FIRST,
                GroupPosition.MIDDLE,
                GroupPosition.LAST
            ]);
        });

        it('should mark messages from different senders as SINGLE', () => {
            const messages = [
                createMessage(SENDER_A, NOW),
                createMessage(SENDER_B, NOW + ONE_MINUTE)
            ];
            const positions = analyzeMessageGroups(messages);
            expect(positions).toEqual([GroupPosition.SINGLE, GroupPosition.SINGLE]);
        });

        it('should break group when time gap exceeds 2 minutes', () => {
            const messages = [
                createMessage(SENDER_A, NOW),
                createMessage(SENDER_A, NOW + THREE_MINUTES) // More than 2 min gap
            ];
            const positions = analyzeMessageGroups(messages);
            expect(positions).toEqual([GroupPosition.SINGLE, GroupPosition.SINGLE]);
        });

        it('should handle complex conversation pattern', () => {
            const messages = [
                createMessage(SENDER_A, NOW),                    // A starts
                createMessage(SENDER_A, NOW + ONE_MINUTE),       // A continues
                createMessage(SENDER_B, NOW + ONE_MINUTE * 1.5), // B interrupts
                createMessage(SENDER_A, NOW + ONE_MINUTE * 2),   // A responds
            ];
            const positions = analyzeMessageGroups(messages);
            expect(positions).toEqual([
                GroupPosition.FIRST,   // A first
                GroupPosition.LAST,    // A last (before B)
                GroupPosition.SINGLE,  // B single (between A groups)
                GroupPosition.SINGLE   // A single (after B)
            ]);
        });

        it('should break group on different days', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(23, 59, 0, 0);
            
            const today = new Date();
            today.setHours(0, 1, 0, 0);
            
            const messages = [
                createMessage(SENDER_A, yesterday.getTime()),
                createMessage(SENDER_A, today.getTime()) // Same sender, different day
            ];
            const positions = analyzeMessageGroups(messages);
            expect(positions).toEqual([GroupPosition.SINGLE, GroupPosition.SINGLE]);
        });

        it('should be case-insensitive for sender addresses', () => {
            const messages = [
                createMessage(SENDER_A.toLowerCase(), NOW),
                createMessage(SENDER_A.toUpperCase(), NOW + ONE_MINUTE)
            ];
            const positions = analyzeMessageGroups(messages);
            expect(positions).toEqual([GroupPosition.FIRST, GroupPosition.LAST]);
        });
    });

    describe('getGroupPositionClass', () => {
        it('should return correct class for FIRST', () => {
            expect(getGroupPositionClass(GroupPosition.FIRST)).toBe('msg-group-first');
        });

        it('should return correct class for MIDDLE', () => {
            expect(getGroupPositionClass(GroupPosition.MIDDLE)).toBe('msg-group-middle');
        });

        it('should return correct class for LAST', () => {
            expect(getGroupPositionClass(GroupPosition.LAST)).toBe('msg-group-last');
        });

        it('should return correct class for SINGLE', () => {
            expect(getGroupPositionClass(GroupPosition.SINGLE)).toBe('msg-group-single');
        });

        it('should return single class for unknown position', () => {
            expect(getGroupPositionClass('unknown')).toBe('msg-group-single');
        });

        it('should return single class for undefined', () => {
            expect(getGroupPositionClass(undefined)).toBe('msg-group-single');
        });
    });

    describe('shouldShowSenderName', () => {
        it('should show sender name for SINGLE', () => {
            expect(shouldShowSenderName(GroupPosition.SINGLE)).toBe(true);
        });

        it('should show sender name for FIRST', () => {
            expect(shouldShowSenderName(GroupPosition.FIRST)).toBe(true);
        });

        it('should NOT show sender name for MIDDLE', () => {
            expect(shouldShowSenderName(GroupPosition.MIDDLE)).toBe(false);
        });

        it('should NOT show sender name for LAST', () => {
            expect(shouldShowSenderName(GroupPosition.LAST)).toBe(false);
        });
    });

    describe('SpacingType enum', () => {
        it('should have all spacing types', () => {
            expect(SpacingType.STACK).toBe('stack');
            expect(SpacingType.PING_PONG).toBe('ping-pong');
            expect(SpacingType.SAME_SIDE).toBe('same-side');
        });
    });

    describe('analyzeSpacing', () => {
        const CURRENT_USER = SENDER_A;

        it('should return empty array for empty input', () => {
            expect(analyzeSpacing([], CURRENT_USER)).toEqual([]);
        });

        it('should return empty array for null input', () => {
            expect(analyzeSpacing(null, CURRENT_USER)).toEqual([]);
        });

        it('should return null for first message spacing', () => {
            const messages = [createMessage(SENDER_A, NOW)];
            const spacings = analyzeSpacing(messages, CURRENT_USER);
            expect(spacings[0]).toBeNull();
        });

        it('should return STACK for same sender grouped messages', () => {
            const messages = [
                createMessage(SENDER_A, NOW),
                createMessage(SENDER_A, NOW + ONE_MINUTE)
            ];
            const spacings = analyzeSpacing(messages, CURRENT_USER);
            expect(spacings).toEqual([null, SpacingType.STACK]);
        });

        it('should return PING_PONG for messages from different sides', () => {
            const messages = [
                createMessage(SENDER_A, NOW),    // Own message (right side)
                createMessage(SENDER_B, NOW + ONE_MINUTE)  // Other message (left side)
            ];
            const spacings = analyzeSpacing(messages, CURRENT_USER);
            expect(spacings).toEqual([null, SpacingType.PING_PONG]);
        });

        it('should return SAME_SIDE for different senders on same side', () => {
            const SENDER_C = '0xcccccccccccccccccccccccccccccccccccccccc';
            const messages = [
                createMessage(SENDER_B, NOW),              // Other message (left)
                createMessage(SENDER_C, NOW + ONE_MINUTE)  // Different other (left)
            ];
            const spacings = analyzeSpacing(messages, CURRENT_USER);
            expect(spacings).toEqual([null, SpacingType.SAME_SIDE]);
        });

        it('should return SAME_SIDE when same sender exceeds time threshold', () => {
            const messages = [
                createMessage(SENDER_A, NOW),
                createMessage(SENDER_A, NOW + THREE_MINUTES) // Same sender, but too far apart
            ];
            const spacings = analyzeSpacing(messages, CURRENT_USER);
            expect(spacings).toEqual([null, SpacingType.SAME_SIDE]);
        });
    });

    describe('getSpacingClass', () => {
        it('should return correct class for STACK', () => {
            expect(getSpacingClass(SpacingType.STACK)).toBe('spacing-stack');
        });

        it('should return correct class for PING_PONG', () => {
            expect(getSpacingClass(SpacingType.PING_PONG)).toBe('spacing-ping-pong');
        });

        it('should return correct class for SAME_SIDE', () => {
            expect(getSpacingClass(SpacingType.SAME_SIDE)).toBe('spacing-same-side');
        });

        it('should return empty string for null', () => {
            expect(getSpacingClass(null)).toBe('');
        });

        it('should return empty string for undefined', () => {
            expect(getSpacingClass(undefined)).toBe('');
        });
    });
});
