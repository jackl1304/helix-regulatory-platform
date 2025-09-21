import { storage } from '../storage';
export class RegionalExpansionService {
    constructor() {
        this.regionalAuthorities = [
            {
                id: 'mfds-korea',
                name: 'Ministry of Food and Drug Safety',
                country: 'South Korea',
                region: 'Asia',
                apiUrl: 'https://www.mfds.go.kr/api',
                rssFeeds: ['https://www.mfds.go.kr/rss/news.xml'],
                active: true,
                dataTypes: ['Device Approvals', 'Safety Alerts', 'Regulations'],
                priority: 'high'
            },
            {
                id: 'thailand-fda',
                name: 'Food and Drug Administration Thailand',
                country: 'Thailand',
                region: 'Asia',
                rssFeeds: ['https://www.fda.moph.go.th/rss/news.xml'],
                active: true,
                dataTypes: ['Medical Device Registration', 'Recalls', 'Guidelines'],
                priority: 'medium'
            },
            {
                id: 'pmda-japan',
                name: 'Pharmaceuticals and Medical Devices Agency',
                country: 'Japan',
                region: 'Asia',
                apiUrl: 'https://www.pmda.go.jp/api',
                rssFeeds: ['https://www.pmda.go.jp/rss/news.xml'],
                active: true,
                dataTypes: ['Shonin Approvals', 'Safety Information', 'Guidelines'],
                priority: 'high'
            },
            {
                id: 'aifa-italy',
                name: 'Italian Medicines Agency',
                country: 'Italy',
                region: 'Europe',
                rssFeeds: ['https://www.aifa.gov.it/rss/news.xml'],
                active: true,
                dataTypes: ['CE Mark Updates', 'Safety Communications', 'Guidelines'],
                priority: 'medium'
            },
            {
                id: 'aemps-spain',
                name: 'Spanish Agency of Medicines and Medical Devices',
                country: 'Spain',
                region: 'Europe',
                rssFeeds: ['https://www.aemps.gob.es/rss/news.xml'],
                active: true,
                dataTypes: ['Device Registrations', 'Safety Alerts', 'Regulatory Updates'],
                priority: 'medium'
            },
            {
                id: 'saudi-fda',
                name: 'Saudi Food and Drug Authority',
                country: 'Saudi Arabia',
                region: 'Middle East',
                apiUrl: 'https://www.sfda.gov.sa/api',
                rssFeeds: ['https://www.sfda.gov.sa/rss/news.xml'],
                active: true,
                dataTypes: ['MDMA Registrations', 'Market Surveillance', 'Guidelines'],
                priority: 'high'
            },
            {
                id: 'uae-moh',
                name: 'UAE Ministry of Health',
                country: 'United Arab Emirates',
                region: 'Middle East',
                rssFeeds: ['https://www.mohap.gov.ae/rss/news.xml'],
                active: true,
                dataTypes: ['Device Approvals', 'Health Alerts', 'Regulations'],
                priority: 'medium'
            },
            {
                id: 'sahpra',
                name: 'South African Health Products Regulatory Authority',
                country: 'South Africa',
                region: 'Africa',
                apiUrl: 'https://www.sahpra.org.za/api',
                rssFeeds: ['https://www.sahpra.org.za/rss/news.xml'],
                active: true,
                dataTypes: ['Medical Device Registrations', 'Safety Alerts', 'Guidelines'],
                priority: 'high'
            }
        ];
    }
    async makeRequest(url) {
        try {
            console.log(`[Regional] Requesting: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Helix-Regional-Monitor/1.0',
                    'Accept': 'application/json, application/xml, text/xml'
                }
            });
            if (!response.ok) {
                throw new Error(`Regional API error: ${response.status} ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await response.json();
            }
            else {
                return await response.text();
            }
        }
        catch (error) {
            console.error(`[Regional] Request failed for ${url}:`, error);
            return [];
        }
    }
    getMockRegionalData(url) {
        console.log(`[Regional] MOCK DATA DELETED - No artificial data for ${url}`);
        return [];
    }
    async collectRegionalUpdates(authorityId) {
        try {
            const authority = this.regionalAuthorities.find(auth => auth.id === authorityId);
            if (!authority) {
                throw new Error(`Unknown authority: ${authorityId}`);
            }
            console.log(`[Regional] Collecting updates from ${authority.name}`);
            let updates = [];
            if (authority.apiUrl) {
                try {
                    const apiData = await this.makeRequest(`${authority.apiUrl}/updates`);
                    updates = Array.isArray(apiData) ? apiData : [apiData];
                }
                catch (error) {
                    console.log(`[Regional] API failed for ${authority.name} - NO MOCK DATA FALLBACK`);
                    updates = [];
                }
            }
            else {
                console.log(`[Regional] No API available for ${authority.name} - skipping (no mock data)`);
                updates = [];
            }
            console.log(`[Regional] Found ${updates.length} updates from ${authority.name}`);
            for (const update of updates) {
                await this.processRegionalUpdate(update, authority);
            }
            console.log(`[Regional] Completed processing updates from ${authority.name}`);
        }
        catch (error) {
            console.error(`[Regional] Error collecting updates from ${authorityId}:`, error);
            throw error;
        }
    }
    async processRegionalUpdate(update, authority) {
        try {
            const regulatoryUpdate = {
                id: `regional-${authority.id}-${Math.random().toString(36).substr(2, 9)}`,
                title: `${authority.name}: ${update.title}`,
                content: this.formatRegionalContent(update, authority),
                source: `${authority.name} (Regional)`,
                type: update.type,
                region: authority.country,
                authority: authority.name,
                priority: this.determineRegionalPriority(update, authority),
                published_at: update.publishedAt,
                status: 'published',
                metadata: {
                    authorityId: authority.id,
                    country: authority.country,
                    regionalArea: authority.region,
                    originalLanguage: update.language,
                    translatedContent: update.translatedContent,
                    originalUrl: update.originalUrl,
                    dataTypes: authority.dataTypes
                }
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[Regional] Successfully created update: ${update.title}`);
        }
        catch (error) {
            console.error('[Regional] Error processing regional update:', error);
        }
    }
    formatRegionalContent(update, authority) {
        const parts = [];
        parts.push(`**Authority:** ${authority.name}`);
        parts.push(`**Country:** ${authority.country}`);
        parts.push(`**Region:** ${authority.region}`);
        parts.push(`**Type:** ${update.type}`);
        if (update.language !== 'en') {
            parts.push(`**Original Language:** ${update.language}`);
        }
        if (update.translatedContent) {
            parts.push(`**Summary:** ${update.translatedContent}`);
        }
        parts.push(`**Content:** ${update.content}`);
        if (update.originalUrl) {
            parts.push(`**Source URL:** ${update.originalUrl}`);
        }
        return parts.join('\n\n');
    }
    determineRegionalPriority(update, authority) {
        let basePriority = authority.priority;
        const highPriorityTypes = ['safety alert', 'recall', 'urgent', 'emergency'];
        const mediumPriorityTypes = ['approval', 'registration', 'clearance'];
        const updateType = update.type.toLowerCase();
        const updateContent = (update.title + ' ' + update.content).toLowerCase();
        if (highPriorityTypes.some(type => updateType.includes(type) || updateContent.includes(type))) {
            return basePriority === 'high' ? 'critical' : 'high';
        }
        if (mediumPriorityTypes.some(type => updateType.includes(type) || updateContent.includes(type))) {
            return basePriority === 'low' ? 'medium' : basePriority;
        }
        return basePriority;
    }
    async monitorRSSFeeds(authorityId) {
        try {
            const authority = this.regionalAuthorities.find(auth => auth.id === authorityId);
            if (!authority || authority.rssFeeds.length === 0) {
                console.log(`[Regional] No RSS feeds for ${authorityId}`);
                return;
            }
            console.log(`[Regional] Monitoring RSS feeds for ${authority.name}`);
            for (const feedUrl of authority.rssFeeds) {
                try {
                    const feedContent = await this.makeRequest(feedUrl);
                    const items = this.parseRSSFeed(feedContent, authority);
                    for (const item of items) {
                        await this.processRegionalUpdate(item, authority);
                    }
                }
                catch (error) {
                    console.error(`[Regional] Error processing RSS feed ${feedUrl}:`, error);
                }
            }
            console.log(`[Regional] Completed RSS monitoring for ${authority.name}`);
        }
        catch (error) {
            console.error(`[Regional] Error monitoring RSS feeds for ${authorityId}:`, error);
        }
    }
    parseRSSFeed(feedContent, authority) {
        try {
            const items = [];
            if (typeof feedContent === 'string' && feedContent.includes('xml')) {
                const mockItems = this.getMockRegionalData(authority.id);
                return mockItems.slice(0, 3);
            }
            return items;
        }
        catch (error) {
            console.error('[Regional] Error parsing RSS feed:', error);
            return [];
        }
    }
    async syncAllRegionalAuthorities() {
        try {
            console.log('[Regional] Starting sync for all regional authorities');
            const activeAuthorities = this.regionalAuthorities.filter(auth => auth.active);
            for (const authority of activeAuthorities) {
                try {
                    console.log(`[Regional] Syncing ${authority.name}...`);
                    await this.collectRegionalUpdates(authority.id);
                    await this.monitorRSSFeeds(authority.id);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (error) {
                    console.error(`[Regional] Error syncing ${authority.name}:`, error);
                }
            }
            console.log('[Regional] Completed sync for all regional authorities');
        }
        catch (error) {
            console.error('[Regional] Error in regional sync:', error);
            throw error;
        }
    }
    getRegionalAuthorities() {
        return [...this.regionalAuthorities];
    }
    getAuthorityStatus() {
        return this.regionalAuthorities.map(auth => ({
            id: auth.id,
            name: auth.name,
            country: auth.country,
            region: auth.region,
            active: auth.active,
            priority: auth.priority,
            dataTypes: auth.dataTypes,
            hasAPI: !!auth.apiUrl,
            rssFeeds: auth.rssFeeds.length
        }));
    }
}
//# sourceMappingURL=regionalExpansionService.js.map