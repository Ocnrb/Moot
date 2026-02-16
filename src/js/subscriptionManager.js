/**
 * Subscription Manager
 * Handles dynamic subscription lifecycle for performance optimization
 * 
 * Strategy:
 * - Active channel: Full subscription (all partitions + presence + history)
 * - Background channels: Lightweight polling for activity detection
 * - Lazy partition loading: Media partition only subscribed when needed
 * 
 * This reduces WebSocket connections and network traffic significantly
 * when users have many channels but only actively use one at a time.
 */

import { streamrController, LOGSTORE_CONFIG } from './streamr.js';
import { channelManager } from './channels.js';
import { secureStorage } from './secureStorage.js';
import { Logger } from './logger.js';

class SubscriptionManager {
    constructor() {
        // Active channel state
        this.activeChannelId = null;
        this.activeSubscriptionHandlers = null;
        
        // Background activity tracking
        this.backgroundPoller = null;
        this.channelActivity = new Map(); // streamId -> { lastMessageTime, unreadCount, lastChecked }
        
        // Activity change handlers
        this.activityHandlers = [];
        
        // Configuration
        this.config = {
            POLL_INTERVAL: 30000,           // 30 seconds between background polls
            POLL_BATCH_SIZE: 3,             // Check N channels per poll cycle
            POLL_STAGGER_DELAY: 2000,       // Delay between channel checks in batch
            MIN_POLL_INTERVAL: 10000,       // Minimum time between checks for same channel
            MAX_CONCURRENT_SUBS: 1,         // Only 1 full subscription at a time (active channel)
            ACTIVITY_CHECK_MESSAGES: 3,     // Number of messages to fetch for activity check
        };
        
        // Polling state
        this.pollIndex = 0;
        this.isPolling = false;
    }

    /**
     * Set the active channel - full subscription with all partitions and history
     * Downgrades previous active channel to background mode
     * @param {string} streamId - Stream ID to activate
     * @param {string} password - Optional password for encrypted channels
     * @param {Object} handlers - Message handlers { onControl, onMessage, onMedia }
     */
    async setActiveChannel(streamId, password = null, handlers = null) {
        if (!streamId) {
            Logger.warn('setActiveChannel called with null streamId');
            return;
        }

        // If same channel, just ensure subscription is active
        if (this.activeChannelId === streamId) {
            Logger.debug('Channel already active:', streamId);
            return;
        }

        Logger.info('Setting active channel:', streamId);

        // Downgrade previous active channel (unsubscribe to save resources)
        if (this.activeChannelId) {
            await this.downgradeToBackground(this.activeChannelId);
        }

        this.activeChannelId = streamId;
        this.activeSubscriptionHandlers = handlers;

        // Full subscription with history for active channel
        try {
            await channelManager.subscribeToChannel(streamId, password);
            Logger.info('Active channel subscription complete:', streamId);
        } catch (error) {
            Logger.error('Failed to subscribe to active channel:', error);
            throw error;
        }
    }

    /**
     * Downgrade channel to background mode (unsubscribe to free resources)
     * @param {string} streamId - Stream ID to downgrade
     */
    async downgradeToBackground(streamId) {
        if (!streamId) return;

        try {
            // Store current activity state before unsubscribing
            const channel = channelManager.getChannel(streamId);
            if (channel && channel.messages?.length > 0) {
                const latestMsg = channel.messages[channel.messages.length - 1];
                this.channelActivity.set(streamId, {
                    lastMessageTime: latestMsg.timestamp || Date.now(),
                    unreadCount: 0,
                    lastChecked: Date.now()
                });
            }

            // Unsubscribe from stream
            await streamrController.unsubscribe(streamId);
            Logger.debug('Downgraded to background:', streamId);
        } catch (error) {
            Logger.warn('Failed to downgrade channel:', streamId, error.message);
        }
    }

    /**
     * Clear active channel (when deselecting/closing)
     */
    async clearActiveChannel() {
        if (this.activeChannelId) {
            await this.downgradeToBackground(this.activeChannelId);
            this.activeChannelId = null;
            this.activeSubscriptionHandlers = null;
        }
    }

