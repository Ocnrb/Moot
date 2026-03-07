/**
 * Tests for subscriptionManager.js - Dynamic subscription lifecycle management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before import
vi.mock('../../src/js/logger.js', () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

vi.mock('../../src/js/streamr.js', () => ({
    streamrController: {
        unsubscribe: vi.fn(),
        unsubscribeFromDualStream: vi.fn(),
        subscribe: vi.fn(),
        resend: vi.fn().mockResolvedValue([]),
        isInitialized: vi.fn().mockReturnValue(true),
        publish: vi.fn()
    },
    STREAM_CONFIG: { partitions: 1 },
    deriveEphemeralId: vi.fn((id) => `${id}/ephemeral`)
}));

vi.mock('../../src/js/channels.js', () => ({
    channelManager: {
        getChannel: vi.fn(),
        getAllChannels: vi.fn().mockReturnValue([]),
        subscribeToChannel: vi.fn().mockResolvedValue(undefined),
        startPresenceTracking: vi.fn(),
        stopPresenceTracking: vi.fn(),
        handlePresenceMessage: vi.fn(),
        handleTextMessage: vi.fn(),
        handleMediaMessage: vi.fn()
    }
}));

vi.mock('../../src/js/secureStorage.js', () => ({
    secureStorage: {
        isStorageUnlocked: vi.fn().mockReturnValue(true),
        getAllChannelLastAccess: vi.fn().mockReturnValue({}),
        getLastOpenedChannel: vi.fn().mockReturnValue(null),
        setLastOpenedChannel: vi.fn()
    }
}));

vi.mock('../../src/js/auth.js', () => ({
    authManager: {
        getAddress: vi.fn().mockReturnValue('0xmyaddress')
    }
}));

vi.mock('../../src/js/identity.js', () => ({
    identityManager: {
        getCurrentIdentity: vi.fn().mockReturnValue({ nickname: 'Test', address: '0xtest' })
    }
}));

vi.mock('../../src/js/media.js', () => ({
    mediaController: {
        processIncomingMediaChunk: vi.fn()
    }
}));

// Import after mocks
import { subscriptionManager } from '../../src/js/subscriptionManager.js';
import { channelManager } from '../../src/js/channels.js';
import { streamrController } from '../../src/js/streamr.js';
import { secureStorage } from '../../src/js/secureStorage.js';

describe('SubscriptionManager', () => {
    beforeEach(() => {
        // Reset state
        subscriptionManager.activeChannelId = null;
        subscriptionManager.previewChannelId = null;
        subscriptionManager.previewPresenceInterval = null;
        subscriptionManager.backgroundPoller = null;
        subscriptionManager.channelActivity.clear();
        subscriptionManager.activityHandlers = [];
        subscriptionManager.pollIndex = 0;
        subscriptionManager.isPolling = false;
        
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        
        // Clean up intervals
        if (subscriptionManager.previewPresenceInterval) {
            clearInterval(subscriptionManager.previewPresenceInterval);
        }
        if (subscriptionManager.backgroundPoller) {
            clearInterval(subscriptionManager.backgroundPoller);
        }
    });

    describe('constructor', () => {
        it('should initialize with null active channel', () => {
            expect(subscriptionManager.activeChannelId).toBeNull();
        });
        
        it('should initialize with null preview channel', () => {
            expect(subscriptionManager.previewChannelId).toBeNull();
        });
        
        it('should have empty activity map', () => {
            expect(subscriptionManager.channelActivity).toBeInstanceOf(Map);
            expect(subscriptionManager.channelActivity.size).toBe(0);
        });
        
        it('should have configuration defaults', () => {
            expect(subscriptionManager.config.POLL_INTERVAL).toBe(30000);
            expect(subscriptionManager.config.POLL_BATCH_SIZE).toBe(3);
        });
    });

    describe('setActiveChannel()', () => {
        it('should set active channel id', async () => {
            await subscriptionManager.setActiveChannel('stream1');
            
            expect(subscriptionManager.activeChannelId).toBe('stream1');
        });
        
        it('should call channelManager.subscribeToChannel', async () => {
            await subscriptionManager.setActiveChannel('stream1');
            
            expect(channelManager.subscribeToChannel).toHaveBeenCalledWith('stream1', null);
        });
        
        it('should pass password to subscribeToChannel', async () => {
            await subscriptionManager.setActiveChannel('stream1', 'secret123');
            
            expect(channelManager.subscribeToChannel).toHaveBeenCalledWith('stream1', 'secret123');
        });
        
        it('should not change if same channel already active', async () => {
            subscriptionManager.activeChannelId = 'stream1';
            
            await subscriptionManager.setActiveChannel('stream1');
            
            expect(channelManager.subscribeToChannel).not.toHaveBeenCalled();
        });
        
        it('should downgrade previous active channel', async () => {
            subscriptionManager.activeChannelId = 'old-stream';
            channelManager.getChannel.mockReturnValue({ messages: [], ephemeralStreamId: 'old-stream/ephemeral' });
            
            await subscriptionManager.setActiveChannel('new-stream');
            
            expect(streamrController.unsubscribeFromDualStream).toHaveBeenCalled();
        });
        
        it('should warn on null streamId', async () => {
            await subscriptionManager.setActiveChannel(null);
            
            expect(subscriptionManager.activeChannelId).toBeNull();
        });
    });

    describe('clearActiveChannel()', () => {
        it('should downgrade active channel', async () => {
            subscriptionManager.activeChannelId = 'stream1';
            channelManager.getChannel.mockReturnValue({ messages: [], ephemeralStreamId: 'stream1/ephemeral' });
            
            await subscriptionManager.clearActiveChannel();
            
            expect(streamrController.unsubscribeFromDualStream).toHaveBeenCalled();
        });
        
        it('should set activeChannelId to null', async () => {
            subscriptionManager.activeChannelId = 'stream1';
            channelManager.getChannel.mockReturnValue({ messages: [], ephemeralStreamId: 'stream1/ephemeral' });
            
            await subscriptionManager.clearActiveChannel();
            
            expect(subscriptionManager.activeChannelId).toBeNull();
        });
    });

    describe('isActiveChannel()', () => {
        it('should return true for active channel', () => {
            subscriptionManager.activeChannelId = 'stream1';
            
            expect(subscriptionManager.isActiveChannel('stream1')).toBe(true);
        });
        
        it('should return false for non-active channel', () => {
            subscriptionManager.activeChannelId = 'stream1';
            
            expect(subscriptionManager.isActiveChannel('stream2')).toBe(false);
        });
        
        it('should return false when no active channel', () => {
            expect(subscriptionManager.isActiveChannel('stream1')).toBe(false);
        });
    });

    describe('getActiveChannelId()', () => {
        it('should return active channel id', () => {
            subscriptionManager.activeChannelId = 'stream1';
            
            expect(subscriptionManager.getActiveChannelId()).toBe('stream1');
        });
        
        it('should return null when no active channel', () => {
            expect(subscriptionManager.getActiveChannelId()).toBeNull();
        });
    });

    describe('Preview Mode', () => {
        describe('isInPreviewMode()', () => {
            it('should return false when no preview channel', () => {
                expect(subscriptionManager.isInPreviewMode()).toBe(false);
            });
            
            it('should return true when preview channel active', () => {
                subscriptionManager.previewChannelId = 'preview-stream';
                
                expect(subscriptionManager.isInPreviewMode()).toBe(true);
            });
        });

        describe('getPreviewChannelId()', () => {
            it('should return preview channel id', () => {
                subscriptionManager.previewChannelId = 'preview-stream';
                
                expect(subscriptionManager.getPreviewChannelId()).toBe('preview-stream');
            });
            
            it('should return null when not in preview mode', () => {
                expect(subscriptionManager.getPreviewChannelId()).toBeNull();
            });
        });

        describe('clearPreviewChannel()', () => {
            it('should clear preview channel id', async () => {
                subscriptionManager.previewChannelId = 'preview-stream';
                
                await subscriptionManager.clearPreviewChannel();
                
                expect(subscriptionManager.previewChannelId).toBeNull();
            });
            
            it('should stop preview presence interval', async () => {
                subscriptionManager.previewChannelId = 'preview-stream';
                subscriptionManager.previewPresenceInterval = setInterval(() => {}, 1000);
                
                await subscriptionManager.clearPreviewChannel();
                
                expect(subscriptionManager.previewPresenceInterval).toBeNull();
            });
        });
    });

    describe('Activity Tracking', () => {
        describe('getChannelActivity()', () => {
            it('should return activity for tracked channel', () => {
                const activity = { lastMessageTime: Date.now(), unreadCount: 5 };
                subscriptionManager.channelActivity.set('stream1', activity);
                
                const result = subscriptionManager.getChannelActivity('stream1');
                
                expect(result).toBe(activity);
            });
            
            it('should return null for untracked channel', () => {
                expect(subscriptionManager.getChannelActivity('unknown')).toBeNull();
            });
        });

        describe('getUnreadCount()', () => {
            it('should return unread count', () => {
                subscriptionManager.channelActivity.set('stream1', { unreadCount: 10 });
                
                expect(subscriptionManager.getUnreadCount('stream1')).toBe(10);
            });
            
            it('should return 0 for untracked channel', () => {
                expect(subscriptionManager.getUnreadCount('unknown')).toBe(0);
            });
        });

        describe('clearUnreadCount()', () => {
            it('should clear unread count', () => {
                subscriptionManager.channelActivity.set('stream1', { unreadCount: 10 });
                
                subscriptionManager.clearUnreadCount('stream1');
                
                expect(subscriptionManager.getUnreadCount('stream1')).toBe(0);
            });
            
            it('should handle untracked channel gracefully', () => {
                // Should not throw
                subscriptionManager.clearUnreadCount('unknown');
            });
        });
    });

    describe('Event Handlers', () => {
        describe('onActivity()', () => {
            it('should register activity handler', () => {
                const handler = vi.fn();
                
                subscriptionManager.onActivity(handler);
                
                expect(subscriptionManager.activityHandlers).toContain(handler);
            });
        });

        describe('offActivity()', () => {
            it('should remove activity handler', () => {
                const handler = vi.fn();
                subscriptionManager.activityHandlers = [handler];
                
                subscriptionManager.offActivity(handler);
                
                expect(subscriptionManager.activityHandlers).not.toContain(handler);
            });
        });

        describe('notifyActivityHandlers()', () => {
            it('should call all handlers with activity data', () => {
                const handler1 = vi.fn();
                const handler2 = vi.fn();
                subscriptionManager.activityHandlers = [handler1, handler2];
                const activity = { unreadCount: 5 };
                
                subscriptionManager.notifyActivityHandlers('stream1', activity);
                
                expect(handler1).toHaveBeenCalledWith('stream1', activity);
                expect(handler2).toHaveBeenCalledWith('stream1', activity);
            });
            
            it('should continue on handler error', () => {
                const handler1 = vi.fn().mockImplementation(() => { throw new Error('fail'); });
                const handler2 = vi.fn();
                subscriptionManager.activityHandlers = [handler1, handler2];
                
                subscriptionManager.notifyActivityHandlers('stream1', {});
                
                expect(handler2).toHaveBeenCalled();
            });
        });
    });

    describe('Background Polling', () => {
        describe('startBackgroundPoller()', () => {
            it('should set interval for polling', () => {
                subscriptionManager.startBackgroundPoller();
                
                expect(subscriptionManager.backgroundPoller).not.toBeNull();
            });
            
            it('should not start if already running', () => {
                subscriptionManager.backgroundPoller = setInterval(() => {}, 1000);
                const originalPoller = subscriptionManager.backgroundPoller;
                
                subscriptionManager.startBackgroundPoller();
                
                expect(subscriptionManager.backgroundPoller).toBe(originalPoller);
            });
        });

        describe('stopBackgroundPoller()', () => {
            it('should clear background poller interval', () => {
                subscriptionManager.backgroundPoller = setInterval(() => {}, 1000);
                
                subscriptionManager.stopBackgroundPoller();
                
                expect(subscriptionManager.backgroundPoller).toBeNull();
            });
            
            it('should handle null poller gracefully', () => {
                subscriptionManager.backgroundPoller = null;
                
                // Should not throw
                subscriptionManager.stopBackgroundPoller();
            });
        });

        describe('initializeActivityState()', () => {
            it('should initialize activity for all channels', () => {
                channelManager.getAllChannels.mockReturnValue([
                    { messageStreamId: 'stream1', messages: [] },
                    { messageStreamId: 'stream2', messages: [] }
                ]);
                
                subscriptionManager.initializeActivityState();
                
                expect(subscriptionManager.channelActivity.has('stream1')).toBe(true);
                expect(subscriptionManager.channelActivity.has('stream2')).toBe(true);
            });
            
            it('should use lastAccess time from storage when available', () => {
                secureStorage.getAllChannelLastAccess.mockReturnValue({
                    'stream1': 5000
                });
                channelManager.getAllChannels.mockReturnValue([
                    { messageStreamId: 'stream1', messages: [] }
                ]);
                
                subscriptionManager.initializeActivityState();
                
                const activity = subscriptionManager.channelActivity.get('stream1');
                expect(activity.lastMessageTime).toBe(5000);
            });
            
            it('should set unreadCount to 0 initially', () => {
                channelManager.getAllChannels.mockReturnValue([
                    { messageStreamId: 'stream1', messages: [] }
                ]);
                
                subscriptionManager.initializeActivityState();
                
                const activity = subscriptionManager.channelActivity.get('stream1');
                expect(activity.unreadCount).toBe(0);
            });
        });
    });

    describe('updateConfig()', () => {
        it('should update config values', () => {
            subscriptionManager.updateConfig({ POLL_INTERVAL: 60000 });
            
            expect(subscriptionManager.config.POLL_INTERVAL).toBe(60000);
        });
        
        it('should preserve existing config values', () => {
            const originalBatchSize = subscriptionManager.config.POLL_BATCH_SIZE;
            
            subscriptionManager.updateConfig({ POLL_INTERVAL: 60000 });
            
            expect(subscriptionManager.config.POLL_BATCH_SIZE).toBe(originalBatchSize);
        });
    });

    describe('removeChannel()', () => {
        it('should remove channel activity', async () => {
            subscriptionManager.channelActivity.set('stream1', { unreadCount: 5 });
            
            await subscriptionManager.removeChannel('stream1');
            
            expect(subscriptionManager.channelActivity.has('stream1')).toBe(false);
        });
        
        it('should clear active channel if removed', async () => {
            subscriptionManager.activeChannelId = 'stream1';
            
            await subscriptionManager.removeChannel('stream1');
            
            expect(subscriptionManager.activeChannelId).toBeNull();
        });
        
        it('should reset lastOpenedChannel if pointing to removed channel', async () => {
            secureStorage.getLastOpenedChannel.mockReturnValue('stream1');
            
            await subscriptionManager.removeChannel('stream1');
            
            expect(secureStorage.setLastOpenedChannel).toHaveBeenCalledWith(null);
        });
    });

    describe('cleanup()', () => {
        it('should stop background poller', async () => {
            subscriptionManager.backgroundPoller = setInterval(() => {}, 1000);
            
            await subscriptionManager.cleanup();
            
            expect(subscriptionManager.backgroundPoller).toBeNull();
        });
        
        it('should clear preview channel', async () => {
            subscriptionManager.previewChannelId = 'preview';
            
            await subscriptionManager.cleanup();
            
            expect(subscriptionManager.previewChannelId).toBeNull();
        });
        
        it('should clear active channel', async () => {
            subscriptionManager.activeChannelId = 'active';
            channelManager.getChannel.mockReturnValue({ messages: [], ephemeralStreamId: 'active/ephemeral' });
            
            await subscriptionManager.cleanup();
            
            expect(subscriptionManager.activeChannelId).toBeNull();
        });
        
        it('should clear activity map', async () => {
            subscriptionManager.channelActivity.set('stream1', { unreadCount: 5 });
            
            await subscriptionManager.cleanup();
            
            expect(subscriptionManager.channelActivity.size).toBe(0);
        });
    });
});
