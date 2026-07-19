/*
 * PLAYBOOK RELEASE CONTROL
 *
 * When the final PDF is uploaded to Google Drive:
 * 1. Change status from "prelaunch" to "ready".
 * 2. Paste the public Google Drive PDF URL into googleDriveUrl.
 * 3. Publish this file. No other page or MailerLite email needs editing.
 */
window.ENOCH_PLAYBOOK = Object.freeze({
    status: 'prelaunch',
    googleDriveUrl: ''
});
