/**
 * SkillRecommender — Premium SaaS Frontend Logic
 * Strictly Vanilla JS (no frameworks)
 */

document.addEventListener('DOMContentLoaded', () => {
    const skillInput = document.getElementById('skill-input');
    const levelDropdown = document.getElementById('level-dropdown');
    const ctaButton = document.getElementById('cta-button');
    const resultsGrid = document.getElementById('results-grid');
    const loadingIndicator = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Handle Search
    const handleSearch = async () => {
        const skill = skillInput.value.trim();
        const level = levelDropdown.value;

        if (!skill) {
            showToast('Please enter a skill to learn.');
            return;
        }

        // UI State: Loading
        setLoading(true);
        resultsGrid.innerHTML = '';
        emptyState.style.display = 'none';

        try {
            const response = await fetch('/get-resource', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skill, level })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch resources.');
            }

            const resources = await response.json();

            if (!resources || resources.length === 0) {
                setLoading(false);
                emptyState.style.display = 'block';
                emptyState.innerHTML = `<p>No resources found for "${skill}". Try a broader term?</p>`;
                return;
            }

            renderResources(resources);

        } catch (error) {
            showToast(error.message);
            emptyState.style.display = 'block';
        } finally {
            setLoading(false);
        }
    };

    // Render Resources with Staggered Animation
    const renderResources = (resources) => {
        resultsGrid.innerHTML = '';
        
        resources.forEach((resource, index) => {
            const card = createCard(resource, index);
            resultsGrid.appendChild(card);
            
            // Staggered reveal
            setTimeout(() => {
                card.classList.add('show');
            }, index * 100);
        });
    };

    // Card Factory
    const createCard = (data, index) => {
        const card = document.createElement('div');
        card.className = 'resource-card';
        
        // Sanitize and handle missing data
        const title = data.title || 'Untitled Playlist';
        const channel = data.channel || 'Educational Channel';
        const duration = data.duration_hours ? `${data.duration_hours}h content` : 'Full Course';
        const type = data.type || 'Playlist';
        const desc = data.description || 'A high-quality curated learning resource for this skill.';
        const url = data.url || '#';
        const rank = data.rank || (index + 1);

        card.innerHTML = `
            <div class="card-header">
                <span class="rank-badge">#${rank}</span>
                <div class="card-badges">
                    <span class="pill-badge">${escapeHTML(type)}</span>
                    <span class="pill-badge">${escapeHTML(duration)}</span>
                </div>
            </div>
            <h3 class="card-title">${escapeHTML(title)}</h3>
            <span class="channel-name">${escapeHTML(channel)}</span>
            <p class="card-desc">${escapeHTML(desc)}</p>
            <a href="${url}" target="_blank" class="btn-watch" rel="noopener noreferrer">
                Watch Playlist
            </a>
        `;
        
        return card;
    };

    // UI Helpers
    const setLoading = (isLoading) => {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        ctaButton.disabled = isLoading;
        ctaButton.textContent = isLoading ? 'Searching...' : 'Find Resources';
    };

    const showToast = (message) => {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    };

    const escapeHTML = (str) => {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    };

    // Event Listeners
    ctaButton.addEventListener('click', handleSearch);
    
    skillInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});
