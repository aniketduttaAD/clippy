document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        setupContainer: document.getElementById('setup-container'),
        successMessage: document.getElementById('success-message'),
        userId: document.getElementById('userId'),
        apiUrl: document.getElementById('apiUrl'),
        saveButton: document.getElementById('saveButton'),
        reconfigureButton: document.getElementById('reconfigureButton'),
        botLink: document.getElementById('botLink'),
        themeToggle: document.getElementById('themeToggle')
    };

    loadUserData();
    setupEventListeners();
    initTheme();

    async function loadConfig() {
        try {
            const response = await fetch(chrome.runtime.getURL('config.json'));
            const config = await response.json();
            return config.server_url;
        } catch (error) {
            console.error('Error loading config.json:', error);
            return 'http://localhost:3000';
        }
    }

    async function loadUserData() {
        const API_BASE_URL = await loadConfig();
        chrome.storage.sync.get(
            ['userId', 'isConfigured', 'apiUrl', 'darkMode'],
            (result) => {
                const userApiUrl = result.apiUrl || API_BASE_URL; // Use the fetched API URL or fallback

                if (result.isConfigured) {
                    elements.userId.value = result.userId || '';
                    elements.apiUrl.value = userApiUrl;
                    elements.setupContainer.style.display = 'none';
                    elements.successMessage.style.display = 'block';
                } else {
                    elements.apiUrl.value = userApiUrl;
                    elements.setupContainer.style.display = 'block';
                    elements.successMessage.style.display = 'none';
                }

                try {
                    const manifest = chrome.runtime.getManifest();
                    let botName;
                    if (manifest.browser_action) {
                        botName = manifest.browser_action.default_title;
                    } else if (manifest.action) {
                        botName = manifest.action.default_title;
                    } else {
                        botName = manifest.name || 'clippy_thebot';
                    }
                    setBotLink(botName);
                } catch (error) {
                    console.error('Error getting bot name from manifest:', error);
                    setBotLink('clippy_thebot');
                }
            }
        );
    }

    function setupEventListeners() {
        elements.saveButton.addEventListener('click', saveConfiguration);
        elements.reconfigureButton.addEventListener('click', showConfiguration);
        elements.themeToggle.addEventListener('click', toggleDarkMode);
    }

    function saveConfiguration() {
        const userId = elements.userId.value.trim();
        const apiUrl = elements.apiUrl.value.trim();

        if (!userId || !userId.startsWith('clippy')) {
            showError(elements.userId, 'Please enter a valid Clippy ID. It should start with "clippy"');
            return;
        }

        if (!apiUrl.startsWith('http')) {
            showError(elements.apiUrl, 'Invalid API URL. Must start with http:// or https://');
            return;
        }

        chrome.runtime.sendMessage({ action: 'updateApiUrl', apiUrl });

        showStatus('Connecting to server...', 'info');

        chrome.runtime.sendMessage({ action: 'getTokensForUser', userId }, (response) => {
            if (response && response.success) {
                chrome.storage.sync.set({
                    userId,
                    apiUrl,
                    sessionToken: response.sessionToken,
                    refreshToken: response.refreshToken,
                    isConfigured: true
                }, () => {
                    showStatus('Setup complete!', 'success');
                    elements.setupContainer.style.display = 'none';
                    elements.successMessage.style.display = 'block';
                });
            } else {
                showError(elements.userId, response?.error || 'Failed to connect to server. Please verify your Clippy ID.');
            }
        });
    }

    function showConfiguration() {
        elements.setupContainer.style.display = 'block';
        elements.successMessage.style.display = 'none';
    }

    function showStatus(message, type) {
        const statusEl = document.createElement('div');
        statusEl.className = `status-message ${type}`;
        statusEl.textContent = message;
        const existingStatus = document.querySelector('.status-message');
        if (existingStatus) existingStatus.remove();
        elements.setupContainer.appendChild(statusEl);

        if (type === 'success') {
            setTimeout(() => {
                if (statusEl.parentNode) statusEl.remove();
            }, 3000);
        }
    }

    function showError(inputElement, message) {
        inputElement.style.borderColor = 'var(--error)';
        inputElement.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';

        const errorElement = document.createElement('div');
        errorElement.textContent = message;
        errorElement.className = 'error-message';
        errorElement.style.color = 'var(--error)';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '5px';

        const parent = inputElement.parentNode;
        const existingError = parent.querySelector('.error-message');
        if (existingError) parent.removeChild(existingError);

        parent.appendChild(errorElement);
        inputElement.focus();

        inputElement.addEventListener('input', function onInput() {
            inputElement.style.borderColor = '';
            inputElement.style.backgroundColor = '';
            const err = parent.querySelector('.error-message');
            if (err) parent.removeChild(err);
            inputElement.removeEventListener('input', onInput);
        });
    }

    function setBotLink(botName = 'clippy_thebot') {
        elements.botLink.textContent = `t.me/${botName}`;
        elements.botLink.href = `https://t.me/${botName}`;
    }

    function toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark');
        chrome.storage.sync.set({ darkMode: isDark });
    }

    function initTheme() {
        chrome.storage.sync.get(['darkMode'], (result) => {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const shouldBeDark = result.darkMode === undefined ? prefersDark : result.darkMode;
            document.body.classList.toggle('dark', shouldBeDark);
            chrome.storage.sync.set({ darkMode: shouldBeDark });
        });
    }
});
