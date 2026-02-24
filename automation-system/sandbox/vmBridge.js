const { launchBrowser } = require('../automation/browserEngine');

class VMBridge {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async runCommand(command) {
        console.log(`Executing command via hash-trigger: ${command}`);

        if (!this.browser) {
            this.browser = await launchBrowser();
        }

        const page = await this.browser.newPage();
        // Optional: log page console
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        try {
            const encodedCmd = encodeURIComponent(command);
            // We use the root-relative path because the server serves the root
            await page.goto(`http://localhost:3000/demos/main.html#cmd=${encodedCmd}`);

            // Wait for the result property to be set by the page's automation helper
            await page.waitForFunction(() => window.result !== undefined, { timeout: 120000 });

            const output = await page.evaluate(() => window.result);
            await page.close();

            return { output: output.trim() };
        } catch (error) {
            console.error("VMBridge Error:", error);
            await page.close();
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = VMBridge;
