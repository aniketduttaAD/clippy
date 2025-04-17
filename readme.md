```markdown
# Clippy Clipboard Extension

**Clippy Clipboard** is a browser extension that allows you to easily send and retrieve clipboard messages through a Telegram bot. It provides seamless clipboard synchronization across devices by integrating with Telegram.

### Features
- **Send and Retrieve Messages**: Easily send and retrieve clipboard contents via Telegram.
- **Select and Send Content**: Quickly select content on any website and send it to your clipboard.
- **Easy Configuration & Setup**: Simple to set up and start using.
- **Secure & Encrypted**: User-specific data is encrypted and stored securely.
- **Store User-Specific Clips**: Each user has a random clipboard ID and can store the latest 5 clips, encrypted for security.
- **Encrypted Connection**: All data is transferred securely with encryption.
- **Optimized Storage**: Only the latest 5 clipboard entries are stored per user and overwritten when new clips are added.

---

## Features Overview

1. **Send Clipboard**: Send the content of your clipboard to a specified Telegram user.
2. **Retrieve Clipboard**: Retrieve and paste the most recent clipboard entry directly into your browser.
3. **Website Integration**: Select any content on a webpage and quickly send it as a clipboard message.
4. **Encryption**: All sensitive data (user IDs, clipboard data) is encrypted for added security.

---

## Installation

### Chrome Extension Setup

1. Download or clone the repository.
2. Open **Chrome** or **Chromium-based browser**.
3. Go to `chrome://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the folder where the extension files are located.
6. The extension will be installed and active in your browser.

---

## Backend Setup

The backend handles the communication between the browser extension and the Telegram bot. It manages the encryption of user data and stores clipboard entries securely.

### Prerequisites

- **Node.js** and **npm** (or **yarn**) must be installed.
- **Telegram Bot Token**: Obtain this from [BotFather](https://core.telegram.org/bots#botfather).
- **Encryption Master Key**: A strong key used to encrypt and decrypt clipboard data.
- **JWT Secret**: A secret key used to generate JWT tokens.

### Backend Setup Steps

1. Clone or download the backend repository.
2. Navigate to the project folder in your terminal.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the root directory with the following environment variables:

   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   PORT=5001
   ALLOWED_ORIGINS=chrome-extension://gfifelbmihejookiegiboilegkehdbfo
   JWT_SECRET=your_jwt_secret_here
   ENCRYPTION_MASTER_KEY=your_encryption_master_key_here
   NODE_ENV=production
   ENCRYPTION_KEY_ROTATION_DAYS=30
   SESSION_TOKEN_EXPIRY=1d
   REFRESH_TOKEN_EXPIRY=7d
   ```

   - **TELEGRAM_BOT_TOKEN**: Get your Telegram bot token from BotFather.
   - **JWT_SECRET**: Generate a secret key (you can use Node's `crypto` module to generate one).
   - **ENCRYPTION_MASTER_KEY**: Generate a strong encryption key (use `crypto` as well).
   - **ALLOWED_ORIGINS**: This should match your Chrome extension’s ID (`chrome-extension://<extension-id>`).

   Example of generating a JWT Secret and Encryption Key:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. Start the backend server:

   ```bash
   npm start
   ```

   The backend should now be running on `http://localhost:5001`.

---

## Chrome Extension Configuration

1. Open the extension’s options page by clicking on the extension icon in your browser toolbar and selecting **Options**.
2. In the options page, configure your **Telegram User ID** (the ID of the person you want to sync your clipboard with).
3. Optionally, configure any other settings for clipboard syncing.

---

## Usage

Once the extension and backend are set up:

1. **Send Clipboard**: Click on the extension icon and select "Send Clipboard" to send the current clipboard content to your Telegram chat.
2. **Retrieve Clipboard**: Click on the extension icon and select "Retrieve Clipboard" to get the latest clipboard content.
3. **Select & Send Website Content**: Highlight text on any website, right-click, and choose "Send Selected Content" from the context menu.

---

## Security Features

- **Encrypted Data Storage**: All clipboard content is stored in encrypted format, ensuring that your data remains secure even if the server is compromised.
- **Limited Storage**: Only the latest 5 clips per user are stored, with old clips being overwritten in an optimal manner.
- **Encrypted Communication**: All interactions with the backend, including clipboard retrieval and sending, are secured with encryption.

---

## Troubleshooting

- Ensure your Telegram bot token is correct and active.
- Double-check the allowed origins in your `.env` file.
- Ensure the backend server is running and accessible.
- If there are any issues with sending or receiving clips, check the browser’s developer console for any errors.

---

## Contributing

Feel free to fork the repository, submit issues, and create pull requests. Contributions are always welcome!

```

This `README.md` file provides a comprehensive guide for setting up and using the Clippy Clipboard extension, as well as instructions for configuring the backend and ensuring secure communication.