# Clippy Clipboard — Encrypted Clipboard Sync via Telegram

**Clippy Clipboard** is a secure browser extension paired with a Node.js backend that enables real-time clipboard synchronization across devices using Telegram. It allows users to send and retrieve clipboard contents seamlessly, with robust encryption and privacy controls.

---

## 🔐 Key Features

- **Two-Way Clipboard Sync**: Send and retrieve clipboard content via a Telegram bot.
- **Cross-Platform Support**: Use Telegram and your browser to sync across devices.
- **Secure & Encrypted**: All user-specific data is AES-encrypted with key rotation support.
- **Minimal Storage**: Stores only the 5 most recent clips per user.
- **Easy Deployment**: One-command Google Cloud Run deployment with `.env` and config support.
- **Website Content Integration**: Send selected webpage content directly to your clipboard via context menu.

---

## 🧩 Chrome Extension Setup

1. Clone or download the repository.
2. Navigate to `chrome://extensions/` in a Chromium-based browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `frontend` folder.
5. The extension is now active and ready to configure.

---

## 🚀 Backend Setup & Deployment

### Prerequisites

- Node.js and npm (or yarn)
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- Google Cloud SDK installed and authenticated
- `.env` file with the following environment variables:

```env
TELEGRAM_BOT_TOKEN=<your_bot_token>
PORT=8080
JWT_SECRET=<your_jwt_secret>
ENCRYPTION_MASTER_KEY=<your_encryption_key>
NODE_ENV=production
ENCRYPTION_KEY_ROTATION_DAYS=30
SESSION_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d
```

> 🔐 Use Node.js `crypto` to generate secure secrets:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### Install Dependencies

```bash
cd backend
npm install
```

### Development Server

To run locally:

```bash
npm start
```

---

## ☁️ Google Cloud Deployment

To deploy the backend to Cloud Run:

### 1. Configure Deployment Settings

Update the `deploy.config.json` file in the `backend` directory:

```json
{
  "projectId": "your-google-cloud-project-id",
  "region": "us-central1",
  "serviceName": "clippy-api"
}
```

Ensure your `.env` file is also present in the root of the `backend` folder.

### 2. Deploy to Google Cloud

```bash
npm run build:gcloud
```

This script:
- Parses your `.env` file
- Builds the Docker image via `gcloud builds submit`
- Deploys the image to Cloud Run using your config

### 2. Deploy to Google Cloud

```bash
npm run update:gcloud
```

This script:
- Parses your `.env` file
- Builds the Docker image via `gcloud run deploy`
- Deploys the image to Cloud Run using your config

---

## 🧐 Extension Configuration

1. Click the Clippy icon in your browser toolbar and open the **Configuration** screen.
2. Start the Telegram bot by messaging it on Telegram.
3. It will return a unique **clipboard ID**.
4. Paste this ID into the extension config and click **Save**.

You're now ready to send and receive clipboard items from any device!

---

## 📌 Usage

- **Send Clipboard**: Click the extension icon and select **Send Clipboard**.
- **Retrieve Clipboard**: Click **Retrieve Clipboard** to fetch your latest clip.
- **Send Selected Text**: Highlight text on any website, right-click, and choose **Send Selected Content**.

---

## 🛡 Security Highlights

- All user data (user ID, clipboard text) is AES-encrypted using a rotating master key.
- Tokens are secured via JWT with custom expiry options.
- Backend only stores the latest 5 clips per user to minimize footprint and exposure.
- Cloud Run instances are stateless and isolated.

---

## 🧪 Troubleshooting

- **Bot not responding?** Verify your Telegram bot token is correct and the bot is started.
- **Invalid config?** Double-check your `.env` and Cloud project values.
- **Extension issues?** Review browser console logs for helpful errors.

---

## 🤝 Contributing

Clippy is open to contributions! Feel free to:
- Fork the repository
- Open issues for bugs or enhancements
- Submit pull requests