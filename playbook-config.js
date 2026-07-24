/*
 * PLAYBOOK RELEASE CONTROL
 *
 * status: 'ready'  -> playbook-download.html redirects straight to the PDF.
 * status: 'prelaunch' -> shows the "being finalized" holding page instead.
 *
 * The PDF is served from this site (downloads/) rather than Google Drive, so
 * the link never breaks and we control it. /downloads/ is disallowed in
 * robots.txt so the file is not indexed by search engines. To swap in a new
 * edition, upload the new file and update the URL below. Nothing else needs
 * editing: every MailerLite email points at playbook-download.html.
 *
 * Released 2026-07-24.
 */
window.ENOCH_PLAYBOOK = Object.freeze({
    status: 'ready',
    googleDriveUrl: 'https://www.enochmarketing.com/downloads/2026-gym-growth-playbook.pdf'
});