    /**
     * Start background activity polling for all channels
     * Polls channels in batches to detect new messages without full subscriptions
     */
    startBackgroundPoller() {
        if (this.backgroundPoller) {
            Logger.debug('Background poller already running');
            return;
        }

        Logger.info('Starting background activity poller');
        
        // Initialize activity state for all channels
        this.initializeActivityState();

        // Start polling
        this.backgroundPoller = setInterval(async () => {
            await this.pollBackgroundChannels();
        }, this.config.POLL_INTERVAL);

        // Run first poll immediately (after short delay)
        setTimeout(() => this.pollBackgroundChannels(), 5000);
    }

    /**
     * Initialize activity tracking state from stored data
     */
    initializeActivityState() {
        const channels = channelManager.getAllChannels();
        const lastAccessMap = secureStorage.getAllChannelLastAccess();

        for (const channel of channels) {
            if (!this.channelActivity.has(channel.streamId)) {
                // Initialize with last known access time
                const lastAccess = lastAccessMap[channel.streamId] || 0;
                this.channelActivity.set(channel.streamId, {
                    lastMessageTime: lastAccess,
                    unreadCount: 0,
                    lastChecked: 0
                });
            }
        }
    }

    /**
     * Poll background channels for new activity
     * Uses lightweight history fetch to check for new messages
     */
    async pollBackgroundChannels() {
        if (this.isPolling) {
            Logger.debug('Poll already in progress, skipping');
            return;
        }

        this.isPolling = true;

        try {
            const channels = channelManager.getAllChannels();
            const backgroundChannels = channels.filter(c => c.streamId !== this.activeChannelId);

            if (backgroundChannels.length === 0) {
                Logger.debug('No background channels to poll');
                return;
            }

            // Get batch of channels to poll this cycle (round-robin)
            const batchSize = Math.min(this.config.POLL_BATCH_SIZE, backgroundChannels.length);
            const channelsToPoll = [];

            for (let i = 0; i < batchSize; i++) {
                const idx = (this.pollIndex + i) % backgroundChannels.length;
                channelsToPoll.push(backgroundChannels[idx]);
            }

            this.pollIndex = (this.pollIndex + batchSize) % backgroundChannels.length;

            // Poll each channel in batch with stagger delay
            for (let i = 0; i < channelsToPoll.length; i++) {
                const channel = channelsToPoll[i];
                
                // Check if enough time has passed since last check
                const activity = this.channelActivity.get(channel.streamId);
                const timeSinceLastCheck = Date.now() - (activity?.lastChecked || 0);
                
                if (timeSinceLastCheck < this.config.MIN_POLL_INTERVAL) {
                    continue;
                }

                try {
                    await this.checkChannelActivity(channel);
                } catch (error) {
                    Logger.debug('Activity check failed for:', channel.streamId, error.message);
                }

                // Stagger delay between checks
                if (i < channelsToPoll.length - 1) {
                    await new Promise(r => setTimeout(r, this.config.POLL_STAGGER_DELAY));
                }
            }
        } finally {
            this.isPolling = false;
        }
    }

    /**
     * Check activity for a single channel without full subscription
     * @param {Object} channel - Channel object
     */
    async checkChannelActivity(channel) {
        const streamId = channel.streamId;
        const password = channel.password || null;

        // Get current activity state
        const currentActivity = this.channelActivity.get(streamId) || {
            lastMessageTime: 0,
            unreadCount: 0,
            lastChecked: 0
        };

        try {
            // Fetch recent messages from LogStore (lightweight - no subscription needed)
            const result = await streamrController.fetchOlderHistory(
                streamId,
                0, // Messages partition
                Date.now(),
                this.config.ACTIVITY_CHECK_MESSAGES,
                password
            );

            const messages = result.messages || [];
            
            // Count new messages since last check
            let newCount = 0;
            let latestTime = currentActivity.lastMessageTime;

            for (const msg of messages) {
                if (msg.timestamp > currentActivity.lastMessageTime) {
                    newCount++;
                    if (msg.timestamp > latestTime) {
                        latestTime = msg.timestamp;
                    }
                }
            }

            // Update activity state
            const newActivity = {
                lastMessageTime: latestTime,
                unreadCount: currentActivity.unreadCount + newCount,
                lastChecked: Date.now()
            };
            this.channelActivity.set(streamId, newActivity);

            // Notify handlers if new messages detected
            if (newCount > 0) {
                Logger.debug('New activity detected:', streamId, newCount, 'messages');
                this.notifyActivityHandlers(streamId, newActivity);
            }

        } catch (error) {
            // Update lastChecked even on error to prevent rapid retries
            currentActivity.lastChecked = Date.now();
            this.channelActivity.set(streamId, currentActivity);
            throw error;
        }
    }

