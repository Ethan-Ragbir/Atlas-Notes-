// server.js - Main Express server
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { Octokit } = require('@octokit/rest');
const multer = require('multer');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindmap-notes', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB Schemas
const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  color: { type: String, default: '#6B7280' },
  tags: [String],
  userId: { type: String, required: true },
  driveFileId: String,
  githubPath: String,
  lastModified: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const connectionSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  googleTokens: {
    access_token: String,
    refresh_token: String,
    expires_at: Date
  },
  githubToken: String,
  preferences: {
    autoSync: { type: Boolean, default: true },
    autoCommit: { type: Boolean, default: false },
    defaultColor: { type: String, default: '#6B7280' }
  },
  createdAt: { type: Date, default: Date.now }
});

const Note = mongoose.model('Note', noteSchema);
const Connection = mongoose.model('Connection', connectionSchema);
const User = mongoose.model('User', userSchema);

// Google Drive configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// GitHub configuration
const createGitHubClient = (token) => {
  return new Octokit({
    auth: token,
  });
};

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    // In a real app, you'd verify the JWT token here
    // For this example, we'll assume the token contains the user ID
    req.userId = token; // This would be extracted from JWT
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Notes API Routes
app.get('/api/notes', authenticateUser, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes', authenticateUser, async (req, res) => {
  try {
    const note = new Note({
      ...req.body,
      userId: req.userId
    });
    await note.save();
    
    // Auto-sync to Google Drive if enabled
    const user = await User.findOne({ _id: req.userId });
    if (user && user.preferences.autoSync && user.googleTokens) {
      await syncNoteToGoogleDrive(note, user);
    }
    
    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/notes/:id', authenticateUser, async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, lastModified: new Date() },
      { new: true }
    );
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Auto-sync to Google Drive if enabled
    const user = await User.findOne({ _id: req.userId });
    if (user && user.preferences.autoSync && user.googleTokens) {
      await syncNoteToGoogleDrive(note, user);
    }
    
    res.json(note);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/notes/:id', authenticateUser, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Delete from Google Drive if exists
    const user = await User.findOne({ _id: req.userId });
    if (user && note.driveFileId && user.googleTokens) {
      await deleteFromGoogleDrive(note.driveFileId, user);
    }
    
    // Delete associated connections
    await Connection.deleteMany({
      $or: [{ from: req.params.id }, { to: req.params.id }],
      userId: req.userId
    });
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Connections API Routes
app.get('/api/connections', authenticateUser, async (req, res) => {
  try {
    const connections = await Connection.find({ userId: req.userId });
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/connections', authenticateUser, async (req, res) => {
  try {
    const connection = new Connection({
      ...req.body,
      userId: req.userId
    });
    await connection.save();
    res.status(201).json(connection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/connections/:id', authenticateUser, async (req, res) => {
  try {
    const connection = await Connection.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Google Drive Integration
app.get('/auth/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: req.query.userId // Pass user ID for later association
  });
  
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    const { tokens } = await oauth2Client.getAccessToken(code);
    
    // Save tokens to user
    await User.findByIdAndUpdate(userId, {
      googleTokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expiry_date)
      }
    });
    
    res.redirect('/dashboard?google_connected=true');
  } catch (error) {
    res.redirect('/dashboard?error=google_auth_failed');
  }
});

// GitHub Integration
app.post('/auth/github', authenticateUser, async (req, res) => {
  try {
    const { githubToken } = req.body;
    
    // Verify GitHub token
    const octokit = createGitHubClient(githubToken);
    const { data: user } = await octokit.rest.users.getAuthenticated();
    
    // Save GitHub token
    await User.findByIdAndUpdate(req.userId, {
      githubToken: githubToken
    });
    
    res.json({ message: 'GitHub connected successfully', githubUser: user.login });
  } catch (error) {
    res.status(400).json({ error: 'Invalid GitHub token' });
  }
});

// Sync operations
app.post('/api/sync/drive', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.googleTokens) {
      return res.status(400).json({ error: 'Google Drive not connected' });
    }
    
    const notes = await Note.find({ userId: req.userId });
    const syncResults = [];
    
    for (const note of notes) {
      try {
        const result = await syncNoteToGoogleDrive(note, user);
        syncResults.push({ noteId: note._id, status: 'success', driveFileId: result.id });
      } catch (error) {
        syncResults.push({ noteId: note._id, status: 'error', error: error.message });
      }
    }
    
    res.json({ syncResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sync/github', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.githubToken) {
      return res.status(400).json({ error: 'GitHub not connected' });
    }
    
    const { repo, owner } = req.body;
    const notes = await Note.find({ userId: req.userId });
    
    const octokit = createGitHubClient(user.githubToken);
    const commitResults = [];
    
    for (const note of notes) {
      try {
        const fileName = `notes/${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        const content = `# ${note.title}\n\n${note.content}\n\n**Tags:** ${note.tags.join(', ')}\n**Created:** ${note.createdAt}\n**Modified:** ${note.lastModified}`;
        
        const result = await commitToGitHub(octokit, owner, repo, fileName, content, `Update note: ${note.title}`);
        
        // Update note with GitHub path
        await Note.findByIdAndUpdate(note._id, {
          githubPath: fileName
        });
        
        commitResults.push({ noteId: note._id, status: 'success', path: fileName });
      } catch (error) {
        commitResults.push({ noteId: note._id, status: 'error', error: error.message });
      }
    }
    
    res.json({ commitResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function syncNoteToGoogleDrive(note, user) {
  oauth2Client.setCredentials(user.googleTokens);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const fileMetadata = {
    name: `${note.title}.md`,
    parents: ['your-mindmap-folder-id'] // Create a specific folder
  };
  
  const content = `# ${note.title}\n\n${note.content}\n\n**Tags:** ${note.tags.join(', ')}\n**Position:** (${note.x}, ${note.y})\n**Color:** ${note.color}`;
  
  const media = {
    mimeType: 'text/markdown',
    body: content
  };
  
  if (note.driveFileId) {
    // Update existing file
    const result = await drive.files.update({
      fileId: note.driveFileId,
      media: media
    });
    return result.data;
  } else {
    // Create new file
    const result = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });
    
    // Update note with Drive file ID
    await Note.findByIdAndUpdate(note._id, {
      driveFileId: result.data.id
    });
    
    return result.data;
  }
}

async function deleteFromGoogleDrive(fileId, user) {
  oauth2Client.setCredentials(user.googleTokens);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  await drive.files.delete({
    fileId: fileId
  });
}

async function commitToGitHub(octokit, owner, repo, path, content, message) {
  const contentEncoded = Buffer.from(content).toString('base64');
  
  try {
    // Try to get the existing file to get its SHA
    const { data: existingFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path
    });
    
    // Update existing file
    return await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: contentEncoded,
      sha: existingFile.sha
    });
  } catch (error) {
    if (error.status === 404) {
      // File doesn't exist, create new
      return await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: contentEncoded
      });
    }
    throw error;
  }
}

