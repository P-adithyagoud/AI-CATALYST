/**
 * SkillRecommender — Premium SaaS Frontend Logic
 * Strictly Vanilla JS (no frameworks)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const skillInput = document.getElementById('skill-input');
    const levelDropdown = document.getElementById('level-dropdown');
    const ctaButton = document.getElementById('cta-button');
    const loadingIndicator = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Steps & Grids
    const resultsNav = document.getElementById('results-nav');
    const playlistStep = document.getElementById('playlist-step');
    const certificateStep = document.getElementById('certificate-step');
    const playlistGrid = document.getElementById('playlist-grid');
    const certificateGrid = document.getElementById('certificate-grid');

    // Tabs
    const tabPlaylists = document.getElementById('tab-playlists');
    const tabCertificates = document.getElementById('tab-certificates');

    // Local results store
    let currentResults = { playlists: [], certificates: [] };

    /**
     * Handle Search
     */
    const handleSearch = async () => {
        const skill = skillInput.value.trim();
        const level = levelDropdown.value;

        if (!skill) {
            showToast('Please enter a skill to learn.');
            return;
        }

        // Reset UI
        setLoading(true);
        resetViews();

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

            const data = await response.json();
            currentResults = data;

            if ((!data.playlists || data.playlists.length === 0) && (!data.certificates || data.certificates.length === 0)) {
                setLoading(false);
                emptyState.style.display = 'block';
                return;
            }

            // Show Navigation and Step 1
            resultsNav.style.display = 'flex';
            renderStep('playlists');

        } catch (error) {
            showToast(error.message);
            emptyState.style.display = 'block';
        } finally {
            setLoading(false);
        }
    };

    /**
     * Render a specific view step
     */
    const renderStep = (step) => {
        if (step === 'playlists') {
            playlistGrid.innerHTML = '';
            playlistStep.classList.add('active');
            certificateStep.classList.remove('active');
            tabPlaylists.classList.add('active');
            tabCertificates.classList.remove('active');
            
            currentResults.playlists.forEach((item, index) => {
                const card = createCard(item, index);
                playlistGrid.appendChild(card);
                setTimeout(() => card.classList.add('show'), index * 100);
            });
        } 
        else if (step === 'certificates') {
            certificateGrid.innerHTML = '';
            certificateStep.classList.add('active');
            playlistStep.classList.remove('active');
            tabCertificates.classList.add('active');
            tabPlaylists.classList.remove('active');

            currentResults.certificates.forEach((item, index) => {
                const card = createCard(item, index);
                certificateGrid.appendChild(card);
                setTimeout(() => card.classList.add('show'), index * 100);
            });
        }
    };

    /**
     * Card Factory
     */
    const createCard = (data, index) => {
        const card = document.createElement('div');
        card.className = 'resource-card';
        
        const title = data.title || 'Untitled';
        const channel = data.channel || 'Author';
        const duration = data.duration_hours ? `${data.duration_hours}h` : 'Full';
        const level = data.level || 'Beginner';
        const desc = data.description || 'Curated high-quality learning resource.';
        const url = data.url || '#';
        const rank = data.rank || (index + 1);

        const isCert = !url.includes('youtube.com');
        const btnLabel = isCert ? 'Join Course' : 'Watch Playlist';

        card.innerHTML = `
            <div class="card-header">
                <span class="rank-badge">#${rank}</span>
                <div class="card-badges">
                    <span class="pill-badge">${escapeHTML(level)}</span>
                    <span class="pill-badge">${escapeHTML(duration)}</span>
                </div>
            </div>
            <h3 class="card-title">${escapeHTML(title)}</h3>
            <span class="channel-name">${escapeHTML(channel)}</span>
            <p class="card-desc">${escapeHTML(desc)}</p>
            <a href="${url}" target="_blank" class="btn-watch" rel="noopener noreferrer">
                ${btnLabel}
            </a>
        `;
        
        return card;
    };

    // UI Helpers
    const resetViews = () => {
        resultsNav.style.display = 'none';
        playlistStep.classList.remove('active');
        certificateStep.classList.remove('active');
        emptyState.style.display = 'none';
        playlistGrid.innerHTML = '';
        certificateGrid.innerHTML = '';
    };

    const setLoading = (isLoading) => {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        ctaButton.disabled = isLoading;
        ctaButton.textContent = isLoading ? 'Curating...' : 'Find Resources';
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

    /**
     * Interview Prep Logic (LeetCode)
     */
    const interviewPrepBtn = document.getElementById('interview-prep-btn');
    const interviewPrepView = document.getElementById('interview-prep-view');
    const companySearchInput = document.getElementById('company-search');
    const companiesGrid = document.getElementById('companies-grid');
    const questionsView = document.getElementById('questions-view');
    const companySelection = document.getElementById('company-selection');
    const backToCompanies = document.getElementById('back-to-companies');
    const questionsGrid = document.getElementById('questions-grid');
    const selectedCompanyTitle = document.getElementById('selected-company-title');

    let allCompanies = [];

    const showInterviewPrep = async () => {
        resetViews();
        interviewPrepView.classList.add('active');
        if (allCompanies.length === 0) {
            await fetchCompanies();
        }
        renderCompanies(allCompanies);
    };

    const fetchCompanies = async () => {
        try {
            const res = await fetch('/get-companies');
            allCompanies = await res.json();
        } catch (err) {
            showToast('Failed to load companies.');
        }
    };

    const renderCompanies = (list) => {
        companiesGrid.innerHTML = '';
        list.forEach(name => {
            const badge = document.createElement('div');
            badge.className = 'company-badge';
            badge.textContent = name;
            badge.onclick = () => loadCompanyQuestions(name);
            companiesGrid.appendChild(badge);
        });
    };

    const loadCompanyQuestions = async (company) => {
        companySelection.style.display = 'none';
        questionsView.style.display = 'block';
        selectedCompanyTitle.textContent = company;
        questionsGrid.innerHTML = '<div class="loading-indicator" style="display:block;"><div class="spinner"></div><p>Fetching questions...</p></div>';

        try {
            const res = await fetch(`/get-questions?company=${encodeURIComponent(company)}`);
            const data = await res.json();
            renderQuestions(data.questions);
        } catch (err) {
            showToast('Failed to load questions.');
        }
    };

    const renderQuestions = (questions) => {
        questionsGrid.innerHTML = '';
        if (!questions || questions.length === 0) {
            questionsGrid.innerHTML = '<p class="empty-state">No questions found for this company.</p>';
            return;
        }

        questions.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'resource-card show';
            
            const name = q.problem_name || 'Unknown Problem';
            const link = q.problem_link || '#';
            const freq = q.num_occur || 0;

            card.innerHTML = `
                <div class="card-header">
                    <span class="rank-badge">#${index + 1}</span>
                    <span class="pill-badge">Freq: ${freq}</span>
                </div>
                <h3 class="card-title">${escapeHTML(name)}</h3>
                <p class="card-desc">Practice this problem directly on LeetCode.</p>
                <a href="${link}" target="_blank" class="btn-watch" rel="noopener noreferrer">
                    Solve on LeetCode
                </a>
            `;
            questionsGrid.appendChild(card);
        });
    };

    interviewPrepBtn.addEventListener('click', showInterviewPrep);

    companySearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allCompanies.filter(c => c.toLowerCase().includes(term));
        renderCompanies(filtered);
    });

    backToCompanies.addEventListener('click', () => {
        questionsView.style.display = 'none';
        companySelection.style.display = 'block';
    });

    // Event Listeners
    ctaButton.addEventListener('click', handleSearch);
    
    skillInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    tabPlaylists.addEventListener('click', () => renderStep('playlists'));
    tabCertificates.addEventListener('click', () => renderStep('certificates'));
});
