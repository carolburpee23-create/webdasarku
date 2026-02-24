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

        // Run task in background
        this.runTask(jobId, task);

        return jobId;
    }

    async runTask(jobId, task) {
        try {
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

            this.jobs.set(jobId, { status: 'completed', result: resultData });
        } catch (error) {
            console.error(`Error running job ${jobId}:`, error);
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
