const { launchBrowser } = require('../automation/browserEngine');

class VMBridge {
    constructor() {
        this.browser = null;
        this.page = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        this.browser = await launchBrowser();
        this.page = await this.browser.newPage();

        console.log("Navigating to jor1k...");
        await this.page.goto('http://localhost:3000/demos/main.html');

        await this.page.waitForFunction(() => typeof jor1k !== 'undefined' && jor1k.terms && jor1k.terms.length > 0);

        console.log("jor1k loaded. Waiting for Linux boot...");

        await this.page.evaluate(() => {
            window.terminalOutput = "";
            if (window.jor1k && window.jor1k.terms && window.jor1k.terms[0]) {
                window.jor1k.terms[0].SetCharReceiveListener((char) => {
                    window.terminalOutput += char;
                });
            }
        });

        try {
            await this.page.waitForFunction(() => {
                const output = window.terminalOutput;
                return output.includes('/ #') || output.includes('root@localhost') || output.includes('~ $');
            }, { timeout: 60000 });
            console.log("Linux boot completed.");
        } catch (e) {
            console.warn("Timeout waiting for prompt.");
        }

        this.initialized = true;
    }

    async runCommand(command) {
        await this.init();

        console.log(`Executing command in sandbox: ${command}`);

        await this.page.evaluate(() => {
            window.terminalOutput = "";
        });

        const chars = (command + '\n').split('').map(c => c.charCodeAt(0));
        await this.page.evaluate((c) => {
            jor1k.SendChars(c);
        }, chars);

        // Wait for the echoed command to appear first
        try {
            await this.page.waitForFunction((cmd) => {
                return window.terminalOutput.includes(cmd);
            }, { timeout: 5000 }, command);
        } catch(e) {}

        // Then wait for the prompt again
        try {
            await this.page.waitForFunction((cmd) => {
                const output = window.terminalOutput;
                // We look for a prompt that appears AFTER the command
                const cmdIndex = output.indexOf(cmd);
                if (cmdIndex === -1) return false;
                const afterCmd = output.substring(cmdIndex + cmd.length);
                return afterCmd.includes('/ #') || afterCmd.includes('root@localhost') || afterCmd.includes('~ $');
            }, { timeout: 15000 }, command);
        } catch (e) {
            console.warn("Command execution timeout or prompt not found.");
        }

        const output = await this.page.evaluate(() => window.terminalOutput);
        return { output: output.trim() };
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.initialized = false;
        }
    }
}

module.exports = VMBridge;
