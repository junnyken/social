/**
 * FB DOM manipulation script to strictly post content
 */
window.GroupPoster = {
    async execute(job) {
        console.log('[GroupPoster] Starting task...', job);
        const CONST = window.FB_CONSTANTS.SELECTORS;
        
        // 1. Wait for page to mature
        await window.DelayHelper.randomSleep(3000, 5000);
        
        // 2. Find internal Create Post trigger
        const createPostTrigger = document.querySelector(CONST.CREATE_POST_BUTTON);
        if (!createPostTrigger) {
            throw new Error('Create Post button not found on this page. Is it a group?');
        }

        console.log('[GroupPoster] Clicking compose box');
        createPostTrigger.click();
        
        // 3. Wait for modal animation
        await window.DelayHelper.randomSleep(2000, 3000);
        
        const textBox = document.querySelector(CONST.POST_TEXTAREA);
        if (!textBox) {
            throw new Error('Post Textbox not found after clicking trigger.');
        }

        console.log('[GroupPoster] Focusing textbox and typing');
        textBox.focus();
        
        // 4. Mimic human typing the specific spinned text
        await window.DelayHelper.humanType(textBox, job.content);

        await window.DelayHelper.randomSleep(2000, 4000);

        // 4.5 IMAGE UPLOAD FAKE VIA DATATRANSFER
        if (job.images && job.images.length > 0) {
            console.log('[GroupPoster] Attaching specific images...');
            const photoBtn = document.querySelector(CONST.ADD_PHOTO_BUTTON);
            if (photoBtn) {
                photoBtn.click();
                await window.DelayHelper.randomSleep(1500, 2500);

                const fileInput = document.querySelector(CONST.FILE_INPUT);
                if (fileInput) {
                    const dt = new DataTransfer();
                    for (let i = 0; i< job.images.length; i++) {
                        try {
                            // Convert Base64 dataURL to Blob -> File
                            const res = await fetch(job.images[i]);
                            const blob = await res.blob();
                            const file = new File([blob], `fakeimage_${i}.png`, { type: blob.type, lastModified: Date.now() });
                            dt.items.add(file);
                        } catch (e) {
                            console.error('[GroupPoster] Image conversion failed', e);
                        }
                    }
                    if (dt.files.length) {
                        fileInput.files = dt.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                        await window.DelayHelper.randomSleep(3000, 6000); // Wait for preview rendering
                    }
                }
            }
        }
        
        // 5. Look for the Submit Button
        const submitBtn = document.querySelector(CONST.SUBMIT_BUTTON);
        if (!submitBtn || submitBtn.getAttribute('aria-disabled') === 'true') {
            throw new Error('Submit button disabled or hidden.');
        }

        console.log('[GroupPoster] Submitting content');
        submitBtn.click();
        
        // 6. Complete and wait for post networking to finish (roughly 5-10s)
        await window.DelayHelper.randomSleep(6000, 10000);
        
        console.log('[GroupPoster] Job completed structurally.');
        return { success: true };
    }
};
