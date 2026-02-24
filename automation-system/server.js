const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const TaskRunner = require('./controller/taskRunner');

const app = express();
const port = 3000;

app.use(express.json());

// 1. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/automation/', limiter);

// 2. Simple API Key Auth
const API_KEY = process.env.API_KEY || 'default_secret_key';
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader === `Bearer ${API_KEY}`) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }
};

// Serve jor1k files
app.use(express.static(path.join(__dirname, '..')));

const taskRunner = new TaskRunner();

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 3. API Endpoints
// POST /automation/run - Structured task
app.post('/automation/run', authMiddleware, async (req, res) => {
    try {
        const jobId = taskRunner.enqueueTask(req.body);
        res.json({ jobId, status: 'processing' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// POST /automation/command - Natural Language command
app.post('/automation/command', authMiddleware, async (req, res) => {
    try {
        if (!req.body.command) return res.status(400).json({ error: 'Missing command' });
        const jobId = taskRunner.enqueueTask({
            type: 'natural_language',
            command: req.body.command
        });
        res.json({ jobId, status: 'processing' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// GET /automation/status/:id - Check status
app.get('/automation/status/:id', (req, res) => {
    const status = taskRunner.getTaskStatus(req.params.id);
    if (!status) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(status);
});

// GET /automation/result/:id - Get result
app.get('/automation/result/:id', (req, res) => {
    const result = taskRunner.getTaskResult(req.params.id);
    if (!result) {
        const status = taskRunner.getTaskStatus(req.params.id);
        if (status) return res.json(status);
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result);
});

app.listen(port, () => {
    console.log(`Automation System API listening at http://localhost:${port}`);
    console.log(`API Key set to: ${API_KEY}`);
});
