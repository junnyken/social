/**
 * Delay logic to mimic human behaviors
 */
window.DelayHelper = {
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    async randomSleep(min = 1000, max = 3000) {
        const duration = Math.floor(Math.random() * (max - min + 1) + min);
        await this.sleep(duration);
    },

    async humanType(element, text) {
        for (let i = 0; i < text.length; i++) {
            // Document simulation
            document.execCommand("insertText", false, text[i]);
            
            // Random Jitter between keystrokes (30ms -> 150ms)
            const jitter = Math.floor(Math.random() * 120) + 30;
            // Introduce a short pause randomly
            if (Math.random() > 0.9) await this.sleep(400); 
            
            await this.sleep(jitter);
        }
    }
};