// Export/Import functionality
app.post('/api/export', authenticateUser, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId });
    const connections = await Connection.find({ userId: req.userId });
    
    const exportData = {
      notes: notes.map(note => ({
        id: note._id,
        title: note.title,
        content: note.content,
        x: note.x,
        y: note.y,
        color: note.color,
        tags: note.tags,
        lastModified: note.lastModified,
        createdAt: note.createdAt
      })),
      connections: connections.map(conn => ({
        id: conn._id,
        from: conn.from,
        to: conn.to,
        createdAt: conn.createdAt
      })),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/import', authenticateUser, async (req, res) => {
  try {
    const { notes, connections } = req.body;
    
    // Clear existing data (optional, based on import mode)
    if (req.body.clearExisting) {
      await Note.deleteMany({ userId: req.userId });
      await Connection.deleteMany({ userId: req.userId });
    }
    
    // Import notes
    const importedNotes = await Note.insertMany(
      notes.map(note => ({
        ...note,
        userId: req.userId,
        _id: undefined // Let MongoDB generate new IDs
      }))
    );
    
    // Create ID mapping for connections
    const idMapping = {};
    notes.forEach((originalNote, index) => {
      idMapping[originalNote.id] = importedNotes[index]._id;
    });
    
    // Import connections with updated IDs
    const importedConnections = await Connection.insertMany(
      connections.map(conn => ({
        from: idMapping[conn.from] || conn.from,
        to: idMapping[conn.to] || conn.to,
        userId: req.userId
      }))
    );
    
    res.json({
      importedNotes: importedNotes.length,
      importedConnections: importedConnections.length
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// User preferences
app.get('/api/user/preferences', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user?.preferences || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/user/preferences', authenticateUser, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { preferences: req.body },
      { new: true }
    );
    res.json(user.preferences);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`MindMap Notes API server running on port ${PORT}`);
});

module.exports = app;
