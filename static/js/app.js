/**
 * SkillRecommender — Premium SaaS Frontend Logic
 * Strictly Vanilla JS (no frameworks)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const skillInput = document.getElementById('skill-input');
    const levelDropdown = document.getElementById('level-dropdown');
    const languageDropdown = document.getElementById('language-dropdown');
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
        const language = languageDropdown.value;

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
                body: JSON.stringify({ skill, level, language })
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
        document.getElementById('dashboard-progress').style.display = 'none';
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
     * Interview Prep Logic
     */
    const interviewPrepBtn = document.getElementById('interview-prep-btn');
    const interviewPrepView = document.getElementById('interview-prep-view');
    const interviewCategories = document.getElementById('interview-categories');
    
    // DSA Sub-View
    const dsaPrepContent = document.getElementById('dsa-prep-content');
    const btnDsaCategory = document.getElementById('btn-dsa-category');
    const backToCategoriesDsa = document.getElementById('back-to-categories-dsa');
    const companySearchInput = document.getElementById('company-search');
    const companiesGrid = document.getElementById('companies-grid');
    const questionsView = document.getElementById('questions-view');
    const companySelection = document.getElementById('company-selection');
    const backToCompanies = document.getElementById('back-to-companies');
    const questionsGrid = document.getElementById('questions-grid');
    const selectedCompanyTitle = document.getElementById('selected-company-title');

    // Resume Sub-View
    const resumeAnalyzerContent = document.getElementById('resume-analyzer-content');
    const btnResumeCategory = document.getElementById('btn-resume-category');
    const backToCategoriesResume = document.getElementById('back-to-categories-resume');
    const resumeUpload = document.getElementById('resume-upload');
    const btnTriggerUpload = document.getElementById('btn-trigger-upload');
    const uploadZone = document.getElementById('upload-zone');
    const analysisStatus = document.getElementById('analysis-status');
    const analysisResults = document.getElementById('analysis-results');
    const statusText = document.getElementById('status-text');

    let allCompanies = [];

    const showInterviewPrep = () => {
        resetViews();
        interviewPrepView.classList.add('active');
        showSelectionScreen();
    };

    const showSelectionScreen = () => {
        interviewCategories.style.display = 'grid';
        dsaPrepContent.style.display = 'none';
        resumeAnalyzerContent.style.display = 'none';
    };

    const enterDsaPrep = async () => {
        interviewCategories.style.display = 'none';
        dsaPrepContent.style.display = 'block';
        companySelection.style.display = 'block';
        questionsView.style.display = 'none';
        
        if (allCompanies.length === 0) {
            await fetchCompanies();
        }
        renderCompanies(allCompanies);
    };

    const enterResumeAnalyzer = () => {
        interviewCategories.style.display = 'none';
        resumeAnalyzerContent.style.display = 'block';
        uploadZone.style.display = 'block';
        analysisStatus.style.display = 'none';
        analysisResults.style.display = 'none';
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

    const DIFFICULTY_CLASS = { Easy: 'diff-easy', Medium: 'diff-medium', Hard: 'diff-hard' };

    const renderQuestions = (questions) => {
        questionsGrid.innerHTML = '';
        if (!questions || questions.length === 0) {
            questionsGrid.innerHTML = '<p class="empty-state">No questions found for this company.</p>';
            return;
        }

        const solvedList = getSolvedQuestions();

        questions.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'resource-card show';
            
            const id         = q.id         || '';
            const name       = q.title       || 'Unknown Problem';
            const link       = q.url         || '#';
            const difficulty = q.difficulty  || '';
            const acceptance = q.acceptance  || '';
            const frequency  = q.frequency   || '';
            const others     = q.other_companies || [];
            const isSolved   = solvedList.some(s => s.link === link);

            const diffClass  = DIFFICULTY_CLASS[difficulty] || '';
            const freqNum    = parseFloat(frequency) || 0;

            card.innerHTML = `
                <div class="card-header">
                    ${id ? `<span class="rank-badge lc-id">#${escapeHTML(id)}</span>` : `<span class="rank-badge">#${index + 1}</span>`}
                    <div class="card-badges">
                        ${difficulty ? `<span class="pill-badge diff-pill ${diffClass}">${escapeHTML(difficulty)}</span>` : ''}
                    </div>
                </div>

                <div class="card-check-wrap">
                    <input type="checkbox" class="solve-checkbox"
                        data-link="${link}"
                        data-name="${escapeHTML(name)}"
                        data-company="${escapeHTML(selectedCompanyTitle.textContent)}"
                        ${isSolved ? 'checked' : ''}>
                    <span class="solve-label">${isSolved ? '✅ Solved' : 'Mark as Solved'}</span>
                </div>

                <h3 class="card-title">${escapeHTML(name)}</h3>

                <div class="lc-meta-row">
                    ${acceptance ? `<span class="lc-meta-item">✅ Acceptance: <strong>${escapeHTML(acceptance)}</strong></span>` : ''}
                    ${frequency  ? `<span class="lc-meta-item">🔥 Frequency: <strong>${escapeHTML(frequency)}</strong></span>` : ''}
                </div>

                ${freqNum > 0 ? `
                <div class="freq-bar-wrap">
                    <div class="freq-bar" style="width:${Math.min(freqNum, 100)}%;"></div>
                </div>` : ''}

                ${others.length > 0 ? `
                <div class="other-companies-wrap">
                    <span style="font-size:0.65rem; color:var(--text-muted); width:100%;">Also asked at:</span>
                    ${others.slice(0, 5).map(c => `<span class="other-comp-tag">${escapeHTML(c)}</span>`).join('')}
                    ${others.length > 5 ? `<span class="other-comp-tag">+${others.length - 5} more</span>` : ''}
                </div>` : ''}

                <a href="${link}" target="_blank" class="btn-watch" rel="noopener noreferrer" style="margin-top:16px;">
                    Solve on LeetCode →
                </a>
            `;

            // Handle checkbox click
            const checkbox = card.querySelector('.solve-checkbox');
            checkbox.addEventListener('change', (e) => {
                toggleSolved(link, name, selectedCompanyTitle.textContent, e.target.checked);
                card.querySelector('.solve-label').textContent = e.target.checked ? '✅ Solved' : 'Mark as Solved';
            });

            questionsGrid.appendChild(card);
        });
    };

    /**
     * Solved Questions State (LocalStorage)
     */
    const getSolvedQuestions = () => {
        try {
            return JSON.parse(localStorage.getItem('solved_dsa_questions')) || [];
        } catch {
            return [];
        }
    };

    const toggleSolved = (link, name, company, isChecked) => {
        let solved = getSolvedQuestions();
        if (isChecked) {
            if (!solved.find(s => s.link === link)) {
                solved.push({ link, name, company, solvedAt: new Date().toISOString() });
            }
        } else {
            solved = solved.filter(s => s.link !== link);
        }
        localStorage.setItem('solved_dsa_questions', JSON.stringify(solved));
    };

    const renderDashboardProgress = () => {
        const dashboardProgress = document.getElementById('dashboard-progress');
        const solvedCountUI = document.getElementById('total-solved-count');
        const companyGridUI = document.getElementById('company-stats-grid');
        
        const solved = getSolvedQuestions();
        
        if (solved.length === 0) {
            dashboardProgress.style.display = 'none';
            return;
        }

        dashboardProgress.style.display = 'grid';
        solvedCountUI.textContent = solved.length;

        // Group by company
        const companyStats = {};
        solved.forEach(q => {
            companyStats[q.company] = (companyStats[q.company] || 0) + 1;
        });

        companyGridUI.innerHTML = Object.entries(companyStats)
            .sort((a, b) => b[1] - a[1])
            .map(([comp, count]) => `
                <div class="comp-stat-badge">
                    <span>${escapeHTML(comp)}</span>
                    <span class="comp-count">${count}</span>
                </div>
            `).join('');
    };

    // Real Resume Analysis logic
    const handleResumeAnalysis = async (file) => {
        const role = document.getElementById('target-role').value.trim() || "Software Engineer";
        const benchmark = document.getElementById('target-benchmark').value;

        // Reset and show loading
        uploadZone.style.display = 'none';
        analysisStatus.style.display = 'block';
        analysisResults.style.display = 'none';
        statusText.textContent = "Uploading and extracting text...";

        const formData = new FormData();
        formData.append('file', file);
        formData.append('role', role);
        formData.append('benchmark', benchmark);

        try {
            // UX progress steps
            const progressSteps = [
                "Simulating ATS scan...",
                "Recruiter is skimming your profile...",
                "Hiring Manager deep-dive evaluation...",
                "Comparing against market competitors...",
                "Finalizing brutal breakdown..."
            ];
            
            let step = 0;
            const progressInt = setInterval(() => {
                if (step < progressSteps.length) {
                    statusText.textContent = progressSteps[step++];
                }
            }, 1800);

            const res = await fetch('/analyze-resume', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInt);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Analysis failed");
            }

            const data = await res.json();
            renderResumeResults(data);

        } catch (err) {
            showToast(err.message);
            uploadZone.style.display = 'block';
        } finally {
            analysisStatus.style.display = 'none';
        }
    };

    const renderResumeResults = (data) => {
        analysisResults.style.display = 'block';
        
        // Final Score & Market Position
        document.getElementById('res-score-value').textContent = `${data.final_score || 0}/10`;
        document.getElementById('res-market').textContent = `Market: ${data.market_positioning || 'N/A'}`;
        
        // Verdict Pill
        const verdictPill = document.getElementById('res-verdict-pill');
        const hireVerdict = data.hire_verdict || 'No Hire';
        verdictPill.textContent = hireVerdict.toUpperCase();
        
        // Dynamic styling for Hire Verdict
        verdictPill.className = 'decision-pill';
        if (hireVerdict.toLowerCase().includes('hire') && !hireVerdict.toLowerCase().includes('no')) {
            verdictPill.classList.add('select');
        } else if (hireVerdict.toLowerCase().includes('borderline')) {
            verdictPill.classList.add('borderline'); // We'll add this CSS if needed
        } else {
            verdictPill.classList.add('reject');
        }

        // Section Summaries
        document.getElementById('res-brutal-summary').textContent = data.brutal_analysis?.summary || '';
        document.getElementById('res-risk-text').textContent = data.rejection_risk?.reason || '';

        // Category Table
        const hmTable = document.getElementById('res-hm-table');
        hmTable.innerHTML = '';
        (data.category_breakdown || []).forEach(cat => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${cat.category}</strong></td>
                <td>${cat.weight}</td>
                <td><span class="pill-badge">${cat.score}/10</span></td>
                <td>${cat.reason}</td>
            `;
            hmTable.appendChild(tr);
        });

        // ATS Stage
        document.getElementById('res-ats-match').textContent = `${data.ats_simulation?.keyword_match_score || 0}%`;
        document.getElementById('res-ats-prob').textContent = data.ats_simulation?.ats_pass_probability || 'Low';
        
        const atsMissing = document.getElementById('res-ats-missing');
        atsMissing.innerHTML = '';
        (data.ats_simulation?.missing_critical_keywords || []).forEach(kw => {
            const li = document.createElement('li');
            li.textContent = kw;
            atsMissing.appendChild(li);
        });

        // Recruiter Stage
        document.getElementById('res-recruiter-impression').textContent = `"${data.recruiter_snap_judgment?.first_impression || ''}"`;
        const recruiterReasons = document.getElementById('res-recruiter-reasons');
        recruiterReasons.innerHTML = '';
        (data.recruiter_snap_judgment?.top_reasons || []).forEach(r => {
            const li = document.createElement('li');
            li.textContent = r;
            recruiterReasons.appendChild(li);
        });

        // What Works
        const worksList = document.getElementById('res-works-list');
        worksList.innerHTML = '';
        (data.what_works || []).forEach(w => {
            const li = document.createElement('li');
            li.textContent = w;
            worksList.appendChild(li);
        });

        // Action Projects
        const actionProjects = document.getElementById('res-action-projects');
        actionProjects.innerHTML = '';
        (data.action_plan?.project_ideas || []).forEach(p => {
            const div = document.createElement('div');
            div.className = 'project-item';
            div.innerHTML = `
                <h6>${escapeHTML(p.title)}</h6>
                <p><strong>Stack:</strong> ${escapeHTML(p.stack)}</p>
                <p>${escapeHTML(p.description)}</p>
            `;
            actionProjects.appendChild(div);
        });

        // Action Tools
        const actionTools = document.getElementById('res-action-tools');
        actionTools.innerHTML = '';
        (data.action_plan?.tools_to_learn || []).forEach(t => {
            const li = document.createElement('li');
            li.textContent = t;
            actionTools.appendChild(li);
        });

        // Rewrite Examples
        const rewritesContainer = document.getElementById('res-action-rewrites');
        rewritesContainer.innerHTML = '';
        (data.action_plan?.bullet_rewrites || []).forEach(ex => {
            const item = document.createElement('div');
            item.className = 'rewrite-item';
            item.innerHTML = `
                <div class="rewrite-new">Improved: "${escapeHTML(ex.improved)}"</div>
                <div class="rewrite-orig">From: "${escapeHTML(ex.original)}"</div>
            `;
            rewritesContainer.appendChild(item);
        });

        showToast('Multi-stage analysis complete!');
    };

    // Event Listeners for Category Selection
    btnDsaCategory.addEventListener('click', enterDsaPrep);
    btnResumeCategory.addEventListener('click', enterResumeAnalyzer);
    backToCategoriesDsa.addEventListener('click', showSelectionScreen);
    backToCategoriesResume.addEventListener('click', showSelectionScreen);

    // Resume Upload Events
    btnTriggerUpload.addEventListener('click', () => resumeUpload.click());
    resumeUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleResumeAnalysis(e.target.files[0]);
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleResumeAnalysis(e.dataTransfer.files[0]);
    });

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

    const dashboardBtn = document.getElementById('dashboard-btn');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => {
            resetViews();
            interviewPrepView.classList.remove('active');
            emptyState.style.display = 'block';
            skillInput.value = '';
            // Close any open interview sub-views too
            showSelectionScreen();
            renderDashboardProgress();
        });
    }

    tabPlaylists.addEventListener('click', () => renderStep('playlists'));
    tabCertificates.addEventListener('click', () => renderStep('certificates'));

    // Initial render
    renderDashboardProgress();
});
