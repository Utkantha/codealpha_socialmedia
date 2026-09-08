document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;

    // DOM Elements
    const authView = document.getElementById('auth-view');
    const mainView = document.getElementById('main-view');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Auth Toggles
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('register-section').style.display = 'block';
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-section').style.display = 'none';
        document.getElementById('login-section').style.display = 'block';
    });

    // Check auth
    checkAuth();

    async function checkAuth() {
        try {
            const res = await fetch('/api/me');
            if (res.ok) {
                currentUser = await res.json();
                showMain();
            } else {
                showAuth();
            }
        } catch (e) {
            showAuth();
        }
    }

    function showAuth() {
        authView.style.display = 'flex';
        mainView.style.display = 'none';
    }

    function showMain() {
        authView.style.display = 'flex'; // main-layout is flex
        mainView.style.display = 'flex';
        authView.style.display = 'none';
        switchView('feed');
    }

    // Navigation Logic
    const viewSections = {
        'feed': document.getElementById('feed-section'),
        'search': document.getElementById('search-section'),
        'explore': document.getElementById('explore-section'),
        'reels': document.getElementById('reels-section'),
        'notifications': document.getElementById('notifications-section'),
        'profile': document.getElementById('profile-section'),
    };

    function hideAllViews() {
        Object.values(viewSections).forEach(sec => sec.style.display = 'none');
    }

    function switchView(target, data = null) {
        hideAllViews();
        viewSections[target].style.display = 'block';
        
        // Pause all reels videos if we navigate away
        if (target !== 'reels') {
            document.querySelectorAll('.reel-video').forEach(v => v.pause());
        }

        switch (target) {
            case 'feed': loadFeed(); break;
            case 'explore': loadExplore(); break;
            case 'reels': 
                viewSections['reels'].style.display = 'flex'; // Special layout
                loadReels(); 
                break;
            case 'notifications': loadNotifications(); break;
            case 'profile': loadProfile(data || currentUser.id); break;
        }
    }

    // Nav Click Listeners
    document.querySelectorAll('.nav-btn[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            switchView(target);
        });
    });

    document.getElementById('nav-create').addEventListener('click', () => {
        document.getElementById('create-post-modal').style.display = 'flex';
    });
    
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('create-post-modal').style.display = 'none';
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        showAuth();
    });

    // Forms
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (res.ok) {
            loginForm.reset();
            checkAuth();
        } else {
            alert('Login failed.');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (res.ok) {
            registerForm.reset();
            checkAuth();
        } else {
            alert('Registration failed.');
        }
    });

    // Create Post
    document.getElementById('post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('post-content').value;
        const isReel = document.getElementById('post-is-reel').checked;
        const file = document.getElementById('post-media').files[0];
        
        const formData = new FormData();
        formData.append('content', content);
        formData.append('isReel', isReel);
        if (file) formData.append('media', file);

        const res = await fetch('/api/posts', {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            document.getElementById('post-form').reset();
            document.getElementById('create-post-modal').style.display = 'none';
            if (isReel) switchView('reels');
            else switchView('feed');
        } else {
            const err = await res.json();
            alert('Error: ' + err.error);
        }
    });

    // Data Loaders
    async function loadFeed() {
        const res = await fetch('/api/posts');
        const posts = await res.json();
        const container = document.getElementById('posts-container');
        container.innerHTML = '';
        posts.forEach(post => {
            container.appendChild(createPostElement(post));
        });
    }

    async function loadExplore() {
        const res = await fetch('/api/explore');
        const posts = await res.json();
        const container = document.getElementById('explore-grid');
        renderGrid(posts, container);
    }

    async function loadReels() {
        const res = await fetch('/api/reels');
        const reels = await res.json();
        const container = document.getElementById('reels-container');
        container.innerHTML = '';
        
        if(reels.length === 0) {
            container.innerHTML = '<p style="color:white;text-align:center;margin-top:50px;">No reels found.</p>';
            return;
        }

        reels.forEach(reel => {
            const el = document.createElement('div');
            el.className = 'reel-item';
            
            const mediaUrl = reel.image_url || 'https://www.w3schools.com/html/mov_bbb.mp4';
            
            el.innerHTML = `
                <video src="${mediaUrl}" class="reel-video" loop autoplay muted playsinline></video>
                <div class="reel-actions">
                    <button class="reel-like-btn" data-id="${reel.id}">
                        <i class="${reel.is_liked ? 'fas' : 'far'} fa-heart" style="${reel.is_liked ? 'color:#ed4956' : ''}"></i>
                        <span>${reel.like_count}</span>
                    </button>
                    <button>
                        <i class="far fa-comment"></i>
                        <span>0</span>
                    </button>
                    <button>
                        <i class="far fa-paper-plane"></i>
                    </button>
                </div>
                <div class="reel-overlay">
                    <strong style="cursor:pointer" class="reel-user" data-id="${reel.user_id}">@${reel.username}</strong>
                    <p>${reel.content}</p>
                </div>
            `;
            container.appendChild(el);
        });

        // Setup scroll observer for autoplay
        const videos = container.querySelectorAll('.reel-video');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.play();
                } else {
                    entry.target.pause();
                }
            });
        }, { threshold: 0.6 });
        
        videos.forEach(v => observer.observe(v));

        // Unmute on click
        videos.forEach(v => {
            v.addEventListener('click', () => {
                v.muted = !v.muted;
            });
        });

        container.querySelectorAll('.reel-user').forEach(u => {
            u.addEventListener('click', (e) => switchView('profile', e.target.dataset.id));
        });

        container.querySelectorAll('.reel-like-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const postId = e.currentTarget.dataset.id;
                await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
                loadReels(); 
            });
        });
    }

    async function loadNotifications() {
        const res = await fetch('/api/notifications');
        const notes = await res.json();
        const list = document.getElementById('notifications-list');
        list.innerHTML = '';
        
        if(notes.length === 0) {
            list.innerHTML = '<p>No new notifications.</p>';
        }

        notes.forEach(note => {
            const el = document.createElement('div');
            el.className = 'notification-item';
            let actionText = '';
            if (note.type === 'like') actionText = 'liked your post.';
            if (note.type === 'comment') actionText = 'commented on your post.';
            if (note.type === 'follow') actionText = 'started following you.';
            
            el.innerHTML = `
                <div class="avatar"><i class="fas fa-user"></i></div>
                <div>
                    <strong data-id="${note.actor_id}">${note.actor_username}</strong> ${actionText}
                    <div style="font-size:12px;color:gray;">${new Date(note.created_at).toLocaleDateString()}</div>
                </div>
            `;
            list.appendChild(el);
        });

        list.querySelectorAll('strong').forEach(u => {
            u.addEventListener('click', (e) => switchView('profile', e.target.dataset.id));
        });
    }

    // Search
    document.getElementById('search-input').addEventListener('input', async (e) => {
        const q = e.target.value;
        const res = await fetch(`/api/search?q=${q}`);
        const users = await res.json();
        const list = document.getElementById('search-results');
        list.innerHTML = '';
        users.forEach(u => {
            const el = document.createElement('div');
            el.className = 'search-result-item';
            el.innerHTML = `<div class="avatar"><i class="fas fa-user"></i></div> <strong>${u.username}</strong>`;
            el.addEventListener('click', () => {
                document.getElementById('search-input').value = '';
                list.innerHTML = '';
                switchView('profile', u.id);
            });
            list.appendChild(el);
        });
    });

    // Profile
    async function loadProfile(userId) {
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) return;
        const user = await res.json();
        
        document.getElementById('profile-username').textContent = user.username;
        document.getElementById('profile-bio').textContent = user.bio || '';
        document.getElementById('profile-followers-count').textContent = user.followers;
        document.getElementById('profile-following-count').textContent = user.following;
        
        const actionsDiv = document.getElementById('profile-actions');
        actionsDiv.innerHTML = '';
        
        const editBioForm = document.getElementById('edit-bio-form');
        const bioP = document.getElementById('profile-bio');
        
        if (userId == currentUser.id) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-secondary';
            editBtn.textContent = 'Edit Profile';
            editBtn.onclick = () => {
                editBioForm.style.display = 'block';
                bioP.style.display = 'none';
                document.getElementById('bio-input').value = user.bio || '';
            };
            actionsDiv.appendChild(editBtn);
        } else {
            editBioForm.style.display = 'none';
            bioP.style.display = 'block';
            
            const followRes = await fetch(`/api/users/${userId}/followStatus`);
            const followData = await followRes.json();
            
            const followBtn = document.createElement('button');
            followBtn.className = followData.isFollowing ? 'btn-secondary' : 'btn-primary';
            followBtn.textContent = followData.isFollowing ? 'Following' : 'Follow';
            followBtn.addEventListener('click', async () => {
                await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
                loadProfile(userId);
            });
            actionsDiv.appendChild(followBtn);
        }

        const postsRes = await fetch(`/api/users/${userId}/posts`);
        const posts = await postsRes.json();
        document.getElementById('profile-post-count').textContent = posts.length;
        
        renderGrid(posts, document.getElementById('user-posts-container'));
    }

    document.getElementById('edit-bio-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bio = document.getElementById('bio-input').value;
        await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio })
        });
        document.getElementById('edit-bio-form').style.display = 'none';
        loadProfile(currentUser.id);
    });

    // Helpers
    function createPostElement(post) {
        const el = document.createElement('div');
        el.className = 'post';
        
        const mediaUrl = post.image_url || 'https://via.placeholder.com/600x600?text=No+Image';
        const mediaTag = post.media_type === 'video' ? 
            `<video src="${mediaUrl}" class="post-video" controls></video>` :
            `<img src="${mediaUrl}" class="post-image" alt="Post">`;

        el.innerHTML = `
            <div class="post-header" data-id="${post.user_id}">
                <div class="avatar"><i class="fas fa-user"></i></div>
                <span class="post-username">${post.username}</span>
            </div>
            ${mediaTag}
            <div class="post-footer">
                <div class="post-actions">
                    <button class="action-btn like-btn ${post.is_liked ? 'liked' : ''}" data-id="${post.id}">
                        <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="action-btn comment-btn" data-id="${post.id}">
                        <i class="far fa-comment"></i>
                    </button>
                </div>
                <div class="likes-count">${post.like_count} likes</div>
                <div class="post-caption">
                    <strong data-id="${post.user_id}" style="cursor:pointer" class="profile-link">${post.username}</strong> ${post.content}
                </div>
                <div class="comments-link" data-id="${post.id}">View all comments</div>
                <div class="comment-list" id="comments-${post.id}" style="display: none;"></div>
            </div>
            <div class="add-comment-section">
                <input type="text" id="comment-input-${post.id}" placeholder="Add a comment..." required>
                <button class="submit-comment-btn" data-id="${post.id}">Post</button>
            </div>
        `;

        // Events
        el.querySelector('.post-header').addEventListener('click', () => switchView('profile', post.user_id));
        el.querySelector('.profile-link').addEventListener('click', () => switchView('profile', post.user_id));
        
        el.querySelector('.like-btn').addEventListener('click', async (e) => {
            await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
            loadFeed();
        });

        el.querySelector('.comment-btn').addEventListener('click', () => toggleComments(post.id));
        el.querySelector('.comments-link').addEventListener('click', () => toggleComments(post.id));
        
        el.querySelector('.submit-comment-btn').addEventListener('click', async () => {
            const input = document.getElementById(`comment-input-${post.id}`);
            const content = input.value.trim();
            if(!content) return;
            await fetch(`/api/posts/${post.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            input.value = '';
            document.getElementById(`comments-${post.id}`).style.display = 'block';
            loadComments(post.id);
        });

        return el;
    }

    function renderGrid(posts, container) {
        container.innerHTML = '';
        posts.forEach(post => {
            const mediaUrl = post.image_url || 'https://via.placeholder.com/600x600?text=No+Image';
            let el;
            if(post.media_type === 'video') {
                el = document.createElement('video');
                el.src = mediaUrl;
                el.muted = true; 
            } else {
                el = document.createElement('img');
                el.src = mediaUrl;
            }
            el.className = 'grid-post';
            container.appendChild(el);
        });
    }

    async function toggleComments(postId) {
        const list = document.getElementById(`comments-${postId}`);
        if (list.style.display === 'none') {
            list.style.display = 'block';
            loadComments(postId);
        } else {
            list.style.display = 'none';
        }
    }

    async function loadComments(postId) {
        const res = await fetch(`/api/posts/${postId}/comments`);
        const comments = await res.json();
        const list = document.getElementById(`comments-${postId}`);
        list.innerHTML = '';
        comments.forEach(c => {
            const el = document.createElement('div');
            el.className = 'comment';
            el.innerHTML = `<strong>${c.username}</strong> ${c.content}`;
            list.appendChild(el);
        });
    }
});
