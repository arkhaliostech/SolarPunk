// API Configuration
const API_URL = 'http://localhost:3000/api';

// Global state
let currentUser = null;
let currentIdea = null;
let allIdeas = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadUser();
    loadIdeas();
    loadStats();
    setupEventListeners();
});

// Load user from localStorage
function loadUser() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        updateUserMenu();
    }
}

// Update user menu
function updateUserMenu() {
    const userMenu = document.getElementById('userMenu');
    
    if (currentUser) {
        userMenu.innerHTML = `
            <span style="color: var(--accent);">Welcome, ${currentUser.username}</span>
            <button class="btn btn-secondary" onclick="logout()">Logout</button>
        `;
    } else {
        userMenu.innerHTML = `
            <button class="btn btn-secondary" onclick="showLoginModal()">Login</button>
            <button class="btn" onclick="showRegisterModal()">Sign Up</button>
        `;
    }
}

// Navigation
function navigateTo(page) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    
    document.getElementById(page).classList.add('active');
    const navLink = document.querySelector(`[data-page="${page}"]`);
    if (navLink) navLink.classList.add('active');
    
    if (page === 'dashboard') {
        loadActivity();
        loadStats();
    }
}

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(link.dataset.page);
    });
});

// Load all ideas
async function loadIdeas(filter = 'all') {
    try {
        const url = filter === 'all' 
            ? `${API_URL}/ideas` 
            : `${API_URL}/ideas?status=${filter}`;
            
        const response = await fetch(url);
        const data = await response.json();
        
        allIdeas = data.ideas;
        renderIdeas(data.ideas);
    } catch (error) {
        console.error('Error loading ideas:', error);
        showError('Failed to load ideas');
    }
}

// Render ideas grid
function renderIdeas(ideas) {
    const grid = document.getElementById('ideasGrid');
    
    if (ideas.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-soft); text-align: center;">No ideas found</p>';
        return;
    }
    
    grid.innerHTML = ideas.map(idea => `
        <div class="idea-card" onclick="showDetail(${idea.id})">
            <div class="idea-header">
                <div>
                    <h3 class="idea-title">${escapeHtml(idea.title)}</h3>
                </div>
                <span class="status-badge status-${idea.status}">${idea.status}</span>
            </div>
            <p class="idea-description">${escapeHtml(idea.description)}</p>
            <div class="tags">
                ${idea.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="progress-bar" style="margin: 1rem 0;">
                <div class="progress-fill" style="width: ${idea.progress}%"></div>
            </div>
            <div class="idea-meta">
                <div class="reactions">
                    <span class="reaction">💚 ${idea.like_count}</span>
                    <span class="reaction">💬 ${idea.comment_count}</span>
                </div>
                <span>by ${escapeHtml(idea.author_name)}</span>
            </div>
        </div>
    `).join('');
}

// Show idea detail
async function showDetail(ideaId) {
    try {
        const response = await fetch(`${API_URL}/ideas/${ideaId}`);
        const data = await response.json();
        
        currentIdea = data.idea;
        await renderIdeaDetail(data.idea);
        await loadComments(ideaId);
        
        navigateTo('idea-detail');
    } catch (error) {
        console.error('Error loading idea:', error);
        showError('Failed to load idea');
    }
}

// Render idea detail
async function renderIdeaDetail(idea) {
    const detail = document.getElementById('detailView');
    
    // Check if user has liked
    let userLiked = false;
    // TODO: Implement user like check
    
    detail.innerHTML = `
        <div class="detail-header">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <h2 class="detail-title">${escapeHtml(idea.title)}</h2>
                <span class="status-badge status-${idea.status}">${idea.status}</span>
            </div>
            <p style="color: var(--text-soft); font-size: 1.1rem; line-height: 1.6;">${escapeHtml(idea.description)}</p>
            <div class="tags" style="margin-top: 1rem;">
                ${idea.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        </div>

        <div>
            <h3 style="color: var(--accent); margin-bottom: 0.5rem;">Progress: ${idea.progress}%</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${idea.progress}%"></div>
            </div>
        </div>

        <div style="margin-top: 2rem;">
            <p><strong>Author:</strong> ${escapeHtml(idea.author_name)}</p>
            <div style="margin-top: 1rem;">
                <button class="btn btn-secondary" onclick="toggleLike(${idea.id})">
                    💚 Like (${idea.like_count})
                </button>
            </div>
        </div>

        <div class="comments-section" id="commentsSection">
            <h3 style="color: var(--accent); margin-bottom: 1rem;">Comments</h3>
            <div id="commentsList"></div>
            
            <div style="margin-top: 2rem;">
                <h4 style="color: var(--accent); margin-bottom: 1rem;">Add a Comment</h4>
                <textarea id="commentText" placeholder="Share your thoughts..." 
                    style="width: 100%; min-height: 100px; padding: 1rem; background: var(--dark-soft); 
                    border: 1px solid rgba(127, 209, 174, 0.2); border-radius: 8px; color: var(--text); 
                    font-family: inherit; resize: vertical;"></textarea>
                <div style="margin-top: 1rem; display: flex; gap: 1rem; align-items: center;">
                    <button class="btn" onclick="submitComment(${idea.id})">Post Comment</button>
                    ${currentUser ? `
                        <label style="color: var(--text-soft); cursor: pointer;">
                            <input type="checkbox" id="anonymousCheck"> Post as Anonymous
                        </label>
                    ` : ''}
                </div>
                ${!currentUser ? '<p style="color: var(--text-soft); margin-top: 0.5rem;">Comments will be posted anonymously</p>' : ''}
            </div>
        </div>
    `;
}

