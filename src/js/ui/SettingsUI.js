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
     * Show progress modal for encryption/decryption operations
     */
    showProgressModal(title, subtitle) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-[#111111] rounded-xl w-[300px] overflow-hidden shadow-2xl border border-[#222]">
                <div class="px-5 pt-5 pb-2">
                    <h3 class="text-[14px] font-medium text-white">${title}</h3>
                    <p class="text-[11px] text-[#666] mt-0.5">${subtitle}</p>
                </div>
                <div class="px-5 pb-5 pt-3">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[10px] text-[#666]">Progress</span>
                        <span class="text-[10px] font-medium text-white" id="progress-label">0%</span>
                    </div>
                    <div class="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div id="progress-bar" class="h-full bg-white transition-all duration-300 ease-out" style="width: 0%"></div>
                    </div>
                    <p class="text-[10px] text-[#555] text-center mt-3">This may take a few seconds...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Update progress modal
     */
    updateProgressModal(modal, progress) {
        const percent = Math.round(progress * 100);
        const progressBar = modal.querySelector('#progress-bar');
        const progressLabel = modal.querySelector('#progress-label');
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressLabel) progressLabel.textContent = `${percent}%`;
    }

    /**
     * Hide progress modal
     */
    hideProgressModal(modal) {
        if (modal && modal.parentNode) {
            document.body.removeChild(modal);
        }
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

        // Export account backup (uses account password with scrypt)
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                try {
                    if (!this.secureStorage.isStorageUnlocked()) {
                        this.showNotification('Please unlock account first', 'error');
                        return;
                    }

                    // Get account password (same as keystore password)
                    const password = await showPasswordPrompt(
                        'Export Account Backup',
                        'Enter your account password to create a backup.',
                        false
                    );
                    if (!password) return;

                    // Get current account's keystore
                    const address = this.authManager.getAddress();
                    const keystoreJson = this.authManager.exportKeystore(address);
                    if (!keystoreJson) {
                        this.showNotification('No keystore found for this account', 'error');
                        return;
                    }
                    const keystore = JSON.parse(keystoreJson);

                    // Show progress modal - Step 1: Verify password
                    const progressModal = this.showProgressModal(
                        'Creating Backup',
                        'Verifying password...'
                    );

                    try {
                        // First verify password against keystore (prevents wrong password in backup)
                        try {
                            await ethers.Wallet.fromEncryptedJson(
                                keystoreJson,
                                password,
                                (progress) => this.updateProgressModal(progressModal, progress * 0.4)
                            );
                        } catch (verifyError) {
                            this.hideProgressModal(progressModal);
                            this.showNotification('Wrong password', 'error');
                            return;
                        }

                        // Password verified - now create backup
                        this.updateProgressModal(progressModal, 0.4);
                        progressModal.querySelector('p')?.textContent && 
                            (progressModal.querySelector('p').textContent = 'Encrypting data with scrypt...');

                        // Create backup with scrypt (progress 0.4 to 1.0)
                        const backup = await this.secureStorage.exportAccountBackup(
                            keystore,
                            password,
                            (progress) => this.updateProgressModal(progressModal, 0.4 + progress * 0.6)
                        );

                        this.hideProgressModal(progressModal);

                        // Download backup file
                        const json = JSON.stringify(backup, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        
                        const timestamp = new Date().toISOString().slice(0, 10);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `pombo-account-backup-${timestamp}.json`;
                        a.click();
                        
                        URL.revokeObjectURL(url);
                        this.showNotification('Account backup exported!', 'success');
                    } catch (exportError) {
                        this.hideProgressModal(progressModal);
                        // Check if password was wrong (scrypt will fail silently, but we can detect)
                        this.showNotification('Failed to export: ' + exportError.message, 'error');
                    }
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
                    
                    if (data.format === 'pombo-account-backup' && data.version === 3) {
                        // Scrypt-encrypted account backup
                        await this.handleAccountBackupImport(data, showPasswordPrompt);
                    }
                    else {
                        throw new Error('Unknown backup format. Only pombo-account-backup v3 is supported.');
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
     * Handle new account backup import (pombo-account-backup v3)
     * This imports data (channels, contacts) from a backup into the current account
     */
    async handleAccountBackupImport(backup, showPasswordPrompt) {
        if (!this.secureStorage.isStorageUnlocked()) {
            this.showNotification('Please unlock account to import data', 'error');
            return;
        }

        const password = await showPasswordPrompt(
            'Decrypt Backup',
            'Enter the password used for this backup.',
            false
        );
        if (!password) return;

        // Show progress modal
        const progressModal = this.showProgressModal(
            'Decrypting Backup',
            'Using scrypt decryption...'
        );

        try {
            // Decrypt the backup
            const result = await this.secureStorage.importAccountBackup(
                backup,
                password,
                (progress) => this.updateProgressModal(progressModal, progress)
            );

            this.hideProgressModal(progressModal);

            // Check if backup is from a different account
            const currentAddress = this.authManager.getAddress()?.toLowerCase();
            const backupAddress = result.address?.toLowerCase();
            
            if (backupAddress && currentAddress && backupAddress !== currentAddress) {
                const confirmed = confirm(
                    `This backup is from a different account:\n\n` +
                    `Backup: ${backupAddress.slice(0, 8)}...${backupAddress.slice(-6)}\n` +
                    `Current: ${currentAddress.slice(0, 8)}...${currentAddress.slice(-6)}\n\n` +
                    `Import channels and contacts to your current account?`
                );
                if (!confirmed) return;
            }

            // Import data into current account's secure storage
            const data = result.data;
            let channelsImported = 0;
            let contactsImported = 0;

            // Import channels
            if (data.channels && data.channels.length > 0) {
                const existingIds = new Set((this.secureStorage.cache.channels || []).map(c => c.messageStreamId || c.streamId));
                for (const channel of data.channels) {
                    const chId = channel.messageStreamId || channel.streamId;
                    if (chId && !existingIds.has(chId)) {
                        this.secureStorage.cache.channels.push(channel);
                        channelsImported++;
                    }
                }
            }

            // Import trusted contacts
            if (data.trustedContacts) {
                for (const [addr, contact] of Object.entries(data.trustedContacts)) {
                    if (!this.secureStorage.cache.trustedContacts[addr]) {
                        this.secureStorage.cache.trustedContacts[addr] = contact;
                        contactsImported++;
                    }
                }
            }

            // Import username (only if not set)
            if (data.username && !this.secureStorage.cache.username) {
                this.secureStorage.cache.username = data.username;
            }

            // Save
            await this.secureStorage.saveToStorage();

            this.showNotification(
                `Imported: ${channelsImported} channels, ${contactsImported} contacts`,
                'success'
            );

            if (channelsImported > 0) {
                this.channelManager.loadChannels();
                this.deps.renderChannelList?.();
            }

            // Reload trusted contacts in identity manager
            if (contactsImported > 0) {
                this.identityManager?.loadTrustedContacts?.();
            }

        } catch (error) {
            this.hideProgressModal(progressModal);
            this.Logger?.error('Account backup import failed:', error);
            this.showNotification('Failed to import: ' + error.message, 'error');
        }
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
