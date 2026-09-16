const { randomUUID } = require('crypto');

const DEFAULT_FORMSPREE_FORM_ID = 'xzdwegky';
const MAX_BODY_BYTES = 12_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// Best-effort protection for warm serverless instances. A shared durable rate
// limiter must replace this before paid traffic is sent to the page.
const requestBuckets = new Map();

function sendJson(res, status, body) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(status).json(body);
}

function text(value, maxLength) {
    return typeof value === 'string'
        ? value.trim().replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, maxLength)
        : '';
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isValidWebsite(value) {
    try {
        const parsed = new URL(value);
        return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname);
    } catch {
        return false;
    }
}

function getRequestHost(req) {
    return text(req.headers['x-forwarded-host'] || req.headers.host, 255).toLowerCase();
}

function isAllowedOrigin(req) {
    const origin = text(req.headers.origin, 500);
    if (!origin) return true;

    try {
        const originUrl = new URL(origin);
        const requestHost = getRequestHost(req);
        const configuredOrigins = text(process.env.GYM_RECON_ALLOWED_ORIGINS, 2000)
            .split(',')
            .map(value => value.trim())
            .filter(Boolean);

        return originUrl.host.toLowerCase() === requestHost || configuredOrigins.includes(origin);
    } catch {
        return false;
    }
}

function getClientIp(req) {
    const forwarded = text(req.headers['x-forwarded-for'], 500);
    return forwarded.split(',')[0].trim() || text(req.socket && req.socket.remoteAddress, 100) || 'unknown';
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

function validateLead(body) {
    const lead = {
        firstName: text(body.firstName, 80),
        gymName: text(body.gymName, 140),
        email: text(body.email, 254).toLowerCase(),
        website: text(body.website, 500),
        city: text(body.city, 140),
        frustration: text(body.frustration, 2000),
        ads: text(body.ads, 20),
        sourceUrl: text(body.sourceUrl, 1000)
    };

    const errors = {};
    if (!lead.firstName) errors.firstName = 'First name is required.';
    if (!lead.gymName) errors.gymName = 'Gym name is required.';
    if (!isValidEmail(lead.email)) errors.email = 'A valid email is required.';
    if (!isValidWebsite(lead.website)) errors.website = 'A valid website URL is required.';
    if (!lead.city) errors.city = 'City and state are required.';
    if (lead.frustration.length < 20) errors.frustration = 'Please provide at least one sentence.';
    if (!['Yes', 'No', 'Not answered'].includes(lead.ads)) lead.ads = 'Not answered';

    return { lead, errors };
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

    // Honeypot submissions receive a neutral response and are not forwarded.
    if (text(body.companyUrl, 500)) {
        return sendJson(res, 200, { ok: true });
    }

    if (isRateLimited(req)) {
        return sendJson(res, 429, { ok: false, error: 'Too many requests. Please try again later.' });
    }

    const { lead, errors } = validateLead(body);
    if (Object.keys(errors).length > 0) {
        return sendJson(res, 400, { ok: false, error: 'Please correct the highlighted fields.', fields: errors });
    }

    const formId = text(process.env.GYM_RECON_FORMSPREE_FORM_ID, 100) || DEFAULT_FORMSPREE_FORM_ID;
    const leadId = randomUUID();
    const receivedAt = new Date().toISOString();

    try {
        const providerResponse = await fetch(`https://formspree.io/f/${encodeURIComponent(formId)}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                _subject: `Gym Recon request from ${lead.gymName}`,
                _replyto: lead.email,
                form_name: 'Gym Recon subscription request',
                lead_id: leadId,
                received_at: receivedAt,
                first_name: lead.firstName,
                gym_name: lead.gymName,
                email: lead.email,
                website: lead.website,
                city_state: lead.city,
                running_paid_ads: lead.ads,
                primary_frustration: lead.frustration,
                source_url: lead.sourceUrl
            }),
            signal: AbortSignal.timeout(8000)
        });

        if (!providerResponse.ok) {
            console.error('Gym Recon intake provider failure', {
                leadId,
                status: providerResponse.status
            });
            return sendJson(res, 502, { ok: false, error: 'We could not save your request. Please try again.' });
        }

        console.info('Gym Recon intake accepted', { leadId });
        return sendJson(res, 200, { ok: true, leadId });
    } catch (error) {
        console.error('Gym Recon intake request failed', {
            leadId,
            error: error && error.name ? error.name : 'UnknownError'
        });
        return sendJson(res, 502, { ok: false, error: 'We could not save your request. Please try again.' });
    }
};
