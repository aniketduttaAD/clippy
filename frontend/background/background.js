let API_BASE_URL;
function loadConfig() {
    return new Promise((resolve, reject) => {
        fetch(chrome.runtime.getURL('config.json'))
            .then(response => response.json())
            .then(config => {
                resolve(config.server_url);
            })
            .catch(error => {
                console.error('Error loading config.json:', error);
                resolve('http://localhost:3000');
            });
    });
}

chrome.storage.sync.get(['apiUrl'], (result) => {
    if (result.apiUrl) {
        API_BASE_URL = result.apiUrl;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'sendToClippy',
        title: 'Send to Clippy',
        contexts: ['selection']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'sendToClippy' && info.selectionText) {
        chrome.storage.sync.get(['userId', 'isConfigured', 'sessionToken', 'refreshToken'], (result) => {
            if (!result.isConfigured || !result.userId) {
                showNotification(tab.id, 'Please set up Clippy extension first', 'warning');
                chrome.runtime.openOptionsPage();
                return;
            }

            if (!result.sessionToken || !result.refreshToken) {
                getTokensForUser(result.userId)
                    .then(tokenResponse => {
                        if (tokenResponse.success) {
                            let message = info.selectionText.trim();
                            if (message.length > 4500) {
                                showNotification(tab.id, 'Note: Only the first 4500 characters were sent.', 'info');
                                message = message.slice(0, 4500);
                            }

                            sendMessageToBot(result.userId, message, tokenResponse.sessionToken, tokenResponse.refreshToken)
                                .then(response => {
                                    if (response.success) {
                                        showNotification(tab.id, 'Text sent to Clippy', 'success');
                                        if (response.tokenUpdated) {
                                            chrome.storage.sync.set({
                                                sessionToken: response.sessionToken,
                                                refreshToken: response.refreshToken
                                            });
                                        }
                                    } else {
                                        showNotification(tab.id, 'Error: ' + (response.error || 'Unable to send text'), 'error');
                                    }
                                });
                        } else {
                            showNotification(tab.id, 'Error getting authentication: ' + (tokenResponse.error || 'Unknown error'), 'error');
                        }
                    })
                    .catch(error => {
                        showNotification(tab.id, 'Error: ' + error.message, 'error');
                    });
                return;
            }

            const message = info.selectionText.trim();

            if (message.length > 4000) {
                showNotification(tab.id, 'Selected text is too long (max 4000 characters)', 'error');
                return;
            }

            sendMessageToBot(result.userId, message, result.sessionToken, result.refreshToken)
                .then(response => {
                    if (response.success) {
                        showNotification(tab.id, 'Text sent to Clippy', 'success');
                        if (response.tokenUpdated) {
                            chrome.storage.sync.set({
                                sessionToken: response.sessionToken,
                                refreshToken: response.refreshToken
                            });
                        }
                    } else {
                        showNotification(tab.id, 'Error: ' + (response.error || 'Unable to send text'), 'error');
                    }
                })
                .catch(error => {
                    showNotification(tab.id, 'Error: ' + error.message, 'error');
                });
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'retrieveMessage') {
        if (!request.sessionToken || !request.refreshToken) {
            getTokensForUser(request.userId)
                .then(tokenResponse => {
                    if (tokenResponse.success) {
                        chrome.storage.sync.set({
                            sessionToken: tokenResponse.sessionToken,
                            refreshToken: tokenResponse.refreshToken
                        });

                        retrieveLatestMessage(request.userId, tokenResponse.sessionToken, tokenResponse.refreshToken)
                            .then(response => {
                                sendResponse({
                                    ...response,
                                    tokenUpdated: true,
                                    sessionToken: tokenResponse.sessionToken,
                                    refreshToken: tokenResponse.refreshToken
                                });
                            })
                            .catch(error => {
                                sendResponse({ success: false, error: error.message });
                            });
                    } else {
                        sendResponse({ success: false, error: tokenResponse.error || 'Could not get authentication tokens' });
                    }
                })
                .catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }

        retrieveLatestMessage(request.userId, request.sessionToken, request.refreshToken)
            .then(response => {
                sendResponse(response);
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (request.action === 'sendMessage') {
        if (!request.sessionToken || !request.refreshToken) {
            getTokensForUser(request.userId)
                .then(tokenResponse => {
                    if (tokenResponse.success) {
                        chrome.storage.sync.set({
                            sessionToken: tokenResponse.sessionToken,
                            refreshToken: tokenResponse.refreshToken
                        });

                        sendMessageToBot(request.userId, request.message, tokenResponse.sessionToken, tokenResponse.refreshToken)
                            .then(response => {
                                sendResponse({
                                    ...response,
                                    tokenUpdated: true,
                                    sessionToken: tokenResponse.sessionToken,
                                    refreshToken: tokenResponse.refreshToken
                                });
                            })
                            .catch(error => {
                                sendResponse({ success: false, error: error.message });
                            });
                    } else {
                        sendResponse({ success: false, error: tokenResponse.error || 'Could not get authentication tokens' });
                    }
                })
                .catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }

        sendMessageToBot(request.userId, request.message, request.sessionToken, request.refreshToken)
            .then(response => {
                sendResponse(response);
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (request.action === 'updateApiUrl') {
        API_BASE_URL = request.apiUrl;
        sendResponse({ success: true });
        return false;
    }

    if (request.action === 'getTokensForUser') {
        getTokensForUser(request.userId)
            .then(response => {
                sendResponse(response);
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});

async function getTokensForUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: `Server responded with status: ${response.status}` }));
            return {
                success: false,
                error: error.error || `Failed to get tokens (Status: ${response.status})`
            };
        }

        const data = await response.json();
        if (data.success) {
            return {
                success: true,
                sessionToken: data.sessionToken,
                refreshToken: data.refreshToken
            };
        } else {
            return {
                success: false,
                error: data.error || 'Unknown error occurred while getting tokens'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Network error while communicating with server'
        };
    }
}

async function retrieveLatestMessage(userId, sessionToken, refreshToken) {
    try {
        let response = await fetch(`${API_BASE_URL}/api/messages/latest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ userId }),
        });

        if (response.status === 401) {
            const refreshResult = await refreshAuthToken(refreshToken);
            if (!refreshResult.success) {
                return {
                    success: false,
                    error: 'Authentication error: ' + refreshResult.error
                };
            }

            chrome.storage.sync.set({
                sessionToken: refreshResult.sessionToken,
                refreshToken: refreshResult.refreshToken
            });

            response = await fetch(`${API_BASE_URL}/api/messages/latest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshResult.sessionToken}`
                },
                body: JSON.stringify({ userId }),
            });

            const data = await response.json();
            return {
                ...data,
                tokenUpdated: true,
                sessionToken: refreshResult.sessionToken,
                refreshToken: refreshResult.refreshToken
            };
        }

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

async function sendMessageToBot(userId, message, sessionToken, refreshToken) {
    try {
        let response = await fetch(`${API_BASE_URL}/api/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
                userId,
                message,
            }),
        });

        if (response.status === 401) {
            const refreshResult = await refreshAuthToken(refreshToken);
            if (!refreshResult.success) {
                return {
                    success: false,
                    error: 'Authentication error: ' + refreshResult.error
                };
            }

            chrome.storage.sync.set({
                sessionToken: refreshResult.sessionToken,
                refreshToken: refreshResult.refreshToken
            });

            response = await fetch(`${API_BASE_URL}/api/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshResult.sessionToken}`
                },
                body: JSON.stringify({
                    userId,
                    message,
                }),
            });

            const data = await response.json();
            return {
                ...data,
                tokenUpdated: true,
                sessionToken: refreshResult.sessionToken,
                refreshToken: refreshResult.refreshToken
            };
        }

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

async function refreshAuthToken(refreshToken) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                error: error.error || `Server responded with status: ${response.status}`
            };
        }

        const data = await response.json();
        if (data.success) {
            return {
                success: true,
                sessionToken: data.sessionToken,
                refreshToken: data.refreshToken
            };
        } else {
            return {
                success: false,
                error: data.error || 'Unknown error during token refresh'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

function showNotification(tabId, message, type = 'info') {
    try {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
            if (chrome.runtime.lastError) {
                createFallbackNotification(message);
                return;
            }

            if (!response) {
                const notificationScript = `
                (() => {
                    let notificationQueue = [];
                    let isShowingNotification = false;

                    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                        if (request.action === 'ping') {
                            sendResponse({ success: true });
                            return;
                        }

                        if (request.action === 'showNotification') {
                            queueNotification(request.message, request.type || 'info');
                            sendResponse({ success: true });
                        }
                    });

                    function queueNotification(message, type) {
                        notificationQueue.push({ message, type });
                        if (!isShowingNotification) {
                            showNextNotification();
                        }
                    }

                    function showNextNotification() {
                        if (notificationQueue.length === 0) {
                            isShowingNotification = false;
                            return;
                        }

                        isShowingNotification = true;
                        const { message, type } = notificationQueue.shift();
                        showNotification(message, type);
                    }

                    function showNotification(message, type = 'info') {
                        let container = document.getElementById('clippy-notification-container');
                        if (!container) {
                            container = document.createElement('div');
                            container.id = 'clippy-notification-container';
                            Object.assign(container.style, {
                                position: 'fixed',
                                top: '20px',
                                right: '20px',
                                zIndex: '2147483647',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: '10px',
                                pointerEvents: 'none'
                            });
                            document.body.appendChild(container);
                        }

                        const notification = document.createElement('div');

                        const colors = {
                            info: { bg: '#1e88e5', icon: 'ℹ️' },
                            success: { bg: '#4caf50', icon: '✓' },
                            error: { bg: '#f44336', icon: '✗' },
                            warning: { bg: '#ff9800', icon: '⚠️' }
                        };

                        const typeInfo = colors[type] || colors.info;

                        const icon = document.createElement('div');
                        icon.textContent = typeInfo.icon;
                        Object.assign(icon.style, {
                            marginRight: '8px',
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        });

                        const messageEl = document.createElement('div');
                        messageEl.textContent = message;

                        Object.assign(notification.style, {
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: typeInfo.bg,
                            color: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            maxWidth: '300px',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                            fontSize: '14px',
                            opacity: '0',
                            transform: 'translateX(20px)',
                            transition: 'opacity 0.3s ease, transform 0.3s ease',
                            pointerEvents: 'auto',
                            cursor: 'pointer'
                        });

                        notification.appendChild(icon);
                        notification.appendChild(messageEl);
                        container.appendChild(notification);

                        notification.addEventListener('click', () => {
                            dismissNotification(notification);
                        });

                        setTimeout(() => {
                            notification.style.opacity = '1';
                            notification.style.transform = 'translateX(0)';
                        }, 10);

                        setTimeout(() => {
                            dismissNotification(notification);
                        }, 4000);
                    }

                    function dismissNotification(notification) {
                        if (!notification || notification.getAttribute('data-dismissing') === 'true') return;

                        notification.setAttribute('data-dismissing', 'true');
                        notification.style.opacity = '0';
                        notification.style.transform = 'translateX(20px)';

                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.parentNode.removeChild(notification);
                            }

                            setTimeout(showNextNotification, 100);
                        }, 300);
                    }
                })();
                `;

                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: executeInPage,
                    args: [notificationScript]
                }).then(() => {
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, {
                            action: 'showNotification',
                            message: message,
                            type: type
                        });
                    }, 100);
                }).catch(() => {
                    createFallbackNotification(message);
                });
            } else {
                chrome.tabs.sendMessage(tabId, {
                    action: 'showNotification',
                    message: message,
                    type: type
                });
            }
        });
    } catch (error) {
        createFallbackNotification(message);
    }
}

function createFallbackNotification(message) {
    const iconUrl = chrome.runtime.getURL('assets/48x48.png');
    chrome.notifications.create({
        type: 'basic',
        iconUrl: iconUrl,
        title: 'Clippy',
        message: message
    }, notificationId => {
        if (chrome.runtime.lastError) {
            console.error('Notification creation failed:', chrome.runtime.lastError.message);
            chrome.notifications.create({
                type: 'basic',
                title: 'Clippy',
                message: message
            });
        }
    });
}

function executeInPage(scriptContent) {
    const script = document.createElement('script');
    script.textContent = scriptContent;
    document.documentElement.appendChild(script);
    script.remove();
}