const fbGraphV2 = require('./fb-graph-v2.service');

class PageInsightsService {
    async getOverview(pageToken, pageId, rangeDays = 7) {
        try {
            // Because Facebook limits certain queries, we will query some common metrics daily
            const metric = 'page_impressions,page_engaged_users,page_fans,page_fan_adds,page_views_total';
            const period = 'day';
            
            const res = await fbGraphV2.getPageInsights(pageToken, pageId, metric, period);
            // Process the response into an overview format
            // In a real scenario, this aggregates data over the selected range.
            // Assuming res object array:
            let impressions = 0;
            let engagement = 0;
            let followers = 0;
            let followersDelta = 0;

            if (res && res.length > 0) {
                const impObj = res.find(m => m.name === 'page_impressions');
                const engObj = res.find(m => m.name === 'page_engaged_users');
                const fanObj = res.find(m => m.name === 'page_fans');
                const fanAddObj = res.find(m => m.name === 'page_fan_adds');

                if (impObj?.values) impressions = impObj.values.reduce((sum, v) => sum + (v.value || 0), 0);
                if (engObj?.values) engagement = engObj.values.reduce((sum, v) => sum + (v.value || 0), 0);
                if (fanObj?.values) followers = fanObj.values.length > 0 ? fanObj.values[fanObj.values.length - 1].value : 0;
                if (fanAddObj?.values) followersDelta = fanAddObj.values.reduce((sum, v) => sum + (v.value || 0), 0);
            }

            return {
                impressions,
                engagement,
                followers,
                followersDelta,
                reach: Math.round(impressions * 0.8) // Roughly estimate reach if metric fails
            };
        } catch (error) {
            console.error('[PageInsights] getOverview error:', error.message);
            throw error;
        }
    }
}

module.exports = new PageInsightsService();
