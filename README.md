# 🚀 AI Component Generator - Backend

This is the backend server for the **AI Component Generator** project. It is a Node.js and Express application responsible for handling user authentication, session management, and integration with the Gemini AI to generate React component code.

---

## ✨ Features

- **Secure Authentication**: Robust authentication system using Passport.js, supporting both local (email/password) and OAuth 2.0 (Google & GitHub).
- **JWT-Based Sessions**: Stateless and secure session management using JSON Web Tokens.
- **Stateful Session Persistence**: Stores user sessions, chat history, and generated code in MongoDB.
- **AI Integration**: Communicates with the Google Gemini API to generate JSX/TSX and CSS code from user prompts.
- **RESTful API**: Clean set of endpoints for frontend communication.

---

## 🛠️ Tech Stack

- **Framework**: Node.js, Express.js  
- **Database**: MongoDB with Mongoose  
- **Authentication**: Passport.js (passport-jwt, passport-google-oauth20, passport-github2), bcrypt  
- **AI Service**: Google Gemini API via Axios  
- **Deployment**: Render  

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later recommended)  
- A MongoDB Atlas cluster or a local MongoDB instance  
- API keys for Google, GitHub, and Gemini  

---

### 1. Clone the Repository

```bash
git clone https://github.com/raunit2025/component-generator.git
cd component-generator/component-generator-backend
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Configure Environment Variables
Create a .env file in the root of the backend directory and add the following:
```bash
# Server Configuration
PORT=3001

# MongoDB Connection
MONGO_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key

# OAuth Credentials & URLs
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI Service API Key
GEMINI_API_KEY=your_gemini_api_key
```
### 4. Start the Server
For development (with auto-reloading):
```bash
npm run dev
```
For production:
```bash
npm start
```
The server will be running at: http://localhost:3001

### 📁 Project Structure

.
├── config/
│   ├── db.js               # MongoDB connection logic
│   └── passport.js         # Passport.js strategies (JWT, Google, GitHub)
├── middleware/
│   └── authMiddleware.js   # Middleware to protect routes
├── models/
│   ├── Session.js          # Mongoose schema for user sessions
│   └── User.js             # Mongoose schema for users
├── routes/
│   ├── auth.js             # Handles all authentication routes
│   └── sessions.js         # Handles session CRUD and AI generation
├── services/
│   └── aiService.js        # Logic for Gemini API communication
├── .env                    # Environment variables (not committed)
├── .gitignore              # Git ignore file
├── package.json            # Project dependencies
└── server.js               # Main application entry point

### 📝 API Endpoints
### 🔐 Auth Routes (/auth)

| Method | Endpoint           | Description                      |
| ------ | ------------------ | -------------------------------- |
| POST   | `/signup`          | Register a new user              |
| POST   | `/login`           | Log in and receive a JWT         |
| GET    | `/profile`         | Get the logged-in user's profile |
| GET    | `/google`          | Start Google OAuth login         |
| GET    | `/google/callback` | Google OAuth callback            |
| GET    | `/github`          | Start GitHub OAuth login         |
| GET    | `/github/callback` | GitHub OAuth callback            |

### 📦 Session Routes (/sessions)
### ⚠️ All routes require JWT authentication.
| Method | Endpoint        | Description                              |
| ------ | --------------- | ---------------------------------------- |
| GET    | `/`             | Get all sessions of the user             |
| POST   | `/`             | Create a new session                     |
| POST   | `/:id/generate` | Generate code using Gemini for a session |
| PUT    | `/:id/rename`   | Rename an existing session               |
| DELETE | `/:id`          | Delete a session                         |
