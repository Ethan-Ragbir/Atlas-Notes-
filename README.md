# Atlas Notes App - Complete Setup Guide

## 🚀 Quick Start

This guide will help you set up the complete Atlas Notes application with Google Drive and GitHub integration.

## 📋 Prerequisites

- Node.js 16+ installed
- MongoDB running locally or MongoDB Atlas account
- Google Cloud Console account (for Drive API)
- GitHub account (for GitHub API)

## 🛠 Frontend Setup

### 1. Create React App

```bash
npx create-react-app mindmap-notes-frontend
cd mindmap-notes-frontend

# Install additional dependencies
npm install lucide-react d3 axios socket.io-client
```

### 2. Replace App.js with the provided React component

Copy the React component from the first artifact into `src/App.js`.

### 3. Update package.json

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",
    "d3": "^7.8.5",
    "axios": "^1.5.0",
    "socket.io-client": "^4.7.2"
  }
}
```

### 4. Create API service

Create `src/services/api.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const notesAPI = {
  getAllNotes: () => api.get('/api/notes'),
  createNote: (note) => api.post('/api/notes', note),
  updateNote: (id, note) => api.put(`/api/notes/${id}`, note),
  deleteNote: (id) => api.delete(`/api/notes/${id}`),
};

export const connectionsAPI = {
  getAllConnections: () => api.get('/api/connections'),
  createConnection: (connection) => api.post('/api/connections', connection),
  deleteConnection: (id) => api.delete(`/api/connections/${id}`),
};

export const syncAPI = {
  syncToGoogleDrive: () => api.post('/api/sync/drive'),
  syncToGitHub: (data) => api.post('/api/sync/github', data),
};

export default api;
```

## ⚙️ Backend Setup

### 1. Initialize Node.js Project

```bash
mkdir mindmap-notes-backend
cd mindmap-notes-backend
npm init -y
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install express mongoose cors dotenv

# Google Drive integration
npm install googleapis

# GitHub integration
npm install @octokit/rest

# Authentication & Security
npm install jsonwebtoken bcryptjs helmet express-rate-limit

# Utilities
npm install multer compression validator nodemailer socket.io

# Development dependencies
npm install --save-dev nodemon jest supertest eslint
```

### 3. Create Project Structure

```
mindmap-notes-backend/
├── server.js
├── models/
│   ├── User.js
│   ├── Note.js
│   └── Connection.js
├── middleware/
│   ├── auth.js
│   └── validation.js
├── routes/
│   ├── notes.js
│   ├── connections.js
│   ├── auth.js
│   └── sync.js
├── utils/
│   ├── googleDrive.js
│   ├── github.js
│   └── websocket.js
├── scripts/
│   └── setup.js
├── tests/
├── uploads/
└── .env
```

### 4. Copy Backend Files

Copy the provided backend code into the appropriate files.

## 🔑 API Keys & Configuration

### Google Drive API Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project**
   - Click "New Project"
   - Name: "MindMap Notes"
   - Click "Create"

3. **Enable Drive API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. **Create Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "MindMap Notes Web Client"
   - Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
   - Click "Create"

5. **Save Credentials**
   - Copy Client ID and Client Secret
   - Add to `.env` file

### GitHub API Setup

1. **Create GitHub Personal Access Token**
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Click "Generate new token (classic)"
   - Scopes: `repo`, `user:email`
   - Copy the token

2. **For GitHub App (Advanced)**
   - Go to GitHub Settings > Developer settings > GitHub Apps
   - Click "New GitHub App"
   - Fill in details and permissions
   - Generate private key

### Environment Configuration

Create `.env` file in backend directory:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/mindmap-notes

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🗄 Database Setup

### Local MongoDB

```bash
# Install MongoDB
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Ubuntu
sudo apt-get install mongodb

