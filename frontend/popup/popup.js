document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        mainContent: document.getElementById('main-content'),
        setupRequired: document.getElementById('setup-required'),
        userId: document.getElementById('userId'),
        retrieveButton: document.getElementById('retrieveButton'),
        sendButton: document.getElementById('sendButton'),
        copyButton: document.getElementById('copyButton'),
        confirmSendButton: document.getElementById('confirmSendButton'),
        cancelSendButton: document.getElementById('cancelSendButton'),
        messageInput: document.getElementById('messageInput'),
        messageContent: document.getElementById('messageContent'),
        retrievedContent: document.getElementById('retrievedContent'),
        sendContent: document.getElementById('sendContent'),
        status: document.getElementById('status'),
        openSetup: document.getElementById('openSetup'),
        configButton: document.getElementById('configButton'),
        themeToggle: document.getElementById('themeToggle'),
        longMessageLink: document.getElementById('longMessageLink')
    };

    loadUserData();
    setupEventListeners();
    initTheme();

    function loadUserData() {
        chrome.storage.sync.get(['userId', 'isConfigured', 'darkMode'], (result) => {
            if (!result.isConfigured) {
                elements.mainContent.style.display = 'none';
                elements.setupRequired.style.display = 'flex';
                elements.setupRequired.classList.add('fade-in');
            } else {
                elements.userId.textContent = result.userId;
                document.body.classList.toggle('dark', result.darkMode === true);
            }
        });
    }

    function setupEventListeners() {
        elements.openSetup.addEventListener('click', openOptionsPage);
        elements.configButton.addEventListener('click', openOptionsPage);
        elements.retrieveButton.addEventListener('click', handleRetrieveMessage);
        elements.sendButton.addEventListener('click', handleShowSendForm);
        elements.cancelSendButton.addEventListener('click', handleCancelSend);
        elements.confirmSendButton.addEventListener('click', handleSendMessage);
        elements.copyButton.addEventListener('click', handleCopyToClipboard);
        elements.themeToggle.addEventListener('click', toggleDarkMode);
        elements.messageInput.addEventListener('input', function () {
            const maxChars = 4000;
            const currentLength = this.value.length;
            if (currentLength >= maxChars) {
                this.style.border = "2px solid red";
                elements.longMessageLink.style.display = 'block';
            } else {
                this.style.border = "";
                elements.longMessageLink.style.display = 'none';
                clearStatus();
            }
        });
    }

    function openOptionsPage() {
        chrome.runtime.openOptionsPage();
    }

    function handleRetrieveMessage() {
        showContentBox(elements.retrievedContent);
        hideContentBox(elements.sendContent);

        setStatus('Retrieving latest message...', 'loading');

        chrome.storage.sync.get(['userId', 'sessionToken', 'refreshToken'], (result) => {
            if (!result.userId || !result.sessionToken) {
                setStatus('Error: Not properly configured. Please go to settings.', 'error');
                return;
            }

            chrome.runtime.sendMessage({
                action: 'retrieveMessage',
                userId: result.userId,
                sessionToken: result.sessionToken,
                refreshToken: result.refreshToken
            }, handleRetrieveResponse);
        });
    }

    function handleRetrieveResponse(response) {
        if (!response) {
            setStatus('Error: Communication with extension failed', 'error');
            return;
        }

        if (response.tokenUpdated) {
            console.log('Token was refreshed during the request');
        }

        if (response.success && response.message) {
            elements.messageContent.textContent = response.message;
            showContentBox(elements.retrievedContent);
            setStatus('Message retrieved successfully', 'success');
        } else if (response.success && !response.message) {
            elements.messageContent.textContent = 'No recent messages found.';
            showContentBox(elements.retrievedContent);
            setStatus('No recent messages available', 'normal');
        } else {
            hideContentBox(elements.retrievedContent);
            setStatus(`Error: ${response.error || 'Failed to retrieve message'}`, 'error');
        }
    }

    function handleShowSendForm() {
        hideContentBox(elements.retrievedContent);
        showContentBox(elements.sendContent);
        elements.messageInput.focus();
        clearStatus();
    }

    function handleCancelSend() {
        hideContentBox(elements.sendContent);
        elements.messageInput.value = '';
        clearStatus();
    }

    function handleSendMessage() {
        const message = elements.messageInput.value.trim();

        if (message.length === 0) {
            setStatus('Error: Message cannot be empty', 'error');
            elements.messageInput.focus();
            return;
        }
        if (message.length > 4000) {
            elements.messageInput.style.border = "2px solid red";
            elements.longMessageLink.style.display = 'block';
            return;
        }
        setStatus('Sending message...', 'loading');
        chrome.storage.sync.get(['userId', 'sessionToken', 'refreshToken'], (result) => {
            if (!result.userId || !result.sessionToken) {
                setStatus('Error: Not properly configured. Please go to settings.', 'error');
                return;
            }

            chrome.runtime.sendMessage({
                action: 'sendMessage',
                userId: result.userId,
                message: message,
                sessionToken: result.sessionToken,
                refreshToken: result.refreshToken
            }, handleSendResponse);
        });
    }

    function handleSendResponse(response) {
        if (!response) {
            setStatus('Error: Communication with extension failed', 'error');
            return;
        }

        if (response.tokenUpdated) {
            console.log('Token was refreshed during the send request');
        }

        if (response.success) {
            hideContentBox(elements.sendContent);
            elements.messageInput.value = '';
            setStatus('Message sent successfully', 'success');
        } else {
            setStatus(`Error: ${response.error || 'Failed to send message'}`, 'error');
        }
    }

    function handleCopyToClipboard() {
        const messageContent = elements.messageContent.textContent;

        if (!messageContent || messageContent.length === 0) {
            setStatus('Nothing to copy', 'error');
            return;
        }

        navigator.clipboard.writeText(messageContent)
            .then(() => {
                setStatus('Copied to clipboard!', 'success');

                const copyButton = elements.copyButton;
                copyButton.textContent = 'Copied!';
                copyButton.disabled = true;

                setTimeout(() => {
                    copyButton.textContent = 'Copy to Clipboard';
                    copyButton.disabled = false;
                }, 2000);
            })
            .catch((err) => {
                setStatus(`Error copying to clipboard: ${err}`, 'error');
            });
    }

    function toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark');
        chrome.storage.sync.set({ darkMode: isDark });
    }

    function initTheme() {
        chrome.storage.sync.get(['darkMode'], (result) => {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const shouldBeDark = result.darkMode === undefined ? prefersDark : result.darkMode;

            document.body.classList.toggle('dark', shouldBeDark);
            chrome.storage.sync.set({ darkMode: shouldBeDark });
        });
    }

    function showContentBox(element) {
        element.style.display = 'block';
        setTimeout(() => {
            element.classList.add('active');
        }, 10);
    }

    function hideContentBox(element) {
        element.classList.remove('active');
        setTimeout(() => {
            element.style.display = 'none';
        }, 300);
    }

    function setStatus(message, type = 'normal') {
        elements.status.textContent = message;
        elements.status.className = 'status';

        if (type === 'error') {
            elements.status.classList.add('error');
        } else if (type === 'success') {
            elements.status.classList.add('success');
        } else if (type === 'loading') {
            elements.status.classList.add('loading');
        }

        clearTimeout(elements.status._timeout);

        if (type !== 'loading') {
            elements.status._timeout = setTimeout(clearStatus, 3000);
        }
    }

    function clearStatus() {
        elements.status.textContent = '';
        elements.status.className = 'status';
    }
});
