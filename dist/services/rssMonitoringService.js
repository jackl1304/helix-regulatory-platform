import { storage } from '../storage';
export class RSSMonitoringService {
    constructor() {
        this.feeds = [
            {
                id: 'fda-main',
                name: 'FDA News & Updates',
                url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds-fda',
                authority: 'FDA',
                region: 'United States',
                active: true,
                lastCheck: new Date(0),
                checkFrequency: 60
            },
            {
                id: 'fda-medical-devices',
                name: 'FDA Medical Device Safety',
                url: 'https://www.fda.gov/medical-devices/rss.xml',
                authority: 'FDA',
                region: 'United States',
                active: true,
                lastCheck: new Date(0),
                checkFrequency: 60
            },
            {
                id: 'ema-main',
                name: 'EMA News & Updates',
                url: 'https://www.ema.europa.eu/en/rss.xml',
                authority: 'EMA',
                region: 'European Union',
                active: true,
                lastCheck: new Date(0),
                checkFrequency: 120
            },
            {
                id: 'bfarm-main',
                name: 'BfArM Updates',
                url: 'https://www.bfarm.de/DE/Service/RSS/_node.html',
                authority: 'BfArM',
                region: 'Germany',
                active: true,
                lastCheck: new Date(0),
                checkFrequency: 180
            },
            {
                id: 'swissmedic-main',
                name: 'Swissmedic Updates',
                url: 'https://www.swissmedic.ch/swissmedic/de/home.rss.html',
                authority: 'Swissmedic',
                region: 'Switzerland',
                active: true,
                lastCheck: new Date(0),
                checkFrequency: 180
            },
            {
                id: 'mhra-main',
                name: 'MHRA Updates',
                url: 'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency.atom',
                authority: 'MHRA',
                region: 'United Kingdom',
                active: true,
                lastCheck: new Date(0),
                checkFrequency: 120
            }
        ];
        this.rateLimitDelay = 2000;
        this.isMonitoring = false;
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async parseFeedFromContent(content) {
        try {
            const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/);
            const descriptionMatch = content.match(/<description[^>]*>([\s\S]*?)<\/description>/);
            const lastBuildDateMatch = content.match(/<lastBuildDate[^>]*>([\s\S]*?)<\/lastBuildDate>/);
            const itemMatches = content.match(/<item[^>]*>[\s\S]*?<\/item>/g) ||
                content.match(/<entry[^>]*>[\s\S]*?<\/entry>/g) || [];
            const items = [];
            for (const itemContent of itemMatches) {
                const item = this.parseRSSItem(itemContent);
                if (item)
                    items.push(item);
            }
            return {
                feedUrl: '',
                title: this.cleanText(titleMatch?.[1] || 'Unknown Feed'),
                description: this.cleanText(descriptionMatch?.[1] || ''),
                items,
                lastBuildDate: lastBuildDateMatch?.[1]
            };
        }
        catch (error) {
            console.error('[RSS] Error parsing feed content:', error);
            return null;
        }
    }
    parseRSSItem(itemContent) {
        try {
            const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/);
            const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/) ||
                itemContent.match(/<link[^>]*href=["'](.*?)["'][^>]*>/);
            const descriptionMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/) ||
                itemContent.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) ||
                itemContent.match(/<content[^>]*>([\s\S]*?)<\/content>/);
            const pubDateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) ||
                itemContent.match(/<published[^>]*>([\s\S]*?)<\/published>/) ||
                itemContent.match(/<updated[^>]*>([\s\S]*?)<\/updated>/);
            const guidMatch = itemContent.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) ||
                itemContent.match(/<id[^>]*>([\s\S]*?)<\/id>/);
            const authorMatch = itemContent.match(/<author[^>]*>([\s\S]*?)<\/author>/) ||
                itemContent.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/);
            const categoryMatches = itemContent.match(/<category[^>]*>(.*?)<\/category>/g) || [];
            const categories = categoryMatches.map(cat => {
                const match = cat.match(/<category[^>]*>(.*?)<\/category>/);
                return match ? this.cleanText(match[1]) : '';
            }).filter(Boolean);
            if (!titleMatch)
                return null;
            return {
                title: this.cleanText(titleMatch[1]),
                link: this.cleanText(linkMatch?.[1] || ''),
                description: this.cleanText(descriptionMatch?.[1] || ''),
                pubDate: pubDateMatch?.[1] || new Date().toISOString(),
                guid: guidMatch?.[1] || `rss-${Date.now()}-${crypto.randomUUID().substr(0, 9)}`,
                categories,
                author: authorMatch ? this.cleanText(authorMatch[1]) : undefined
            };
        }
        catch (error) {
            console.error('[RSS] Error parsing RSS item:', error);
            return null;
        }
    }
    cleanText(text) {
        return text
            .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();
    }
    async fetchFeed(feedUrl) {
        try {
            console.log(`[RSS] Fetching feed: ${feedUrl}`);
            const response = await fetch(feedUrl, {
                headers: {
                    'User-Agent': 'Helix-RSS-Monitor/1.0',
                    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const content = await response.text();
            await this.delay(this.rateLimitDelay);
            const parsed = await this.parseFeedFromContent(content);
            if (parsed) {
                parsed.feedUrl = feedUrl;
            }
            return parsed;
        }
        catch (error) {
            console.error(`[RSS] Error fetching feed ${feedUrl}:`, error);
            return null;
        }
    }
    async processFeedUpdate(feed, feedData) {
        try {
            console.log(`[RSS] Processing ${feedData.items.length} items from ${feed.name}`);
            for (const item of feedData.items) {
                await this.processRSSItem(feed, item);
            }
            feed.lastCheck = new Date();
            console.log(`[RSS] Completed processing feed: ${feed.name}`);
        }
        catch (error) {
            console.error(`[RSS] Error processing feed update for ${feed.name}:`, error);
        }
    }
    async processRSSItem(feed, item) {
        try {
            const existingId = `rss-${feed.id}-${this.generateItemId(item)}`;
            const regulatoryUpdate = {
                id: existingId,
                title: `${feed.authority}: ${item.title}`,
                content: this.formatRSSContent(item, feed),
                source: `${feed.name} (RSS)`,
                type: 'RSS Update',
                region: feed.region,
                authority: feed.authority,
                priority: this.determineRSSPriority(item, feed),
                published_at: this.parseRSSDate(item.pubDate),
                status: 'published',
                metadata: {
                    feedId: feed.id,
                    feedName: feed.name,
                    originalLink: item.link,
                    guid: item.guid,
                    categories: item.categories || [],
                    author: item.author,
                    rssFeedUrl: feed.url
                }
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[RSS] Successfully created update from RSS: ${item.title}`);
        }
        catch (error) {
            if (!error.message?.includes('duplicate')) {
                console.error('[RSS] Error processing RSS item:', error);
            }
        }
    }
    generateItemId(item) {
        const baseString = item.guid || item.link || item.title;
        return baseString.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substr(0, 20);
    }
    formatRSSContent(item, feed) {
        const parts = [];
        parts.push(`**Source:** ${feed.name}`);
        if (item.author)
            parts.push(`**Author:** ${item.author}`);
        if (item.categories && item.categories.length > 0) {
            parts.push(`**Categories:** ${item.categories.join(', ')}`);
        }
        if (item.link)
            parts.push(`**Original Link:** ${item.link}`);
        if (item.description) {
            parts.push(`**Description:**\n${item.description}`);
        }
        return parts.join('\n\n');
    }
    determineRSSPriority(item, feed) {
        const title = item.title.toLowerCase();
        const description = item.description.toLowerCase();
        const content = `${title} ${description}`;
        if (content.includes('recall') || content.includes('safety alert') ||
            content.includes('urgent') || content.includes('immediate action')) {
            return 'critical';
        }
        if (content.includes('warning') || content.includes('guidance') ||
            content.includes('approval') || content.includes('clearance')) {
            return 'high';
        }
        if (content.includes('announcement') || content.includes('update') ||
            content.includes('new') || content.includes('change')) {
            return 'medium';
        }
        return 'low';
    }
    parseRSSDate(dateString) {
        try {
            let parsed = new Date(dateString);
            if (isNaN(parsed.getTime())) {
                const formats = [
                    /\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2}/,
                    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
                ];
                for (const format of formats) {
                    if (format.test(dateString)) {
                        parsed = new Date(dateString);
                        if (!isNaN(parsed.getTime()))
                            break;
                    }
                }
            }
            return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        catch (error) {
            console.warn(`[RSS] Could not parse date: ${dateString}`);
            return new Date();
        }
    }
    async checkFeed(feed) {
        try {
            const now = new Date();
            const timeSinceLastCheck = now.getTime() - feed.lastCheck.getTime();
            const checkInterval = feed.checkFrequency * 60 * 1000;
            if (timeSinceLastCheck < checkInterval) {
                console.log(`[RSS] Skipping ${feed.name} - checked ${Math.round(timeSinceLastCheck / 60000)} minutes ago`);
                return;
            }
            console.log(`[RSS] Checking feed: ${feed.name}`);
            const feedData = await this.fetchFeed(feed.url);
            if (feedData) {
                await this.processFeedUpdate(feed, feedData);
            }
            else {
                console.warn(`[RSS] Failed to fetch feed: ${feed.name}`);
            }
        }
        catch (error) {
            console.error(`[RSS] Error checking feed ${feed.name}:`, error);
        }
    }
    async monitorAllFeeds() {
        if (this.isMonitoring) {
            console.log('[RSS] Monitoring already in progress');
            return;
        }
        try {
            this.isMonitoring = true;
            console.log('[RSS] Starting RSS monitoring cycle');
            const activeFeeds = this.feeds.filter(feed => feed.active);
            console.log(`[RSS] Monitoring ${activeFeeds.length} active feeds`);
            for (const feed of activeFeeds) {
                await this.checkFeed(feed);
                await this.delay(1000);
            }
            console.log('[RSS] RSS monitoring cycle completed');
        }
        catch (error) {
            console.error('[RSS] Error in RSS monitoring:', error);
        }
        finally {
            this.isMonitoring = false;
        }
    }
    async startContinuousMonitoring() {
        console.log('[RSS] Starting continuous RSS monitoring');
        await this.monitorAllFeeds();
        setInterval(async () => {
            await this.monitorAllFeeds();
        }, 30 * 60 * 1000);
    }
    getFeeds() {
        return [...this.feeds];
    }
    getFeedStatus() {
        return this.feeds.map(feed => ({
            id: feed.id,
            name: feed.name,
            authority: feed.authority,
            region: feed.region,
            active: feed.active,
            lastCheck: feed.lastCheck,
            checkFrequency: feed.checkFrequency,
            status: this.isMonitoring ? 'monitoring' : 'idle'
        }));
    }
}
//# sourceMappingURL=rssMonitoringService.js.map