# Start MongoDB
mongod
```

### MongoDB Atlas (Cloud)

1. Create account at https://cloud.mongodb.com/
2. Create cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## 🚀 Running the Application

### 1. Start Backend

```bash
cd mindmap-notes-backend
npm run setup  # Initialize database
npm run dev    # Start development server
```

### 2. Start Frontend

```bash
cd mindmap-notes-frontend
npm start      # Start React development server
```

### 3. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health Check: http://localhost:3001/health

## 🔐 Authentication Flow

### 1. User Registration/Login

```javascript
// Basic JWT authentication
const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
};
```

### 2. Google Drive Connection

```javascript
// Frontend trigger
const connectGoogleDrive = () => {
  window.location.href = `${API_BASE_URL}/auth/google?userId=${currentUser.id}`;
};
```

### 3. GitHub Connection

```javascript
// Frontend GitHub token input
const connectGitHub = async (githubToken) => {
  try {
    await api.post('/auth/github', { githubToken });
    setGithubConnected(true);
  } catch (error) {
    console.error('GitHub connection failed:', error);
  }
};
```

## 📱 Features Overview

### Core Features
- ✅ Interactive mind map with drag & drop
- ✅ Note creation, editing, and deletion
- ✅ Visual connections between notes
- ✅ Search and filtering
- ✅ Tags and categorization
- ✅ List and mind map view modes

### Google Drive Integration
- ✅ Auto-sync notes to Google Drive
- ✅ Real-time backup
- ✅ Markdown format preservation
- ✅ Folder organization

### GitHub Integration
- ✅ Commit notes as markdown files
- ✅ Version control for notes
- ✅ Repository organization
- ✅ Collaborative editing support

### Advanced Features
- ✅ Real-time collaboration (WebSocket)
- ✅ Export/Import functionality
- ✅ User preferences
- ✅ Responsive design
- ✅ Offline support (Progressive Web App)

## 🎨 Customization

### Themes and Colors

```javascript
// Add to your React component
const themes = {
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    primary: '#3b82f6',
    text: '#1f2937'
  },
  dark: {
    background: '#1f2937',
    surface: '#374151',
    primary: '#60a5fa',
    text: '#f9fafb'
  }
};
```

### Custom Node Shapes

```javascript
// Extend the mind map rendering
const nodeShapes = {
  circle: (x, y, r) => `M ${x-r} ${y} A ${r} ${r} 0 0 1 ${x+r} ${y} A ${r} ${r} 0 0 1 ${x-r} ${y}`,
  square: (x, y, size) => `M ${x-size/2} ${y-size/2} L ${x+size/2} ${y-size/2} L ${x+size/2} ${y+size/2} L ${x-size/2} ${y+size/2} Z`,
  diamond: (x, y, size) => `M ${x} ${y-size/2} L ${x+size/2} ${y} L ${x} ${y+size/2} L ${x-size/2} ${y} Z`
};
```

## 🔧 Production Deployment

### Docker Setup

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3001

CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb
    
  mongodb:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create mindmap-notes-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-production-jwt-secret
heroku config:set MONGODB_URI=your-mongodb-atlas-uri
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret

# Deploy
git push heroku main
```

### AWS/Vercel Deployment

```bash
# For Vercel
npm install -g vercel
vercel

# For AWS (using Serverless)
npm install -g serverless
serverless deploy
```

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="Notes API"
```

### Frontend Tests

```bash
# React Testing Library
npm test

# End-to-end with Cypress
npm install --save-dev cypress
npx cypress open
```

## 📊 Monitoring & Analytics

### Error Tracking

```javascript
// Add Sentry for error tracking
npm install @sentry/node @sentry/react

// In backend/server.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });

// In frontend/src/index.js
import * as Sentry from '@sentry/react';
Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN });
```

### Performance Monitoring

```javascript
// Add analytics tracking
const analytics = {
  trackNoteCreation: () => gtag('event', 'note_created'),
  trackSync: (service) => gtag('event', 'sync_performed', { service }),
  trackExport: () => gtag('event', 'data_exported')
};
```

## 🔒 Security Best Practices

1. **Authentication**
   - Use HTTPS in production
   - Implement rate limiting
   - Validate all inputs
   - Use secure JWT secrets

2. **API Security**
   - CORS configuration
   - Helmet.js for security headers
   - Input sanitization
   - SQL injection prevention

3. **Data Protection**
   - Encrypt sensitive data
   - Secure API keys
   - Regular security audits
   - Backup strategies

## 🎯 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] AI-powered note suggestions
- [ ] Advanced collaboration features
- [ ] Plugin system
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Voice notes integration
- [ ] Advanced export formats (PDF, PNG)

## 📚 Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://reactjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide/)

## 🆘 Troubleshooting

### Common Issues

1. **Google Drive API Quota Exceeded**
   - Solution: Implement request batching and caching

2. **MongoDB Connection Issues**
   - Check MongoDB service status
   - Verify connection string
   - Check firewall settings

3. **CORS Errors**
   - Update CORS configuration in backend
   - Check frontend URL configuration

4. **Authentication Failures**
   - Verify JWT secret configuration
   - Check token expiration settings
   - Validate API endpoints

### Getting Help

- Check the GitHub Issues page
- Join our Discord community
- Review the documentation
- Contact support team

## 📄 License

MIT License - see LICENSE file for details.

---

**Happy coding! 🚀** Your MindMap Notes app is now ready for development and deployment.
