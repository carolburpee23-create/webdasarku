const express = require('express');
const path = require('path');
const TaskRunner = require('./controller/taskRunner');

const app = express();
const port = 3000;

app.use(express.json());

// Serve jor1k files from the parent directory of automation-system (the root)
app.use(express.static(path.join(__dirname, '..')));

const taskRunner = new TaskRunner();

// Health check for Docker
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 1. POST /automation/run - Eksekusi task automation
app.post('/automation/run', async (req, res) => {
    try {
        const jobId = taskRunner.enqueueTask(req.body);
        res.json({ jobId, status: 'processing' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 2. GET /automation/status/:id - Cek status task
app.get('/automation/status/:id', (req, res) => {
    const status = taskRunner.getTaskStatus(req.params.id);
    if (!status) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(status);
});

// 3. GET /automation/result/:id - Ambil hasil
app.get('/automation/result/:id', (req, res) => {
    const result = taskRunner.getTaskResult(req.params.id);
    if (!result) {
        return res.status(404).json({ error: 'Job not found or not finished' });
    }
    res.json(result);
});

app.listen(port, () => {
    console.log(`Automation System API listening at http://localhost:${port}`);
});
