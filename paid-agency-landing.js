(function () {
    const sessionKey = 'enoch_paid_agency_session_v1';
    const attributionSessionKey = 'enoch_agency_attribution_v1';
    const attributionLocalKey = 'enoch_agency_attribution_last_paid_v1';
    const attributionLifetimeMs = 90 * 24 * 60 * 60 * 1000;
    const attributionKeys = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_id',
        'utm_content',
        'utm_term',
        'gclid',
        'gbraid',
        'wbraid',
        'dclid',
        'msclkid',
        'fbclid',
        'device',
        'network',
        'matchtype',
        'campaignid',
        'adgroupid',
        'creative',
        'placement',
        'targetid'
    ];
    const params = new URLSearchParams(window.location.search);
    const normalize = (value) => String(value || '').trim().toLowerCase();
    const clean = (value, maxLength) => String(value || '')
        .trim()
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .slice(0, maxLength || 200);

    const source = normalize(params.get('utm_source'));
    const medium = normalize(params.get('utm_medium')).replace(/[-\s]+/g, '_');
    const campaign = normalize(params.get('utm_campaign'));
    const paidMediums = new Set(['cpc', 'ppc', 'paid_search', 'paidsearch']);
    const isExplicitAgencyVisit = params.get('enoch_paid_agency') === '1';
    const isAgencyGoogleCampaign = source === 'google' &&
        paidMediums.has(medium) &&
        (campaign === 'enoch_gym_marketing_search' || campaign.startsWith('enoch_gym_marketing_'));

    let isPaidAgencySession = isExplicitAgencyVisit || isAgencyGoogleCampaign;

    function cleanFields(fields) {
        return attributionKeys.reduce(function (cleaned, key) {
            const value = clean(fields && fields[key]);
            if (value) cleaned[key] = value;
            return cleaned;
        }, {});
    }

    function createAttributionRecord() {
        const fields = attributionKeys.reduce(function (captured, key) {
            const value = clean(params.get(key));
            if (value) captured[key] = value;
            return captured;
        }, {});
        const capturedAt = new Date().toISOString();

        return {
            version: 1,
            capturedAt: capturedAt,
            expiresAt: Date.now() + attributionLifetimeMs,
            landingPage: clean(window.location.pathname, 500),
            firstTouchUrl: clean(window.location.href, 1000),
            fields: fields
        };
    }

    function validateAttributionRecord(candidate) {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
        const expiresAt = Number(candidate.expiresAt || 0);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

        const fields = cleanFields(candidate.fields);
        if (Object.keys(fields).length === 0) return null;

        return {
            version: 1,
            capturedAt: clean(candidate.capturedAt, 50),
            expiresAt: expiresAt,
            landingPage: clean(candidate.landingPage, 500),
            firstTouchUrl: clean(candidate.firstTouchUrl, 1000),
            fields: fields
        };
    }

    function readStoredRecord(storage, key) {
        try {
            return validateAttributionRecord(JSON.parse(storage.getItem(key) || 'null'));
        } catch (error) {
            return null;
        }
    }

    function writeRecord(storage, key, record) {
        try {
            storage.setItem(key, JSON.stringify(record));
        } catch (error) {
            // URL forwarding remains available when browser storage is disabled.
        }
    }

    const sessionAttributionRecord = readStoredRecord(window.sessionStorage, attributionSessionKey);
    const localAttributionRecord = readStoredRecord(window.localStorage, attributionLocalKey);
    let attributionRecord = null;
    if (isExplicitAgencyVisit || (isAgencyGoogleCampaign && !sessionAttributionRecord)) {
        attributionRecord = validateAttributionRecord(createAttributionRecord());
        if (attributionRecord) {
            writeRecord(window.sessionStorage, attributionSessionKey, attributionRecord);
            writeRecord(window.localStorage, attributionLocalKey, attributionRecord);
        }
    } else {
        attributionRecord = sessionAttributionRecord || localAttributionRecord;
        if (attributionRecord) {
            writeRecord(window.sessionStorage, attributionSessionKey, attributionRecord);
        }
    }

    window.enochAgencyAttribution = attributionRecord ? attributionRecord.fields : {};
    window.enochAgencyAttributionRecord = attributionRecord;
    document.documentElement.setAttribute(
        'data-agency-attribution-count',
        String(Object.keys(window.enochAgencyAttribution).length)
    );

    try {
        if (isPaidAgencySession) {
            window.sessionStorage.setItem(sessionKey, '1');
        } else {
            isPaidAgencySession = window.sessionStorage.getItem(sessionKey) === '1';
        }
    } catch (error) {
        // The current landing still works when session storage is unavailable.
    }

    if (!isPaidAgencySession) return;

    document.documentElement.classList.add('paid-agency-landing');
    document.documentElement.setAttribute('data-paid-agency-landing', 'true');

    const suppressAnnouncement = () => {
        if (document.body) document.body.classList.add('announcement-dismissed');

        const announcement = document.getElementById('announcementBar');
        if (!announcement) return;

        announcement.hidden = true;
        announcement.setAttribute('aria-hidden', 'true');
        announcement.querySelectorAll('a, button').forEach((control) => {
            control.setAttribute('tabindex', '-1');
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', suppressAnnouncement, { once: true });
    } else {
        suppressAnnouncement();
    }
})();
