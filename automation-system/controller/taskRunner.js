const VMBridge = require('../sandbox/vmBridge');
const { launchBrowser } = require('../automation/browserEngine');
const path = require('path');

class TaskRunner {
    constructor() {
        this.vmBridge = new VMBridge();
        this.jobs = new Map();
    }

    enqueueTask(task) {
        const jobId = 'job_' + Math.random().toString(36).substr(2, 9);
        this.jobs.set(jobId, { status: 'processing', task, result: null });

        if (task.type === 'natural_language') {
            this.runNaturalLanguageCommand(jobId, task.command);
        } else {
            this.runTask(jobId, task);
        }

        return jobId;
    }

    async runTask(jobId, task) {
        try {
            const result = await this.executeSingleTask(jobId, task);
            this.jobs.set(jobId, { status: 'completed', result });
        } catch (error) {
            console.error(`Error running job ${jobId}:`, error);
            this.jobs.set(jobId, { status: 'failed', error: error.message });
        }
    }

    async executeSingleTask(jobId, task) {
        let resultData = {};

        if (task.action === 'visit') {
            const browser = await launchBrowser();
            const page = await browser.newPage();
            await page.goto(task.url);

            if (task.steps && task.steps.includes('screenshot')) {
                const screenshotRelativePath = `storage/logs/screenshot_${jobId}.png`;
                const screenshotPath = path.join(__dirname, '..', screenshotRelativePath);
                await page.screenshot({ path: screenshotPath });
                resultData.screenshot = screenshotRelativePath;
            }

            resultData.title = await page.title();
            await browser.close();
        }

        if (task.type === 'sandbox_command' || task.useSandbox) {
            const sandboxResult = await this.vmBridge.runCommand(task.command || 'uname -a');
            resultData.sandbox = sandboxResult;
        }

        return resultData;
    }

    async runNaturalLanguageCommand(jobId, commandText) {
        try {
            console.log(`Interpreting command: ${commandText}`);
            const tasks = [];

            // Simple Natural Language Logic
            if (commandText.match(/kunjungi|visit|buka/i)) {
                const urlMatch = commandText.match(/https?:\/\/[^\s]+/i) || commandText.match(/[a-z0-9]+\.[a-z]{2,}/i);
                if (urlMatch) {
                    let url = urlMatch[0];
                    if (!url.startsWith('http')) url = 'http://' + url;
                    tasks.push({ action: 'visit', url: url });
                }
            }

            if (commandText.match(/screenshot|tangkap layar/i)) {
                 const visitTask = tasks.find(t => t.action === 'visit');
                 if (visitTask) {
                     visitTask.steps = visitTask.steps || [];
                     visitTask.steps.push('screenshot');
                 } else {
                     // If no visit task, maybe they want a screenshot of jor1k?
                     // For now just skip or add a dummy visit
                 }
            }

            if (commandText.match(/sandbox|jalan|run/i)) {
                const cmdMatch = commandText.match(/(?:sandbox|jalan|run)\s+(.*)/i);
                if (cmdMatch) {
                    tasks.push({ type: 'sandbox_command', command: cmdMatch[1] });
                }
            }

            let combinedResult = {};
            for (const t of tasks) {
                const res = await this.executeSingleTask(jobId, t);
                combinedResult = { ...combinedResult, ...res };
            }

            this.jobs.set(jobId, { status: 'completed', result: combinedResult });
        } catch (error) {
            console.error(`Error running natural language job ${jobId}:`, error);
            this.jobs.set(jobId, { status: 'failed', error: error.message });
        }
    }

    getTaskStatus(jobId) {
        const job = this.jobs.get(jobId);
        return job ? { status: job.status } : null;
    }

    getTaskResult(jobId) {
        const job = this.jobs.get(jobId);
        if (job && job.status === 'completed') {
            return job.result;
        }
        if (job && job.status === 'failed') {
            return { error: job.error };
        }
        return null;
    }
}

module.exports = TaskRunner;
