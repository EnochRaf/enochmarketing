(() => {
    const body = document.body;
    const announcement = document.getElementById('announcementBar');
    const announcementClose = document.getElementById('announcementClose');
    const navToggle = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const siteNav = document.querySelector('.site-nav');
    const readingProgress = document.querySelector('#readingProgress span');

    if (announcement && announcementClose) {
        announcementClose.addEventListener('click', () => {
            body.classList.add('announcement-dismissed');
            announcement.setAttribute('aria-hidden', 'true');
            announcement.querySelectorAll('a, button').forEach((control) => {
                control.setAttribute('tabindex', '-1');
            });
        });
    }

    const setMenu = (open) => {
        if (!navToggle || !mobileMenu) return;
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        mobileMenu.classList.toggle('open', open);
        body.classList.toggle('menu-open', open);
    };

    if (navToggle && mobileMenu) {
        navToggle.addEventListener('click', () => {
            setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
        });

        mobileMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => setMenu(false));
        });

        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setMenu(false);
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 860) setMenu(false);
        }, { passive: true });
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveals = document.querySelectorAll('.reveal');

    document.querySelectorAll('.pain-grid, .deliverable-grid, .process-grid, .metric-grid, .related-grid, .comparison').forEach((group) => {
        Array.from(group.children).forEach((element, index) => {
            element.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 70}ms`);
        });
    });

    if (reducedMotion || !('IntersectionObserver' in window)) {
        reveals.forEach((element) => element.classList.add('is-visible'));
    } else {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -45px 0px' });

        reveals.forEach((element) => observer.observe(element));
    }

    let scrollFrame = 0;
    const updateScrollState = () => {
        scrollFrame = 0;
        const available = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        const progress = Math.min(Math.max(window.scrollY / available, 0), 1);
        if (readingProgress) readingProgress.style.transform = `scaleX(${progress})`;
        if (siteNav) siteNav.classList.toggle('is-scrolled', window.scrollY > 18);
    };

    const requestScrollUpdate = () => {
        if (scrollFrame) return;
        scrollFrame = window.requestAnimationFrame(updateScrollState);
    };

    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate, { passive: true });
    updateScrollState();

    if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
        document.querySelectorAll('.spotlight-card').forEach((card) => {
            card.addEventListener('pointermove', (event) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
                card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
            });
        });
    }

    document.querySelectorAll('.commercial-faq-item').forEach((item) => {
        item.addEventListener('toggle', () => {
            if (!item.open) return;
            document.querySelectorAll('.commercial-faq-item[open]').forEach((openItem) => {
                if (openItem !== item) openItem.removeAttribute('open');
            });
        });
    });

    const service = document.documentElement.dataset.service || 'gym_marketing';
    window.dataLayer = window.dataLayer || [];

    document.querySelectorAll('[data-service-cta]').forEach((link) => {
        link.addEventListener('click', () => {
            window.dataLayer.push({
                event: 'service_page_cta_click',
                service,
                cta_location: link.dataset.serviceCta,
                cta_destination: link.getAttribute('href')
            });
        });
    });
})();
