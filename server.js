const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
// Accept images and videos
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed!'));
        }
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'super-secret-key-1234',
    resave: false,
    saveUninitialized: false
}));

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

// Register
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        req.session.userId = this.lastID;
        res.json({ message: 'Registered successfully', userId: this.lastID });
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (user) {
            req.session.userId = user.id;
            res.json({ message: 'Logged in successfully', userId: user.id });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// Get Current User
app.get('/api/me', isAuthenticated, (req, res) => {
    db.get(`SELECT id, username, bio FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (user) res.json(user);
        else res.status(404).json({ error: 'User not found' });
    });
});

// Get Profile
app.get('/api/users/:id', isAuthenticated, (req, res) => {
    db.get(`SELECT id, username, bio FROM users WHERE id = ?`, [req.params.id], (err, user) => {
        if (user) {
            db.get(`SELECT COUNT(*) as followers FROM follows WHERE following_id = ?`, [user.id], (err, followers) => {
                db.get(`SELECT COUNT(*) as following FROM follows WHERE follower_id = ?`, [user.id], (err, following) => {
                    user.followers = followers.followers;
                    user.following = following.following;
                    res.json(user);
                });
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
});

// Update Profile
app.put('/api/profile', isAuthenticated, (req, res) => {
    const { bio } = req.body;
    db.run(`UPDATE users SET bio = ? WHERE id = ?`, [bio, req.session.userId], function(err) {
        res.json({ message: 'Profile updated' });
    });
});

// Create Post (Image or Video)
app.post('/api/posts', isAuthenticated, upload.single('media'), (req, res) => {
    const { content } = req.body;
    const isReel = req.body.isReel === 'true'; 
    const mediaUrl = req.file ? '/uploads/' + req.file.filename : null;
    let mediaType = 'image';
    if (req.file && req.file.mimetype.startsWith('video/')) {
        mediaType = 'video';
    } else if (isReel) {
        mediaType = 'video'; 
    }

    db.run(`INSERT INTO posts (user_id, content, image_url, media_type) VALUES (?, ?, ?, ?)`, 
    [req.session.userId, content, mediaUrl, mediaType], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Post created', postId: this.lastID });
    });
});

// Get Feed Posts
app.get('/api/posts', isAuthenticated, (req, res) => {
    const query = `
        SELECT posts.*, users.username,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as is_liked
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.media_type = 'image' OR posts.media_type IS NULL
        ORDER BY posts.created_at DESC
    `;
    db.all(query, [req.session.userId], (err, posts) => {
        res.json(posts || []);
    });
});

// Get User Posts
app.get('/api/users/:id/posts', isAuthenticated, (req, res) => {
    const query = `
        SELECT posts.*, users.username,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as is_liked
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.user_id = ?
        ORDER BY posts.created_at DESC
    `;
    db.all(query, [req.session.userId, req.params.id], (err, posts) => {
        res.json(posts || []);
    });
});

// Get Reels
app.get('/api/reels', isAuthenticated, (req, res) => {
    const query = `
        SELECT posts.*, users.username,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) as is_liked
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.media_type = 'video'
        ORDER BY RANDOM() LIMIT 20
    `;
    db.all(query, [req.session.userId], (err, posts) => {
        res.json(posts || []);
    });
});

// Get Explore
app.get('/api/explore', isAuthenticated, (req, res) => {
    const query = `
        SELECT posts.*, users.username,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count
        FROM posts
        JOIN users ON posts.user_id = users.id
        ORDER BY RANDOM() LIMIT 30
    `;
    db.all(query, (err, posts) => {
        res.json(posts || []);
    });
});

// Search Users
app.get('/api/search', isAuthenticated, (req, res) => {
    const q = req.query.q || '';
    db.all(`SELECT id, username, bio FROM users WHERE username LIKE ? LIMIT 10`, [`%${q}%`], (err, users) => {
        res.json(users || []);
    });
});

// Notifications
app.get('/api/notifications', isAuthenticated, (req, res) => {
    const query = `
        SELECT n.*, u.username as actor_username
        FROM notifications n
        JOIN users u ON n.actor_id = u.id
        WHERE n.user_id = ? AND n.actor_id != ?
        ORDER BY n.created_at DESC LIMIT 50
    `;
    db.all(query, [req.session.userId, req.session.userId], (err, notifications) => {
        res.json(notifications || []);
    });
});

// Helper for notifications
function createNotification(user_id, actor_id, type, post_id = null) {
    if (user_id !== actor_id) {
        db.run(`INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)`, 
        [user_id, actor_id, type, post_id]);
    }
}

// Like/Unlike Post
app.post('/api/posts/:id/like', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    
    db.get(`SELECT * FROM likes WHERE user_id = ? AND post_id = ?`, [userId, postId], (err, like) => {
        if (like) {
            db.run(`DELETE FROM likes WHERE user_id = ? AND post_id = ?`, [userId, postId], () => {
                res.json({ message: 'Unliked', liked: false });
            });
        } else {
            db.run(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [userId, postId], () => {
                // Get post owner to notify
                db.get(`SELECT user_id FROM posts WHERE id = ?`, [postId], (err, post) => {
                    if (post) createNotification(post.user_id, userId, 'like', postId);
                });
                res.json({ message: 'Liked', liked: true });
            });
        }
    });
});

// Add Comment
app.post('/api/posts/:id/comments', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.session.userId;
    db.run(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`, [postId, userId, content], function(err) {
        // Get post owner to notify
        db.get(`SELECT user_id FROM posts WHERE id = ?`, [postId], (err, post) => {
            if (post) createNotification(post.user_id, userId, 'comment', postId);
        });
        res.json({ message: 'Comment added', commentId: this.lastID });
    });
});

// Get Comments for a Post
app.get('/api/posts/:id/comments', isAuthenticated, (req, res) => {
    const query = `
        SELECT comments.*, users.username
        FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.post_id = ?
        ORDER BY comments.created_at ASC
    `;
    db.all(query, [req.params.id], (err, comments) => {
        res.json(comments || []);
    });
});

// Follow/Unfollow
app.post('/api/users/:id/follow', isAuthenticated, (req, res) => {
    const followingId = req.params.id;
    const followerId = req.session.userId;

    if (followingId == followerId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    db.get(`SELECT * FROM follows WHERE follower_id = ? AND following_id = ?`, [followerId, followingId], (err, follow) => {
        if (follow) {
            db.run(`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`, [followerId, followingId], () => {
                res.json({ message: 'Unfollowed', followed: false });
            });
        } else {
            db.run(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`, [followerId, followingId], () => {
                createNotification(followingId, followerId, 'follow');
                res.json({ message: 'Followed', followed: true });
            });
        }
    });
});

// Check Follow Status
app.get('/api/users/:id/followStatus', isAuthenticated, (req, res) => {
    db.get(`SELECT * FROM follows WHERE follower_id = ? AND following_id = ?`, [req.session.userId, req.params.id], (err, follow) => {
        res.json({ isFollowing: !!follow });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