// Load comments
async function loadComments(ideaId) {
    try {
        const response = await fetch(`${API_URL}/ideas/${ideaId}/comments`);
        const data = await response.json();
        
        renderComments(data.comments);
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

// Render comments
function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="color: var(--text-soft);">No comments yet. Be the first to share your thoughts!</p>';
        return;
    }
    
    commentsList.innerHTML = comments.map(c => `
        <div class="comment">
            <div class="comment-header">
                <strong>${escapeHtml(c.display_name)}</strong>
                <span>${formatDate(c.created_at)}</span>
            </div>
            <div class="comment-text">${escapeHtml(c.content)}</div>
        </div>
    `).join('');
}

// Submit comment
async function submitComment(ideaId) {
    const content = document.getElementById('commentText').value.trim();
    const anonymousCheck = document.getElementById('anonymousCheck');
    const isAnonymous = anonymousCheck ? anonymousCheck.checked : false;
    
    if (!content) {
        showError('Please enter a comment');
        return;
    }
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        if (currentUser) {
            headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
        }
        
        const response = await fetch(`${API_URL}/ideas/${ideaId}/comments`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ content, isAnonymous })
        });
        
        if (!response.ok) throw new Error('Failed to post comment');
        
        document.getElementById('commentText').value = '';
        if (anonymousCheck) anonymousCheck.checked = false;
        
        await loadComments(ideaId);
        await loadStats();
        showSuccess('Comment posted!');
        
    } catch (error) {
        console.error('Error posting comment:', error);
        showError('Failed to post comment');
    }
}

// Toggle like
async function toggleLike(ideaId) {
    try {
        const headers = {};
        
        if (currentUser) {
            headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
        }
        
        const response = await fetch(`${API_URL}/ideas/${ideaId}/like`, {
            method: 'POST',
            headers
        });
        
        if (!response.ok) throw new Error('Failed to toggle like');
        
        const data = await response.json();
        
        // Refresh the detail view
        await showDetail(ideaId);
        await loadStats();
        
        showSuccess(data.liked ? 'Liked!' : 'Like removed');
        
    } catch (error) {
        console.error('Error toggling like:', error);
        showError('Failed to update like');
    }
}

// Load statistics
async function loadStats() {
    try {
        const [ideasRes, activityRes] = await Promise.all([
            fetch(`${API_URL}/ideas`),
            fetch(`${API_URL}/activity?limit=5`)
        ]);
        
        const ideasData = await ideasRes.json();
        const activityData = await activityRes.json();
        
        const ideas = ideasData.ideas;
        const totalIdeas = ideas.length;
        const inDevelopment = ideas.filter(i => i.status === 'development' || i.status === 'prototype').length;
        const deployed = ideas.filter(i => i.status === 'deployed').length;
        const totalComments = ideas.reduce((sum, i) => sum + i.comment_count, 0);
        
        const statsHtml = `
            <div class="stat-card">
                <div class="stat-value">${totalIdeas}</div>
                <div class="stat-label">Total Ideas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${inDevelopment}</div>
                <div class="stat-label">In Development</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${deployed}</div>
                <div class="stat-label">Deployed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalComments}</div>
                <div class="stat-label">Total Comments</div>
            </div>
        `;
        
        document.getElementById('homeStats').innerHTML = statsHtml;
        document.getElementById('dashboardStats').innerHTML = statsHtml;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent activity
async function loadActivity() {
    try {
        const response = await fetch(`${API_URL}/activity?limit=10`);
        const data = await response.json();
        
        const activityFeed = document.getElementById('activityFeed');
        
        if (data.activities.length === 0) {
            activityFeed.innerHTML = '<p style="color: var(--text-soft);">No recent activity</p>';
            return;
        }
        
        activityFeed.innerHTML = data.activities.map(activity => {
            let message = '';
            
            switch(activity.activity_type) {
                case 'comment_added':
                    message = `<strong>${escapeHtml(activity.username || 'Anonymous')}</strong> commented on <em>${escapeHtml(activity.idea_title)}</em>`;
                    break;
                case 'like_added':
                    message = `<strong>${escapeHtml(activity.username || 'Someone')}</strong> liked <em>${escapeHtml(activity.idea_title)}</em>`;
                    break;
                case 'idea_created':
                    message = `<strong>${escapeHtml(activity.username)}</strong> created new idea <em>${escapeHtml(activity.idea_title)}</em>`;
                    break;
                case 'user_registered':
                    message = `<strong>${escapeHtml(activity.username)}</strong> joined the platform`;
                    break;
                default:
                    message = activity.activity_type;
            }
            
            return `
                <div class="comment">
                    <div class="comment-header">
                        <span>${message}</span>
                        <span>${formatDate(activity.created_at)}</span>
                    </div>
                    ${activity.comment_content ? `<div class="comment-text">${escapeHtml(activity.comment_content)}</div>` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// Authentication handlers
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        currentUser = data.user;
        updateUserMenu();
        closeLoginModal();
        
        showSuccess(`Welcome back, ${data.user.username}!`);
        
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        currentUser = data.user;
        updateUserMenu();
        closeRegisterModal();
        
        showSuccess(`Welcome, ${data.user.username}!`);
        loadStats();
        
    } catch (error) {
        console.error('Register error:', error);
        showError(error.message);
    }
}

function loginAsAnonymous() {
    closeLoginModal();
    showSuccess('Browsing as Anonymous. You can comment and like!');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    updateUserMenu();
    showSuccess('Logged out successfully');
}

// Filter buttons
function setupEventListeners() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadIdeas(btn.dataset.filter);
        });
    });
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        
        if (event.target === loginModal) {
            closeLoginModal();
        }
        if (event.target === registerModal) {
            closeRegisterModal();
        }
    };
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert(message);
}