    /**
     * Register handler for activity changes
     * @param {Function} handler - Callback (streamId, activity) => void
     */
    onActivity(handler) {
        if (typeof handler === 'function') {
            this.activityHandlers.push(handler);
        }
    }

    /**
     * Remove activity handler
     * @param {Function} handler - Handler to remove
     */
    offActivity(handler) {
        this.activityHandlers = this.activityHandlers.filter(h => h !== handler);
    }

    /**
     * Notify all activity handlers
     * @param {string} streamId - Channel stream ID
     * @param {Object} activity - Activity data
     */
    notifyActivityHandlers(streamId, activity) {
        for (const handler of this.activityHandlers) {
            try {
                handler(streamId, activity);
            } catch (error) {
                Logger.warn('Activity handler error:', error);
            }
        }
    }

    /**
     * Get activity state for a channel
     * @param {string} streamId - Stream ID
     * @returns {Object|null} - Activity data or null
     */
    getChannelActivity(streamId) {
        return this.channelActivity.get(streamId) || null;
    }

    /**
     * Get unread count for a channel
     * @param {string} streamId - Stream ID
     * @returns {number} - Unread message count
     */
    getUnreadCount(streamId) {
        const activity = this.channelActivity.get(streamId);
        return activity?.unreadCount || 0;
    }

    /**
     * Clear unread count for a channel (when user opens it)
     * @param {string} streamId - Stream ID
     */
    clearUnreadCount(streamId) {
        const activity = this.channelActivity.get(streamId);
        if (activity) {
            activity.unreadCount = 0;
            this.channelActivity.set(streamId, activity);
        }
    }

    /**
     * Remove a channel from tracking (when leaving or deleting)
     * @param {string} streamId - Stream ID
     */
    async removeChannel(streamId) {
        Logger.debug('Removing channel from subscription manager:', streamId);
        
        // Clear from activity tracking
        this.channelActivity.delete(streamId);
        
        // If this was the active channel, clear it
        if (this.activeChannelId === streamId) {
            this.activeChannelId = null;
            this.activeSubscriptionHandlers = null;
        }
        
        // Clear lastOpenedChannel if it points to this channel
        const lastOpened = secureStorage.getLastOpenedChannel();
        if (lastOpened === streamId) {
            await secureStorage.setLastOpenedChannel(null);
        }
    }

    /**
     * Stop background polling
     */
    stopBackgroundPoller() {
        if (this.backgroundPoller) {
            clearInterval(this.backgroundPoller);
            this.backgroundPoller = null;
            Logger.debug('Background poller stopped');
        }
    }

    /**
     * Full cleanup - stop polling and clear all state
     */
    async cleanup() {
        Logger.info('Subscription manager cleanup');
        
        // Stop background polling
        this.stopBackgroundPoller();
        
        // Clear active channel
        this.activeChannelId = null;
        this.activeSubscriptionHandlers = null;
        
        // Clear activity state
        this.channelActivity.clear();
        this.pollIndex = 0;
        this.isPolling = false;
        
        // Clear handlers
        this.activityHandlers = [];
    }

    /**
     * Check if a channel is currently the active channel
     * @param {string} streamId - Stream ID
     * @returns {boolean}
     */
    isActiveChannel(streamId) {
        return this.activeChannelId === streamId;
    }

    /**
     * Get the active channel ID
     * @returns {string|null}
     */
    getActiveChannelId() {
        return this.activeChannelId;
    }

    /**
     * Force poll a specific channel immediately
     * Useful when user hovers over channel in sidebar
     * @param {string} streamId - Stream ID to poll
     */
    async forcePollChannel(streamId) {
        const channel = channelManager.getChannel(streamId);
        if (!channel || streamId === this.activeChannelId) {
            return;
        }

        try {
            await this.checkChannelActivity(channel);
        } catch (error) {
            Logger.debug('Force poll failed:', streamId, error.message);
        }
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration values
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        Logger.debug('Subscription manager config updated:', this.config);
    }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();
