/**
 * Tests for DropdownManager.js - Dropdown menu management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dropdownManager } from '../../src/js/ui/DropdownManager.js';

describe('DropdownManager', () => {
    beforeEach(() => {
        // Reset dependencies
        dropdownManager.deps = {};
        
        // Clear any existing dropdowns
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    describe('setDependencies()', () => {
        it('should set dependencies', () => {
            const onChannelMenuAction = vi.fn();
            dropdownManager.setDependencies({ onChannelMenuAction });
            expect(dropdownManager.deps.onChannelMenuAction).toBe(onChannelMenuAction);
        });
        
        it('should merge with existing dependencies', () => {
            dropdownManager.setDependencies({ dep1: 'value1' });
            dropdownManager.setDependencies({ dep2: 'value2' });
            expect(dropdownManager.deps.dep1).toBe('value1');
            expect(dropdownManager.deps.dep2).toBe('value2');
        });
        
        it('should override existing dependencies', () => {
            dropdownManager.setDependencies({ dep1: 'old' });
            dropdownManager.setDependencies({ dep1: 'new' });
            expect(dropdownManager.deps.dep1).toBe('new');
        });
    });

    describe('closeChannelDropdown()', () => {
        it('should remove channel dropdown menu from DOM', () => {
            const dropdown = document.createElement('div');
            dropdown.id = 'channel-dropdown-menu';
            document.body.appendChild(dropdown);
            
            expect(document.getElementById('channel-dropdown-menu')).not.toBeNull();
            
            dropdownManager.closeChannelDropdown();
            
            expect(document.getElementById('channel-dropdown-menu')).toBeNull();
        });
        
        it('should do nothing if no dropdown exists', () => {
            // Should not throw
            dropdownManager.closeChannelDropdown();
            expect(document.getElementById('channel-dropdown-menu')).toBeNull();
        });
    });

    describe('closeAllDropdowns()', () => {
        it('should close channel dropdown', () => {
            const channelDropdown = document.createElement('div');
            channelDropdown.id = 'channel-dropdown-menu';
            document.body.appendChild(channelDropdown);
            
            dropdownManager.closeAllDropdowns();
            
            expect(document.getElementById('channel-dropdown-menu')).toBeNull();
        });
        
        it('should close user dropdown', () => {
            const userDropdown = document.createElement('div');
            userDropdown.id = 'user-dropdown-menu';
            document.body.appendChild(userDropdown);
            
            dropdownManager.closeAllDropdowns();
            
            expect(document.getElementById('user-dropdown-menu')).toBeNull();
        });
        
        it('should close both dropdowns simultaneously', () => {
            const channelDropdown = document.createElement('div');
            channelDropdown.id = 'channel-dropdown-menu';
            const userDropdown = document.createElement('div');
            userDropdown.id = 'user-dropdown-menu';
            document.body.appendChild(channelDropdown);
            document.body.appendChild(userDropdown);
            
            dropdownManager.closeAllDropdowns();
            
            expect(document.getElementById('channel-dropdown-menu')).toBeNull();
            expect(document.getElementById('user-dropdown-menu')).toBeNull();
        });
        
        it('should handle no dropdowns gracefully', () => {
            // Should not throw
            dropdownManager.closeAllDropdowns();
        });
    });

    describe('showChannelDropdown()', () => {
        let menuBtn;
        let mockChannel;
        
        beforeEach(() => {
            // Create menu button with mocked getBoundingClientRect
            menuBtn = document.createElement('button');
            document.body.appendChild(menuBtn);
            
            // Mock getBoundingClientRect
            menuBtn.getBoundingClientRect = vi.fn(() => ({
                left: 100,
                right: 140,
                top: 50,
                bottom: 80,
                width: 40,
                height: 30
            }));
            
            // Mock window dimensions
            Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
            Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
            
            mockChannel = {
                id: 'test-channel',
                name: 'Test Channel'
            };
        });
        
        it('should return early if no channel provided', () => {
            dropdownManager.showChannelDropdown({}, menuBtn, null);
            expect(document.getElementById('channel-dropdown-menu')).toBeNull();
        });
        
        it('should create dropdown menu', () => {
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            expect(dropdown).not.toBeNull();
        });
        
        it('should close existing dropdown before creating new one', () => {
            // Create existing dropdown
            const existingDropdown = document.createElement('div');
            existingDropdown.id = 'channel-dropdown-menu';
            existingDropdown.innerHTML = 'Old content';
            document.body.appendChild(existingDropdown);
            
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            expect(dropdown.innerHTML).not.toBe('Old content');
        });
        
        it('should include Copy Channel ID button', () => {
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            const copyBtn = dropdown.querySelector('[data-action="copy-stream-id"]');
            expect(copyBtn).not.toBeNull();
            expect(copyBtn.textContent).toContain('Copy Channel ID');
        });
        
        it('should include Channel Details button', () => {
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            const detailsBtn = dropdown.querySelector('[data-action="channel-settings"]');
            expect(detailsBtn).not.toBeNull();
            expect(detailsBtn.textContent).toContain('Channel Details');
        });
        
        it('should include Leave Channel button when not in preview mode', () => {
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel, false);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            const leaveBtn = dropdown.querySelector('[data-action="leave-channel"]');
            expect(leaveBtn).not.toBeNull();
            expect(leaveBtn.textContent).toContain('Leave Channel');
        });
        
        it('should NOT include Leave Channel button in preview mode', () => {
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel, true);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            const leaveBtn = dropdown.querySelector('[data-action="leave-channel"]');
            expect(leaveBtn).toBeNull();
        });
        
        it('should position dropdown below button', () => {
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            expect(dropdown.style.left).toBe('100px');
            expect(dropdown.style.top).toBe('84px'); // bottom (80) + 4
        });
        
        it('should adjust position if dropdown would go off right edge', () => {
            // Move button to right edge
            menuBtn.getBoundingClientRect = vi.fn(() => ({
                left: 900,
                right: 940,
                top: 50,
                bottom: 80,
                width: 40,
                height: 30
            }));
            
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            // Should align to right side of button
            const leftVal = parseInt(dropdown.style.left);
            // Left should be less than 900 (positioned to avoid overflow)
            expect(leftVal).toBeLessThanOrEqual(940);
        });
        
        it('should have correct CSS classes', () => {
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            expect(dropdown.classList.contains('fixed')).toBe(true);
            expect(dropdown.className).toContain('z-[9999]');
        });
        
        it('should call onChannelMenuAction when action button clicked', async () => {
            const onChannelMenuAction = vi.fn();
            dropdownManager.setDependencies({ onChannelMenuAction });
            
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            const copyBtn = dropdown.querySelector('[data-action="copy-stream-id"]');
            
            await copyBtn.click();
            
            expect(onChannelMenuAction).toHaveBeenCalledWith('copy-stream-id');
        });
        
        it('should close dropdown after action clicked', async () => {
            dropdownManager.setDependencies({ onChannelMenuAction: vi.fn() });
            
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const copyBtn = document.querySelector('[data-action="copy-stream-id"]');
            await copyBtn.click();
            
            expect(document.getElementById('channel-dropdown-menu')).toBeNull();
        });
        
        it('should stop propagation on action click', async () => {
            const stopPropagation = vi.fn();
            const mockEvent = { stopPropagation };
            
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            const copyBtn = dropdown.querySelector('[data-action="copy-stream-id"]');
            
            // Create a click event manually
            const clickEvent = new MouseEvent('click', { bubbles: true });
            vi.spyOn(clickEvent, 'stopPropagation');
            copyBtn.dispatchEvent(clickEvent);
            
            expect(clickEvent.stopPropagation).toHaveBeenCalled();
        });
        
        it('should handle missing onChannelMenuAction callback', async () => {
            // No dependencies set
            dropdownManager.showChannelDropdown({}, menuBtn, mockChannel);
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            const copyBtn = dropdown.querySelector('[data-action="copy-stream-id"]');
            
            // Should not throw
            await copyBtn.click();
        });
    });

    describe('dropdown action buttons', () => {
        let menuBtn;
        
        beforeEach(() => {
            menuBtn = document.createElement('button');
            document.body.appendChild(menuBtn);
            menuBtn.getBoundingClientRect = vi.fn(() => ({
                left: 100, right: 140, top: 50, bottom: 80, width: 40, height: 30
            }));
        });
        
        it('should trigger copy-stream-id action', async () => {
            const onChannelMenuAction = vi.fn();
            dropdownManager.setDependencies({ onChannelMenuAction });
            
            dropdownManager.showChannelDropdown({}, menuBtn, { id: 'ch' });
            document.querySelector('[data-action="copy-stream-id"]').click();
            
            expect(onChannelMenuAction).toHaveBeenCalledWith('copy-stream-id');
        });
        
        it('should trigger channel-settings action', async () => {
            const onChannelMenuAction = vi.fn();
            dropdownManager.setDependencies({ onChannelMenuAction });
            
            dropdownManager.showChannelDropdown({}, menuBtn, { id: 'ch' });
            document.querySelector('[data-action="channel-settings"]').click();
            
            expect(onChannelMenuAction).toHaveBeenCalledWith('channel-settings');
        });
        
        it('should trigger leave-channel action', async () => {
            const onChannelMenuAction = vi.fn();
            dropdownManager.setDependencies({ onChannelMenuAction });
            
            dropdownManager.showChannelDropdown({}, menuBtn, { id: 'ch' }, false);
            document.querySelector('[data-action="leave-channel"]').click();
            
            expect(onChannelMenuAction).toHaveBeenCalledWith('leave-channel');
        });
    });

    describe('edge cases', () => {
        it('should handle multiple dropdown opens without errors', () => {
            const menuBtn = document.createElement('button');
            document.body.appendChild(menuBtn);
            menuBtn.getBoundingClientRect = vi.fn(() => ({
                left: 100, right: 140, top: 50, bottom: 80, width: 40, height: 30
            }));
            
            const channel = { id: 'test' };
            
            // Open multiple times
            dropdownManager.showChannelDropdown({}, menuBtn, channel);
            dropdownManager.showChannelDropdown({}, menuBtn, channel);
            dropdownManager.showChannelDropdown({}, menuBtn, channel);
            
            // Should only have one dropdown
            const dropdowns = document.querySelectorAll('#channel-dropdown-menu');
            expect(dropdowns.length).toBe(1);
        });
        
        it('should handle undefined channel name', () => {
            const menuBtn = document.createElement('button');
            document.body.appendChild(menuBtn);
            menuBtn.getBoundingClientRect = vi.fn(() => ({
                left: 100, right: 140, top: 50, bottom: 80, width: 40, height: 30
            }));
            
            dropdownManager.showChannelDropdown({}, menuBtn, { id: 'test' });
            
            const dropdown = document.getElementById('channel-dropdown-menu');
            expect(dropdown).not.toBeNull();
        });
    });
});
