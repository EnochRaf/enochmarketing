const { createHmac, randomUUID } = require('crypto');

const DEFAULT_FORMSPREE_FORM_ID = 'xzdwegky';
const DEFAULT_TEAM_NOTIFICATION_URL = 'https://bold-cell-f211.tala-ocevents.workers.dev';
const DEFAULT_FOLLOW_UP_OWNER = 'Rafael';
const DEFAULT_RESPONSE_SLA = 'Review within one business day';
const BETA_NOTICE_VERSION = 'private-beta-v1';
const MAX_BODY_BYTES = 8_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const ATTRIBUTION_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'gbraid',
    'wbraid',
    'fbclid'
];
const requestBuckets = new Map();

function sendJson(res, status, body) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(status).json(body);
}

function cleanText(value, maxLength) {
    return typeof value === 'string'
        ? value.trim().replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, maxLength)
        : '';
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function cleanAttribution(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    return ATTRIBUTION_KEYS.reduce((attribution, key) => {
        const cleaned = cleanText(value[key], 200);
        if (cleaned) attribution[key] = cleaned;
        return attribution;
    }, {});
}

function getRequestHost(req) {
    return cleanText(req.headers['x-forwarded-host'] || req.headers.host, 255).toLowerCase();
}

function isAllowedOrigin(req) {
    const origin = cleanText(req.headers.origin, 500);
    if (!origin) return true;

    try {
        const originUrl = new URL(origin);
        const requestHost = getRequestHost(req);
        const configuredOrigins = cleanText(process.env.GYM_RECON_ALLOWED_ORIGINS, 2000)
            .split(',')
            .map(value => value.trim())
            .filter(Boolean);

        return originUrl.host.toLowerCase() === requestHost || configuredOrigins.includes(origin);
    } catch {
        return false;
    }
}

function getClientIp(req) {
    const forwarded = cleanText(req.headers['x-forwarded-for'], 500);
    return forwarded.split(',')[0].trim() || cleanText(req.socket && req.socket.remoteAddress, 100) || 'unknown';
}

function isRateLimited(req) {
    const now = Date.now();
    const clientIp = getClientIp(req);
    const bucket = requestBuckets.get(clientIp);

    if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
        requestBuckets.set(clientIp, { startedAt: now, count: 1 });
        return false;
    }

    bucket.count += 1;
    return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

async function notifyTeam({ signup, signupId, receivedAt, followUpOwner }) {
    const notificationUrl = cleanText(
        process.env.GYM_RECON_TEAM_NOTIFICATION_URL,
        1000
    ) || DEFAULT_TEAM_NOTIFICATION_URL;

    try {
        const response = await fetch(notificationUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: signup.firstName,
                lastName: 'Gym Recon private beta',
                email: signup.email,
                gymName: signup.gymName,
                date: 'New private-beta application',
                time: DEFAULT_RESPONSE_SLA,
                currentSoftware: signup.platform || 'Not provided',
                sourceUrl: signup.sourceUrl,
                signupId,
                receivedAt,
                followUpOwner,
                attribution: signup.attribution
            }),
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            console.warn('Gym Recon team notification provider failure', {
                signupId,
                status: response.status
            });
            return false;
        }

        return true;
    } catch (error) {
        console.warn('Gym Recon team notification request failed', {
            signupId,
            error: error && error.name ? error.name : 'UnknownError'
        });
        return false;
    }
}

function betaIntakeConfig() {
    const url = cleanText(process.env.GYM_RECON_BETA_INTAKE_URL, 1000);
    const secret = cleanText(process.env.GYM_RECON_BETA_INTAKE_HMAC_SECRET, 5000);
    try {
        const parsed = new URL(url);
        return {
            enabled: parsed.protocol === 'https:' && secret.length >= 32,
            url: parsed.protocol === 'https:' ? parsed.toString() : '',
            secret
        };
    } catch {
        return { enabled: false, url: '', secret: '' };
    }
}

async function recordBetaApplication({ signup, signupId, receivedAt }) {
    const config = betaIntakeConfig();
    if (!config.enabled) throw new Error('Gym Recon beta intake is not configured.');
    const intakePayload = {
        signupId,
        receivedAt,
        firstName: signup.firstName,
        gymName: signup.gymName,
        email: signup.email,
        platform: signup.platform,
        sourceUrl: signup.sourceUrl,
        attribution: signup.attribution,
        betaNoticeAccepted: signup.betaNoticeAccepted,
        betaNoticeVersion: signup.betaNoticeVersion,
        marketingConsent: signup.marketingConsent
    };
    const rawBody = JSON.stringify(intakePayload);
    const timestamp = String(Date.now());
    const signature = createHmac('sha256', config.secret).update(`${timestamp}.${rawBody}`).digest('hex');
    const response = await fetch(config.url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Gym-Recon-Timestamp': timestamp,
            'X-Gym-Recon-Signature': signature
        },
        body: rawBody,
        signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('Gym Recon beta intake rejected the application.');
    return response.json();
}

