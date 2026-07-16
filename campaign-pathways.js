(function () {
    const links = document.querySelectorAll('[data-campaign-pathway-link]');
    if (!links.length) return;

    links.forEach(function (link) {
        link.addEventListener('click', function () {
            const section = link.closest('[data-pathway-source]');
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'campaign_pathway_click',
                pathway_source: section ? section.dataset.pathwaySource : 'unknown',
                pathway_destination: link.dataset.pathwayDestination || 'unknown',
                pathway_format: link.dataset.pathwayFormat || 'unknown',
                pathway_placement: 'pre_footer'
            });
        });
    });
})();
