# 🚀 AI Component Generator - Backend

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-black.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![API Status](https://img.shields.io/badge/API-online-brightgreen.svg)](#)

This is the backend server for **UI Forge AI**, a Node.js and Express application. It handles user authentication, session management, and the core logic of communicating with the Google Gemini API to generate React components from natural language prompts.

## Features

- ✅ **Secure & Flexible Authentication**: Robust system using Passport.js, supporting local (email/password), Google, and GitHub OAuth 2.0.
- ✅ **JWT-Based Sessions**: Stateless and secure session management using JSON Web Tokens for protected API routes.
- ✅ **Stateful Session Persistence**: Stores user sessions, chat history, and generated code in MongoDB, allowing users to resume their work anytime.
- ✅ **Advanced AI Integration**: Intelligently communicates with the Google Gemini API to generate and refine JSX/CSS based on user prompts.
- ✅ **RESTful API**: A clean and well-defined set of endpoints for seamless frontend communication.

## Tech Stack

- **Framework**: Node.js & Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js (`passport-jwt`, `passport-google-oauth20`, `passport-github2`), bcrypt
- **API Communication**: Axios
- **Code Formatting**: Prettier

---

## Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Raunit2025/component-generator-backend.git](https://github.com/Raunit2025/component-generator-backend.git)
    cd component-generator-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    Create a new environment file in the root of the backend directory.
    ```bash
    touch .env
    ```

4.  **Configure your `.env` file:**
    Add the necessary environment variables for database connection, authentication, and API keys.
    ```env
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

5.  **Start the local development server:**
    ```bash
    npm run dev
    ```

The API server should now be running at `http://localhost:3001`.

---

## Project Structure

| Path                      | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `/config/`                | Holds configuration files for the database and Passport.js. |
| `/middleware/`            | Contains custom Express middleware like `authMiddleware`. |
| `/models/`                | Mongoose schemas for `User` and `Session`.            |
| `/routes/`                | API route definitions for `auth` and `sessions`.      |
| `/services/`              | Business logic, including the `aiService` for Gemini. |
| `/.env`                   | Environment variables (ignored by Git).               |
| `/server.js`              | The main entry point for the Express application.     |
| `/package.json`           | Project dependencies and scripts.                     |

## API Endpoints

All endpoints are prefixed with the base URL of the server (e.g., `http://localhost:3001`).

#### Auth Routes (`/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/signup` | Register a new user. |
| `POST` | `/login` | Log in and receive a JWT. |
| `GET` | `/google` | Initiate Google OAuth login. |
| `GET` | `/github` | Initiate GitHub OAuth login. |

#### Session Routes (`/sessions`) — *Protected*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Get all sessions for the logged-in user. |
| `POST` | `/` | Create a new, empty session. |
| `POST` | `/:id/generate` | Generate or edit code for a session. |
| `PUT` | `/:id/rename` | Rename a session. |
| `DELETE` | `/:id` | Delete a session. |

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Author

**Raunit Raj** — [LinkedIn](https://www.linkedin.com/in/raunitraj/)
<br />
*Computer Science & Engineering Student*
