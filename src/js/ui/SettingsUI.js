/**
 * Settings UI Manager
 * Handles settings modal functionality: export key, backup/restore, delete account
 */

class SettingsUI {
    constructor() {
        this.deps = {};
    }

    /**
     * Set dependencies
     * @param {Object} deps - { authManager, secureStorage, channelManager, streamrController, mediaController, identityManager, graphAPI, Logger, modalManager, showNotification, updateWalletInfo, updateNetworkStatus, renderChannelList, resetToDisconnectedState }
     */
    setDependencies(deps) {
        this.deps = { ...this.deps, ...deps };
    }

    // Convenience getters for managers (backward compatibility)
    get authManager() { return this.deps.authManager; }
    get secureStorage() { return this.deps.secureStorage; }
    get channelManager() { return this.deps.channelManager; }
    get streamrController() { return this.deps.streamrController; }
    get mediaController() { return this.deps.mediaController; }
    get identityManager() { return this.deps.identityManager; }
    get graphAPI() { return this.deps.graphAPI; }
    get Logger() { return this.deps.Logger; }
    get modalManager() { return this.deps.modalManager; }

    /**
     * Show notification helper
     */
    showNotification(message, type) {
        this.deps.showNotification?.(message, type);
    }

    /**
     * Initialize export private key UI handlers
     */
    initExportPrivateKeyUI() {
        const exportKeyPassword = document.getElementById('export-key-password');
        const unlockBtn = document.getElementById('unlock-private-key-btn');
        const step1 = document.getElementById('export-key-step1');
        const step2 = document.getElementById('export-key-step2');
        const privateKeyDisplay = document.getElementById('private-key-display');
        const toggleVisibilityBtn = document.getElementById('toggle-key-visibility');
        const copyKeyBtn = document.getElementById('copy-private-key-btn');
        const copyKeyProgress = document.getElementById('copy-key-progress');
        const copyKeyText = document.getElementById('copy-key-text');
        const lockBtn = document.getElementById('lock-private-key-btn');

        let unlockedPrivateKey = null;
        let holdTimer = null;
        let isKeyVisible = false;

        // Unlock private key
        if (unlockBtn) {
            unlockBtn.addEventListener('click', async () => {
                const password = exportKeyPassword?.value;
                if (!password) {
                    this.showNotification('Please enter your password', 'error');
                    return;
                }

                try {
                    unlockBtn.disabled = true;
                    unlockBtn.textContent = '🔄 Verifying...';
                    
                    unlockedPrivateKey = await this.authManager.getPrivateKey(password);
                    
                    // Show step 2
                    step1?.classList.add('hidden');
                    step2?.classList.remove('hidden');
                    
                    // Display masked key
                    if (privateKeyDisplay) {
                        privateKeyDisplay.value = unlockedPrivateKey;
                        privateKeyDisplay.type = 'password';
                        isKeyVisible = false;
                    }
                    
                    this.showNotification('Private key unlocked!', 'success');
                } catch (error) {
                    this.showNotification(error.message || 'Failed to unlock', 'error');
                } finally {
                    unlockBtn.disabled = false;
                    unlockBtn.textContent = 'Unlock Key';
                    if (exportKeyPassword) exportKeyPassword.value = '';
                }
            });
        }

        // Toggle visibility
        if (toggleVisibilityBtn) {
            toggleVisibilityBtn.addEventListener('click', () => {
                if (privateKeyDisplay) {
                    isKeyVisible = !isKeyVisible;
                    privateKeyDisplay.type = isKeyVisible ? 'text' : 'password';
                    toggleVisibilityBtn.innerHTML = isKeyVisible 
                        ? '<svg class="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>'
                        : '<svg class="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';
                }
            });
        }

        // Long press to copy (2 seconds)
        if (copyKeyBtn) {
            const startHold = () => {
                if (!unlockedPrivateKey) return;
                
                copyKeyProgress?.classList.remove('-translate-x-full');
                copyKeyProgress?.classList.add('translate-x-0');
                if (copyKeyText) copyKeyText.textContent = 'Keep holding...';

                holdTimer = setTimeout(async () => {
                    try {
                        await navigator.clipboard.writeText(unlockedPrivateKey);
                        this.showNotification('Private key copied!', 'success');
                        if (copyKeyText) copyKeyText.textContent = 'Copied!';
                        
                        setTimeout(() => {
                            if (copyKeyText) copyKeyText.textContent = 'Hold to Copy Private Key (2s)';
                        }, 2000);
                    } catch (e) {
                        this.showNotification('Failed to copy', 'error');
                    }
                    resetProgress();
                }, 2000);
            };

            const resetProgress = () => {
                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
                copyKeyProgress?.classList.remove('translate-x-0');
                copyKeyProgress?.classList.add('-translate-x-full');
                if (copyKeyText && copyKeyText.textContent === 'Keep holding...') {
                    copyKeyText.textContent = 'Hold to Copy Private Key (2s)';
                }
            };

            copyKeyBtn.addEventListener('mousedown', startHold);
            copyKeyBtn.addEventListener('touchstart', startHold);
            copyKeyBtn.addEventListener('mouseup', resetProgress);
            copyKeyBtn.addEventListener('mouseleave', resetProgress);
            copyKeyBtn.addEventListener('touchend', resetProgress);
            copyKeyBtn.addEventListener('touchcancel', resetProgress);
        }

        // Lock (reset to step 1)
        if (lockBtn) {
            lockBtn.addEventListener('click', () => {
                unlockedPrivateKey = null;
                step2?.classList.add('hidden');
                step1?.classList.remove('hidden');
                if (privateKeyDisplay) {
                    privateKeyDisplay.value = '';
                    privateKeyDisplay.type = 'password';
                }
                isKeyVisible = false;
                if (toggleVisibilityBtn) toggleVisibilityBtn.innerHTML = '<svg class="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';
                this.showNotification('Private key locked', 'info');
            });
        }
    }