function validateSignup(body) {
    const allowedPlatforms = ['Wodify', 'Mindbody', 'PushPress', 'Other', 'None yet'];
    const signup = {
        firstName: cleanText(body.firstName, 80),
        gymName: cleanText(body.gymName, 140),
        email: cleanText(body.email, 254).toLowerCase(),
        platform: cleanText(body.platform, 80),
        sourceUrl: cleanText(body.sourceUrl, 1000),
        attribution: cleanAttribution(body.attribution),
        betaNoticeAccepted: body.betaNoticeAccepted === true || body.betaNoticeAccepted === 'true' || body.betaNoticeAccepted === 'on',
        betaNoticeVersion: cleanText(body.betaNoticeVersion, 80),
        marketingConsent: body.marketingConsent === true || body.marketingConsent === 'true' || body.marketingConsent === 'on'
    };

    const errors = {};
    if (!signup.firstName) errors.firstName = 'First name is required.';
    if (!signup.gymName) errors.gymName = 'Gym name is required.';
    if (!isValidEmail(signup.email)) errors.email = 'A valid email is required.';
    if (signup.platform && !allowedPlatforms.includes(signup.platform)) errors.platform = 'Select a valid gym software option.';
    if (!signup.betaNoticeAccepted) errors.betaNoticeAccepted = 'Accept the beta testing notice to apply.';
    if (signup.betaNoticeVersion !== BETA_NOTICE_VERSION) errors.betaNoticeVersion = 'Refresh the page and accept the current beta notice.';

    return { signup, errors };
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    }

    if (!isAllowedOrigin(req)) {
        return sendJson(res, 403, { ok: false, error: 'Request origin is not allowed.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
        return sendJson(res, 413, { ok: false, error: 'Request is too large.' });
    }

    if (cleanText(body.companyUrl, 500)) {
        return sendJson(res, 200, { ok: true });
    }

    if (isRateLimited(req)) {
        return sendJson(res, 429, { ok: false, error: 'Too many requests. Please try again later.' });
    }

    const { signup, errors } = validateSignup(body);
    if (Object.keys(errors).length > 0) {
        return sendJson(res, 400, {
            ok: false,
            error: 'Please correct the highlighted fields.',
            fields: errors
        });
    }

    const formId = cleanText(process.env.GYM_RECON_FORMSPREE_FORM_ID, 100) || DEFAULT_FORMSPREE_FORM_ID;
    const followUpOwner = cleanText(process.env.GYM_RECON_FOLLOW_UP_OWNER, 80) || DEFAULT_FOLLOW_UP_OWNER;
    const signupId = randomUUID();
    const receivedAt = new Date().toISOString();
    const providerPayload = {
        _subject: `Gym Recon private beta application: ${signup.gymName}`,
        _replyto: signup.email,
        form_name: 'Gym Recon private beta application',
        signup_id: signupId,
        received_at: receivedAt,
        first_name: signup.firstName,
        gym_name: signup.gymName,
        email: signup.email,
        current_gym_software: signup.platform || 'Not provided',
        source_url: signup.sourceUrl,
        attribution_status: Object.keys(signup.attribution).length > 0 ? 'Campaign attributed' : 'Direct or unavailable',
        application_stage: 'New',
        follow_up_owner: followUpOwner,
        response_sla: DEFAULT_RESPONSE_SLA,
        next_action: 'Review beta fit and assign an outcome',
        beta_notice_version: signup.betaNoticeVersion,
        operational_email_consent: signup.betaNoticeAccepted ? 'Accepted' : 'Not accepted',
        marketing_consent: signup.marketingConsent ? 'Opted in' : 'Not opted in'
    };

    ATTRIBUTION_KEYS.forEach(key => {
        if (signup.attribution[key]) providerPayload[key] = signup.attribution[key];
    });

    try {
        const intakeResult = await recordBetaApplication({ signup, signupId, receivedAt });
        const providerPromise = fetch(`https://formspree.io/f/${encodeURIComponent(formId)}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(providerPayload),
            signal: AbortSignal.timeout(8000)
        });
        const notificationPromise = notifyTeam({
            signup,
            signupId,
            receivedAt,
            followUpOwner
        });
        const [providerResult, notificationResult] = await Promise.allSettled([providerPromise, notificationPromise]);
        const formspreeSent = providerResult.status === 'fulfilled' && providerResult.value.ok;
        const teamNotificationSent = notificationResult.status === 'fulfilled' && notificationResult.value === true;
        if (!formspreeSent) console.warn('Gym Recon backup form notification failed', { signupId });

        console.info('Gym Recon private beta application accepted', {
            signupId,
            applicationId: intakeResult.applicationId,
            formspreeSent,
            teamNotificationSent
        });
        return sendJson(res, 200, { ok: true, signupId, status: intakeResult.status || 'applied' });
    } catch (error) {
        console.error('Gym Recon early-access request failed', {
            signupId,
            error: error && error.name ? error.name : 'UnknownError'
        });
        return sendJson(res, 502, { ok: false, error: 'We could not send your application. Please try again.' });
    }
};
