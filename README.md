# Instagram360 📸

Welcome to **Instagram360**! This is a fully functional, full-stack social media application built from scratch without relying on heavy frontend frameworks. It aims to replicate the core experience of popular photo-sharing apps with a focus on simplicity, performance, and clean code.

## 🚀 Key Features

* **Complete Authentication System**: Secure user registration, login, and session management.
* **Dynamic Feed**: An interactive main feed where you can view posts from users across the platform.
* **Media Uploads**: Seamlessly upload images and video reels (powered by `multer` and local storage).
* **Auto-Playing Reels**: A dedicated Reels section built with CSS scroll-snapping and the `Intersection Observer API` for auto-playing videos as you scroll.
* **Like & Comment System**: Engage with posts in real-time.
* **Follow System & Explore Grid**: Discover new users via the Search tab and view random posts on the Explore grid.
* **Activity Notifications**: Relational database triggers ensure you are notified whenever someone likes, comments, or follows you.

## 🛠️ Tech Stack

This project was built intentionally without React/Vue to deeply understand DOM manipulation, Vanilla JS routing, and full-stack integration.

* **Frontend**: HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript
* **Backend**: Node.js, Express.js
* **Database**: SQLite (Relational mapping for Users, Posts, Likes, Comments, Follows, and Notifications)
* **File Handling**: Multer

## 💻 Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Utkantha/codealpha_socialmedia.git
   cd codealpha_socialmedia
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **View the app:**
   Open your browser and navigate to `http://localhost:3000`

## 🧠 Architecture Highlights

* **Single Page Application (SPA)**: Custom client-side routing hides and shows views dynamically without reloading the page.
* **Relational Integrity**: The SQLite database features strict foreign-key constraints to ensure orphaned data (like a comment on a deleted post) doesn't break the app.

---
*Developed during my software engineering internship.*