    /**
     * Initialize backup/restore UI handlers
     */
    initBackupRestoreUI(showPasswordPrompt) {
        const exportBtn = document.getElementById('export-all-data-btn');
        const importBtn = document.getElementById('import-data-btn');
        const importFileInput = document.getElementById('import-data-file');

        // Export encrypted data
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                try {
                    if (!this.secureStorage.isStorageUnlocked()) {
                        this.showNotification('Please unlock account first', 'error');
                        return;
                    }

                    const password = await showPasswordPrompt(
                        'Encrypt Backup',
                        'Enter a password to encrypt your backup.\nYou will need this password to restore.',
                        true
                    );
                    if (!password) return;

                    const stats = this.secureStorage.getStats();
                    const confirmed = confirm(
                        'Export encrypted backup?\n\n' +
                        `📁 Channels: ${stats.channels}\n` +
                        `👤 Contacts: ${stats.contacts}\n\n` +
                        'Your data will be encrypted with the password you provided.\n' +
                        'Note: Messages are stored on Streamr and will be loaded on demand.'
                    );
                    if (!confirmed) return;

                    const encryptedData = await this.secureStorage.exportEncrypted(password);
                    const keystores = this.authManager.exportKeystores();
                    
                    const fullBackup = {
                        format: 'pombo-full-backup',
                        version: 2,
                        exportedAt: new Date().toISOString(),
                        keystores: keystores,
                        encryptedData: encryptedData
                    };

                    const json = JSON.stringify(fullBackup, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    
                    const timestamp = new Date().toISOString().slice(0, 10);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pombo-backup-encrypted-${timestamp}.json`;
                    a.click();
                    
                    URL.revokeObjectURL(url);
                    this.showNotification('Encrypted backup exported!', 'success');
                } catch (error) {
                    this.Logger?.error('Export failed:', error);
                    this.showNotification('Failed to export: ' + error.message, 'error');
                }
            });
        }

        // Import encrypted data
        if (importBtn && importFileInput) {
            importBtn.addEventListener('click', () => {
                importFileInput.click();
            });

            importFileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    
                    if (data.format === 'pombo-full-backup' && data.version === 2) {
                        await this.handleEncryptedImport(data, showPasswordPrompt);
                    } 
                    else if (data.format === 'pombo-encrypted-backup') {
                        await this.handleEncryptedDataImport(data, showPasswordPrompt);
                    }
                    else if (data.format === 'pombo-keystores') {
                        await this.handleKeystoresImport(data);
                    }
                    else {
                        throw new Error('Unknown backup format');
                    }
                } catch (error) {
                    this.Logger?.error('Import failed:', error);
                    this.showNotification('Failed to import: ' + error.message, 'error');
                } finally {
                    importFileInput.value = '';
                }
            });
        }
    }

    /**
     * Initialize delete account UI handlers
     */
    initDeleteAccountUI() {
        const deletePasswordInput = document.getElementById('delete-account-password');
        const verifyBtn = document.getElementById('verify-delete-account-btn');
        const step1 = document.getElementById('delete-account-step1');
        const step2 = document.getElementById('delete-account-step2');
        const deleteBtn = document.getElementById('delete-account-btn');
        const deleteProgress = document.getElementById('delete-account-progress');
        const deleteText = document.getElementById('delete-account-text');
        const cancelBtn = document.getElementById('cancel-delete-account-btn');

        let isPasswordVerified = false;
        let holdTimer = null;

        // Verify password
        if (verifyBtn) {
            verifyBtn.addEventListener('click', async () => {
                const password = deletePasswordInput?.value;
                if (!password) {
                    this.showNotification('Please enter your password', 'error');
                    return;
                }

                try {
                    verifyBtn.disabled = true;
                    verifyBtn.textContent = '🔄 Verifying...';
                    
                    await this.authManager.getPrivateKey(password);
                    
                    isPasswordVerified = true;
                    step1?.classList.add('hidden');
                    step2?.classList.remove('hidden');
                    
                    this.showNotification('Password verified', 'success');
                } catch (error) {
                    this.showNotification('Incorrect password', 'error');
                } finally {
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = 'Verify Password';
                    if (deletePasswordInput) deletePasswordInput.value = '';
                }
            });
        }

        // Cancel - back to step 1
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                isPasswordVerified = false;
                step2?.classList.add('hidden');
                step1?.classList.remove('hidden');
            });
        }

        // Long press to delete (2 seconds)
        if (deleteBtn) {
            const startHold = () => {
                if (!isPasswordVerified) return;
                
                deleteProgress?.classList.remove('-translate-x-full');
                deleteProgress?.classList.add('translate-x-0');
                if (deleteText) deleteText.textContent = 'Keep holding...';

                holdTimer = setTimeout(async () => {
                    try {
                        const currentAddress = this.authManager.getAddress();
                        if (!currentAddress) {
                            throw new Error('No account connected');
                        }

                        // 1. Stop presence tracking
                        this.channelManager.stopPresenceTracking();

                        // 2. Leave all channels
                        await this.channelManager.leaveAllChannels();

                        // 3. Destroy Streamr client
                        await this.streamrController.disconnect();

                        // 4. Clear seed files
                        await this.mediaController.clearSeedFilesForOwner(currentAddress);

                        // 5. Reset media controller
                        this.mediaController.reset();

                        // 6. Delete encrypted storage
                        const storageKey = `pombo_secure_${currentAddress.toLowerCase()}`;
                        localStorage.removeItem(storageKey);

                        // 7. Lock secure storage
                        this.secureStorage.lock();

                        // 8. Delete wallet keystore
                        this.authManager.deleteWallet(currentAddress);
                        
                        this.showNotification('Account deleted successfully', 'success');
                        
                        // Close modal & update UI via callbacks
                        this.modalManager?.hide('settings-modal');
                        
                        this.deps.updateWalletInfo?.(null);
                        this.deps.updateNetworkStatus?.('Disconnected', false);
                        this.deps.renderChannelList?.();
                        this.deps.resetToDisconnectedState?.();
                        
                        // Check for other accounts
                        if (this.authManager.hasSavedWallet()) {
                            setTimeout(() => {
                                window.ethChat?.connectWallet();
                            }, 500);
                        }
                    } catch (e) {
                        this.Logger?.error('Failed to delete account:', e);
                        this.showNotification('Failed to delete: ' + e.message, 'error');
                    }
                    resetProgress();
                }, 2000);
            };

            const resetProgress = () => {
                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
                deleteProgress?.classList.remove('translate-x-0');
                deleteProgress?.classList.add('-translate-x-full');
                if (deleteText && deleteText.textContent === 'Keep holding...') {
                    deleteText.textContent = 'Hold to Delete (2s)';
                }
            };

            deleteBtn.addEventListener('mousedown', startHold);
            deleteBtn.addEventListener('touchstart', startHold);
            deleteBtn.addEventListener('mouseup', resetProgress);
            deleteBtn.addEventListener('mouseleave', resetProgress);
            deleteBtn.addEventListener('touchend', resetProgress);
            deleteBtn.addEventListener('touchcancel', resetProgress);
        }
    }

    /**
     * Handle encrypted full backup import
     */
    async handleEncryptedImport(data, showPasswordPrompt) {
        const keystoresCount = Object.keys(data.keystores?.keystores || {}).length;
        
        const password = await showPasswordPrompt(
            'Decrypt Backup',
            'Enter the password used to encrypt this backup.',
            false
        );
        if (!password) return;

        if (!this.secureStorage.isStorageUnlocked()) {
            this.showNotification('Please unlock account to import data', 'error');
            return;
        }

        let keystoresSummary = { keystoresImported: 0 };
        if (data.keystores && keystoresCount > 0) {
            keystoresSummary = this.authManager.importKeystores(data.keystores, true);
        }

        const dataSummary = await this.secureStorage.importEncrypted(data.encryptedData, password, true);

        this.showNotification(
            `Imported: ${keystoresSummary.keystoresImported} wallets, ` +
            `${dataSummary.channelsImported} channels, ` +
            `${dataSummary.contactsImported} contacts`,
            'success'
        );

        if (dataSummary.channelsImported > 0) {
            this.channelManager.loadChannels();
            this.deps.renderChannelList?.();
        }
    }

    /**
     * Handle encrypted data only import
     */
    async handleEncryptedDataImport(data, showPasswordPrompt) {
        const password = await showPasswordPrompt(
            'Decrypt Backup',
            'Enter the password used to encrypt this backup.',
            false
        );
        if (!password) return;

        if (!this.secureStorage.isStorageUnlocked()) {
            this.showNotification('Please unlock account to import data', 'error');
            return;
        }

        const summary = await this.secureStorage.importEncrypted(data, password, true);

        this.showNotification(
            `Imported: ${summary.channelsImported} channels, ${summary.contactsImported} contacts`,
            'success'
        );

        if (summary.channelsImported > 0) {
            this.channelManager.loadChannels();
            this.deps.renderChannelList?.();
        }
    }

    /**
     * Handle keystores only import
     */
    async handleKeystoresImport(data) {
        const confirmed = confirm(
            'Import wallets from backup?\n\n' +
            `Wallets found: ${Object.keys(data.keystores || {}).length}\n\n` +
            'This will merge with existing wallets.'
        );
        if (!confirmed) return;

        const summary = this.authManager.importKeystores(data, true);
        this.showNotification(`Imported ${summary.keystoresImported} wallets`, 'success');
    }

    /**
     * Update Graph API status display
     */
    async updateGraphApiStatus(graphApiStatusEl) {
        if (!graphApiStatusEl || !this.graphAPI) return;
        
        const isValid = await this.graphAPI.validateKey();
        const isDefault = this.graphAPI.isUsingDefaultKey();
        
        if (isDefault) {
            graphApiStatusEl.textContent = 'Using default key';
            graphApiStatusEl.className = 'text-xs text-yellow-500';
        } else if (isValid) {
            graphApiStatusEl.textContent = 'Valid';
            graphApiStatusEl.className = 'text-xs text-green-500';
        } else {
            graphApiStatusEl.textContent = 'Invalid key';
            graphApiStatusEl.className = 'text-xs text-red-500';
        }
    }

    /**
     * Reset export key UI to initial state
     */
    resetExportKeyUI() {
        document.getElementById('export-key-step1')?.classList.remove('hidden');
        document.getElementById('export-key-step2')?.classList.add('hidden');
        const exportKeyPassword = document.getElementById('export-key-password');
        if (exportKeyPassword) exportKeyPassword.value = '';
    }

    /**
     * Reset delete account UI to initial state
     */
    resetDeleteAccountUI() {
        document.getElementById('delete-account-step1')?.classList.remove('hidden');
        document.getElementById('delete-account-step2')?.classList.add('hidden');
        const deleteAccountPassword = document.getElementById('delete-account-password');
        if (deleteAccountPassword) deleteAccountPassword.value = '';
    }
}

// Create singleton instance
const settingsUI = new SettingsUI();

export { settingsUI, SettingsUI };
