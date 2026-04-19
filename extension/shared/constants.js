/**
 * DOM Selectors for Facebook UI.
 * Note: FB obfuscates classes aggressively, so we rely on aria-labels and generic structure where possible.
 */
window.FB_CONSTANTS = {
    // Basic navigation
    SELECTORS: {
        CREATE_POST_BUTTON: 'div[aria-label="Create a public post"]',
        POST_TEXTAREA: 'div[aria-label="Create a public post"] div[role="textbox"]',
        SUBMIT_BUTTON: 'div[aria-label="Post"][role="button"]',
        ADD_PHOTO_BUTTON: 'div[aria-label="Photo/video"][role="button"]',
        FILE_INPUT: 'input[type="file"][accept^="image"]',
        MODAL_CLOSE: 'div[aria-label="Close"][role="button"]'
    },
    // Configuration
    API_BASE_URL: 'https://social-9cpy.onrender.com/api/v1'
};
