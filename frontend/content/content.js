(() => {
    let notificationQueue = [];
    let isShowingNotification = false;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Message received", request);

        // Add ping response to check if content script is available
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

    // Signal that content script is ready
    console.log("Clippy content script initialized and ready");
})();