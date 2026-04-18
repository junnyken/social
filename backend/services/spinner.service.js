/**
 * Spintax Service
 * Parses {A|B|C} formats to generate unique text variations
 */
class SpinnerService {
    spin(content) {
        if (!content) return '';
        // Handles flat {A|B|C}
        return content.replace(/\{([^}]+)\}/g, (match, group) => {
            // Only split if there is a pipe, otherwise it's a template var
            if (group.includes('|')) {
                const options = group.split('|');
                return options[Math.floor(Math.random() * options.length)];
            }
            return match;
        });
    }

    renderTemplate(content, context = {}) {
        let result = this.spin(content);
        Object.keys(context).forEach(key => {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), context[key]);
        });
        return result;
    }
}

module.exports = new SpinnerService();
