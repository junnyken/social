export const translations = {
    vi: {
        'nav.dashboard': 'Dashboard',
        'nav.scheduler': 'Scheduler',
        'nav.editor': 'Editor',
        'nav.accounts': 'Accounts',
        'nav.logs': 'Logs',
        'nav.settings': 'Settings',
        'nav.audit': 'Audit Logs',
        'nav.workflow': 'Workflow',
        'nav.team': 'Team',
        'nav.library': 'Library',
        'nav.ai_assistant': 'AI Assistant',
        'nav.analytics': 'Analytics',
        'nav.listening': 'Listening',
        'nav.reports': 'Reports',
        // Common
        'common.save': 'Lưu',
        'common.cancel': 'Hủy',
        'common.delete': 'Xóa',
        'common.edit': 'Sửa',
        'common.status': 'Trạng thái',
        'common.success': 'Thành công',
        'dashboard.title': 'SocialHub Dashboard',
        'dashboard.posts': 'Bài viết',
        'dashboard.reach': 'Lượt tiếp cận',
        // More keys as needed
    },
    en: {
        'nav.dashboard': 'Dashboard',
        'nav.scheduler': 'Scheduler',
        'nav.editor': 'Editor',
        'nav.accounts': 'Accounts',
        'nav.logs': 'Logs',
        'nav.settings': 'Settings',
        'nav.audit': 'Audit Logs',
        'nav.workflow': 'Workflow',
        'nav.team': 'Team',
        'nav.library': 'Library',
        'nav.ai_assistant': 'AI Assistant',
        'nav.analytics': 'Analytics',
        'nav.listening': 'Listening',
        'nav.reports': 'Reports',
        // Common
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.status': 'Status',
        'common.success': 'Success',
        'dashboard.title': 'SocialHub Dashboard',
        'dashboard.posts': 'Posts',
        'dashboard.reach': 'Reach',
    }
};

let currentLang = localStorage.getItem('sh_lang') || 'vi';

export function t(key) {
    return translations[currentLang][key] || key;
}

export function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('sh_lang', lang);
        // Dispatch event for UI to re-render
        window.dispatchEvent(new Event('language_changed'));
    }
}

export function getLanguage() {
    return currentLang;
}
