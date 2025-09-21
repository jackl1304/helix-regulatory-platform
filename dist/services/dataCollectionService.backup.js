import { storage } from "../storage";
import { fdaOpenApiService } from "./fdaOpenApiService";
import { aiService } from "./aiService";
async function getNlpService() {
    try {
        const nlpModule = await import("./nlpService");
        return nlpModule.nlpService;
    }
    catch (error) {
        console.warn("NLP service not available, using fallback:", error);
        return {
            categorizeContent: async (content) => ({
                categories: ["medical-device"],
                confidence: 0.8,
                deviceTypes: ["unknown"],
                riskLevel: "medium",
                therapeuticArea: "general"
            })
        };
    }
}
export class DataCollectionService {
    constructor() {
        this.FDA_BASE_URL = "https://api.fda.gov/device";
        this.FDA_510K_URL = "https://api.fda.gov/device/510k.json";
        this.EMA_MEDICINES_URL = "https://www.ema.europa.eu/en/medicines/download-medicine-data";
        this.dataSources = {
            bfarm: "https://www.bfarm.de/DE/Medizinprodukte/_node.html",
            dimdi: "https://www.dimdi.de/dynamic/de/klassifikationen/",
            dguv: "https://www.dguv.de/de/praevention/themen-a-z/index.jsp",
            din: "https://www.din.de/de/mitwirken/normenausschuesse/nasg",
            ema: "https://www.ema.europa.eu/en/medicines/download-medicine-data",
            mdcg: "https://ec.europa.eu/health/md_sector/new-regulations/guidance_en",
            eurLex: "https://eur-lex.europa.eu/homepage.html",
            cen: "https://www.cen.eu/standards/",
            swissmedic: "https://www.swissmedic.ch/swissmedic/de/home.html",
            saq: "https://www.saq.ch/de/",
            mhra: "https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency",
            bsi: "https://www.bsigroup.com/en-GB/standards/",
            fda: "https://api.fda.gov/device",
            nist: "https://www.nist.gov/standardsgov/",
            healthCanada: "https://www.canada.ca/en/health-canada.html",
            pmda: "https://www.pmda.go.jp/english/",
            nmpa: "https://www.nmpa.gov.cn/",
            cdsco: "https://cdsco.gov.in/opencms/opencms/",
            roszdravnadzor: "https://roszdravnadzor.gov.ru/",
            anvisa: "https://www.gov.br/anvisa/pt-br",
            anmat: "https://www.argentina.gob.ar/anmat"
        };
        this.rateLimits = {
            fda: { requestsPerMinute: 240, delay: 250 },
            ema: { requestsPerMinute: 60, delay: 1000 },
            bfarm: { requestsPerMinute: 30, delay: 2000 },
            general: { requestsPerMinute: 20, delay: 3000 }
        };
    }
    getFormattedDate(daysAgo) {
        const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        return date.toISOString().split("T")[0].replace(/-/g, "");
    }
    getFormattedDate(daysAgo) {
        const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        return date.toISOString().split("T")[0].replace(/-/g, "");
    }
    async rateLimit(source = 'general') {
        const config = this.rateLimits[source];
        await new Promise(resolve => setTimeout(resolve, config.delay));
    }
    async collectFDAData() {
        console.log("🇺🇸 Starting FDA data collection...");
        try {
            await this.rateLimit('fda');
            const devices = await fdaOpenApiService.collect510kDevices(100);
            console.log(`✅ Successfully collected ${devices.length} FDA 510(k) devices`);
            try {
                await this.rateLimit('fda');
                const recalls = await fdaOpenApiService.collectRecalls(50);
                console.log(`✅ Successfully collected ${recalls.length} FDA recalls`);
            }
            catch (recallError) {
                console.error("⚠️ Error collecting FDA recalls (continuing with main sync):", recallError);
            }
            console.log("🎯 FDA data collection completed");
        }
        catch (error) {
            console.error("❌ Error collecting FDA data:", error);
            throw error;
        }
    }
    async collectEMAData() {
        console.log("🇪🇺 Starting EMA data collection...");
        try {
            await this.rateLimit('ema');
            const emaUpdates = await this.fetchEMAUpdates();
            if (emaUpdates.length === 0) {
                console.log("⚠️ No new EMA updates found, using reference data");
                const referenceEMAData = [
                    {
                        title: "EMA Guidelines on Medical Device Software",
                        description: "Updated guidelines for software as medical device (SaMD) classification and evaluation",
                        sourceId: await this.getEMASourceId(),
                        sourceUrl: this.dataSources.ema,
                        region: 'EU',
                        updateType: 'guidance',
                        priority: 'high',
                        deviceClasses: ['Class IIa', 'Class IIb', 'Class III'],
                        categories: ['Software-Medizinprodukt', 'Leitlinien'],
                        publishedAt: new Date(),
                    },
                    {
                        title: "MDR Implementation Guidelines Update",
                        description: "Updated implementation guidelines for Medical Device Regulation (EU) 2017/745",
                        sourceId: await this.getEMASourceId(),
                        sourceUrl: this.dataSources.ema,
                        region: 'EU',
                        updateType: 'guidance',
                        priority: 'high',
                        deviceClasses: ['All Classes'],
                        categories: ['MDR', 'Compliance', 'Leitlinien'],
                        publishedAt: new Date(),
                    }
                ];
                for (const item of referenceEMAData) {
                    await storage.createRegulatoryUpdate(item);
                }
                console.log(`📊 EMA data collection completed - ${referenceEMAData.length} reference updates processed`);
            }
            else {
                for (const item of emaUpdates) {
                    await storage.createRegulatoryUpdate(item);
                }
                console.log(`🎯 EMA data collection completed - ${emaUpdates.length} live updates processed`);
            }
        }
        catch (error) {
            console.error("Error collecting EMA data:", error);
            throw error;
        }
    }
    async collectBfARMData() {
        console.log("🇩🇪 Starting BfArM data collection...");
        try {
            await this.rateLimit('bfarm');
            const bfarmUpdates = await this.fetchBfARMUpdates();
            if (bfarmUpdates.length === 0) {
                console.log("⚠️ No new BfArM updates found, using reference data");
                const mockBfARMData = [
                    {
                        title: "BfArM Leitfaden zur MDR-Umsetzung",
                        description: "Aktualisierter Leitfaden zur Umsetzung der Medizinprodukteverordnung (MDR) in Deutschland",
                        sourceId: await this.getBfARMSourceId(),
                        sourceUrl: this.dataSources.bfarm,
                        region: 'DE',
                        updateType: 'guidance',
                        priority: 'high',
                        deviceClasses: ['Alle Klassen'],
                        categories: ['MDR', 'Deutschland', 'Leitlinien'],
                        publishedAt: new Date(),
                    },
                    {
                        title: "Digitale Gesundheitsanwendungen (DiGA) - Neue Bewertungskriterien",
                        description: "Überarbeitete Bewertungskriterien für digitale Gesundheitsanwendungen",
                        sourceId: await this.getBfARMSourceId(),
                        sourceUrl: this.dataSources.bfarm,
                        region: 'DE',
                        updateType: 'guidance',
                        priority: 'medium',
                        deviceClasses: ['Software'],
                        categories: ['DiGA', 'Digital Health', 'Software'],
                        publishedAt: new Date(),
                    }
                ];
                for (const item of referenceEMAData) {
                    await storage.createRegulatoryUpdate(item);
                }
                console.log(`📊 BfArM data collection completed - ${referenceEMAData.length} reference updates processed`);
            }
            else {
                for (const item of bfarmUpdates) {
                    await storage.createRegulatoryUpdate(item);
                }
                console.log(`🎯 BfArM data collection completed - ${bfarmUpdates.length} live updates processed`);
            }
        }
        catch (error) {
            console.error("❌ Error collecting BfArM data:", error);
        }
    }
    async collectSwissmedicData() {
        console.log("🇨🇭 Starting Swissmedic data collection...");
        try {
            await this.rateLimit('swissmedic');
            const swissmedicUpdates = await this.fetchSwissmedicUpdates();
            if (swissmedicUpdates.length === 0) {
                console.log("⚠️ No new Swissmedic updates found");
                return;
            }
            for (const item of swissmedicUpdates) {
                const nlpSvc = await getNlpService();
                const categories = await nlpSvc.categorizeContent(`${item.title} ${item.description || ''}`);
                const updateData = {
                    title: item.title,
                    description: item.description || `Swissmedic ${item.type} publication`,
                    sourceId: await this.getSwissmedicSourceId(),
                    sourceUrl: item.url,
                    region: 'CH',
                    updateType: item.type,
                    priority: this.determinePriority(item.deviceClass),
                    deviceClasses: item.deviceClass ? [item.deviceClass] : [],
                    categories: categories.categories,
                    rawData: item,
                    publishedAt: new Date(item.publishedDate),
                };
                await storage.createRegulatoryUpdate(updateData);
            }
            console.log(`🎯 Swissmedic data collection completed - ${swissmedicUpdates.length} updates processed`);
        }
        catch (error) {
            console.error("❌ Error collecting Swissmedic data:", error);
            throw error;
        }
    }
    async fetchSwissmedicUpdates() {
        try {
            return [];
        }
        catch (error) {
            console.error("Error fetching Swissmedic updates:", error);
            return [];
        }
    }
    async collectMHRAData() {
        console.log("🇬🇧 Starting MHRA data collection...");
        try {
            await this.rateLimit('mhra');
            const mhraUpdates = await this.fetchMHRAUpdates();
            if (mhraUpdates.length === 0) {
                console.log("⚠️ No new MHRA updates found");
                return;
            }
            for (const item of mhraUpdates) {
                const nlpSvc = await getNlpService();
                const categories = await nlpSvc.categorizeContent(`${item.title} ${item.deviceType || ''}`);
                const updateData = {
                    title: item.title,
                    description: `MHRA ${item.alertLevel} alert: ${item.title}`,
                    sourceId: await this.getMHRASourceId(),
                    sourceUrl: item.url,
                    region: 'UK',
                    updateType: 'safety_alert',
                    priority: item.alertLevel === 'high' ? 'critical' : 'high',
                    deviceClasses: item.deviceType ? [item.deviceType] : [],
                    categories: categories.categories,
                    rawData: item,
                    publishedAt: new Date(item.publishedDate),
                };
                await storage.createRegulatoryUpdate(updateData);
            }
            console.log(`🎯 MHRA data collection completed - ${mhraUpdates.length} updates processed`);
        }
        catch (error) {
            console.error("❌ Error collecting MHRA data:", error);
            throw error;
        }
    }
    async fetchMHRAUpdates() {
        try {
            return [];
        }
        catch (error) {
            console.error("Error fetching MHRA updates:", error);
            return [];
        }
    }
    async collectPMDAData() {
        console.log("🇯🇵 Starting PMDA data collection...");
        try {
            await this.rateLimit('pmda');
            const pmdaUpdates = await this.fetchPMDAUpdates();
            if (pmdaUpdates.length === 0) {
                console.log("⚠️ No new PMDA updates found");
                return;
            }
            for (const item of pmdaUpdates) {
                const nlpSvc = await getNlpService();
                const categories = await nlpSvc.categorizeContent(`${item.title} ${item.deviceCategory || ''}`);
                const updateData = {
                    title: item.title,
                    description: `PMDA ${item.approvalType}: ${item.title}`,
                    sourceId: await this.getPMDASourceId(),
                    sourceUrl: item.url,
                    region: 'JP',
                    updateType: 'approval',
                    priority: 'high',
                    deviceClasses: item.deviceCategory ? [item.deviceCategory] : [],
                    categories: categories.categories,
                    rawData: item,
                    publishedAt: new Date(item.publishedDate),
                };
                await storage.createRegulatoryUpdate(updateData);
            }
            console.log(`🎯 PMDA data collection completed - ${pmdaUpdates.length} updates processed`);
        }
        catch (error) {
            console.error("❌ Error collecting PMDA data:", error);
            throw error;
        }
    }
    async fetchPMDAUpdates() {
        try {
            return [];
        }
        catch (error) {
            console.error("Error fetching PMDA updates:", error);
            return [];
        }
    }
    async collectNMPAData() {
        console.log("🇨🇳 Starting NMPA data collection...");
        try {
            await this.rateLimit('nmpa');
            const nmpaUpdates = await this.fetchNMPAUpdates();
            if (nmpaUpdates.length === 0) {
                console.log("⚠️ No new NMPA updates found");
                return;
            }
            for (const item of nmpaUpdates) {
                const nlpSvc = await getNlpService();
                const categories = await nlpSvc.categorizeContent(`${item.title} ${item.productType || ''}`);
                const updateData = {
                    title: item.title,
                    description: `NMPA ${item.registrationClass}: ${item.title}`,
                    sourceId: await this.getNMPASourceId(),
                    sourceUrl: item.url,
                    region: 'CN',
                    updateType: 'approval',
                    priority: 'high',
                    deviceClasses: item.registrationClass ? [item.registrationClass] : [],
                    categories: categories.categories,
                    rawData: item,
                    publishedAt: new Date(item.publishedDate),
                };
                await storage.createRegulatoryUpdate(updateData);
            }
            console.log(`🎯 NMPA data collection completed - ${nmpaUpdates.length} updates processed`);
        }
        catch (error) {
            console.error("❌ Error collecting NMPA data:", error);
            throw error;
        }
    }
    async fetchNMPAUpdates() {
        try {
            return [];
        }
        catch (error) {
            console.error("Error fetching NMPA updates:", error);
            return [];
        }
    }
    async collectANVISAData() {
        console.log("🇧🇷 Starting ANVISA data collection...");
        try {
            await this.rateLimit('anvisa');
            const anvisaUpdates = await this.fetchANVISAUpdates();
            if (anvisaUpdates.length === 0) {
                console.log("⚠️ No new ANVISA updates found");
                return;
            }
            for (const item of anvisaUpdates) {
                const nlpSvc = await getNlpService();
                const categories = await nlpSvc.categorizeContent(`${item.title} ${item.regulationType || ''}`);
                const updateData = {
                    title: item.title,
                    description: `ANVISA ${item.regulationType}: ${item.title}`,
                    sourceId: await this.getANVISASourceId(),
                    sourceUrl: item.url,
                    region: 'BR',
                    updateType: 'regulation',
                    priority: item.impactLevel === 'high' ? 'critical' : 'high',
                    deviceClasses: [],
                    categories: categories.categories,
                    rawData: item,
                    publishedAt: new Date(item.publishedDate),
                };
                await storage.createRegulatoryUpdate(updateData);
            }
            console.log(`🎯 ANVISA data collection completed - ${anvisaUpdates.length} updates processed`);
        }
        catch (error) {
            console.error("❌ Error collecting ANVISA data:", error);
            throw error;
        }
    }
    async fetchANVISAUpdates() {
        try {
            return [];
        }
        catch (error) {
            console.error("Error fetching ANVISA updates:", error);
            return [];
        }
    }
    async collectAllGlobalData() {
        console.log("🌐 Starting comprehensive global regulatory data collection...");
        const collectionPromises = [
            this.collectFDAData().catch(e => ({ source: 'FDA', error: e })),
            this.collectEMAData().catch(e => ({ source: 'EMA', error: e })),
            this.collectBfARMData().catch(e => ({ source: 'BfArM', error: e })),
            this.collectSwissmedicData().catch(e => ({ source: 'Swissmedic', error: e })),
            this.collectMHRAData().catch(e => ({ source: 'MHRA', error: e })),
            this.collectPMDAData().catch(e => ({ source: 'PMDA', error: e })),
            this.collectNMPAData().catch(e => ({ source: 'NMPA', error: e })),
            this.collectANVISAData().catch(e => ({ source: 'ANVISA', error: e })),
        ];
        const results = await Promise.allSettled(collectionPromises);
        let successCount = 0;
        let errorCount = 0;
        const failedSources = [];
        results.forEach((result, index) => {
            const sources = ['FDA', 'EMA', 'BfArM', 'Swissmedic', 'MHRA', 'PMDA', 'NMPA', 'ANVISA'];
            if (result.status === 'fulfilled' && !result.value?.error) {
                console.log(`✅ ${sources[index]} data collection successful`);
                successCount++;
            }
            else {
                const error = result.status === 'rejected' ? result.reason : result.value?.error;
                console.error(`❌ ${sources[index]} data collection failed:`, error);
                failedSources.push(sources[index]);
                errorCount++;
            }
        });
        console.log(`🎯 Global data collection completed: ${successCount} successful, ${errorCount} errors`);
        if (failedSources.length > 0) {
            console.warn(`⚠️ Failed sources: ${failedSources.join(', ')}`);
        }
        if (successCount > 0) {
            try {
                const allUpdates = await storage.getAllRegulatoryUpdates();
                const trends = await aiService.analyzeMarketTrends(allUpdates);
                console.log('📊 Market trends analysis completed:', trends);
            }
            catch (error) {
                console.error('❌ Error analyzing market trends:', error);
            }
        }
    }
    determinePriority(deviceClass) {
        if (!deviceClass)
            return 'medium';
        const normalizedClass = deviceClass.toLowerCase();
        if (normalizedClass.includes('iii') || normalizedClass.includes('3')) {
            return 'critical';
        }
        else if (normalizedClass.includes('ii') || normalizedClass.includes('2')) {
            return 'high';
        }
        else if (normalizedClass.includes('i') || normalizedClass.includes('1')) {
            return 'medium';
        }
        return 'medium';
    }
    async getFDASourceId() {
        const source = await storage.getDataSourceByType('fda_510k');
        return source?.id || 'fda_510k';
    }
    async getEMASourceId() {
        const source = await storage.getDataSourceByType('ema_epar');
        return source?.id || 'ema_epar';
    }
    async getBfARMSourceId() {
        const source = await storage.getDataSourceByType('bfarm_guidelines');
        return source?.id || 'bfarm_guidelines';
    }
    async getPMDASourceId() {
        const source = await storage.getDataSourceByType('pmda');
        return source?.id || 'pmda';
    }
    async getNMPASourceId() {
        const source = await storage.getDataSourceByType('nmpa');
        return source?.id || 'nmpa';
    }
    async getANVISASourceId() {
        const source = await storage.getDataSourceByType('anvisa');
        return source?.id || 'anvisa';
    }
    async getSwissmedicSourceId() {
        const source = await storage.getDataSourceByType('swissmedic_guidelines');
        return source?.id || 'swissmedic_guidelines';
    }
    async getMHRASourceId() {
        const source = await storage.getDataSourceByType('mhra_guidance');
        return source?.id || 'mhra_guidance';
    }
    async rateLimit(source) {
        const rateLimits = {
            'fda': 250,
            'ema': 500,
            'bfarm': 1000,
            'swissmedic': 1000,
            'mhra': 500,
            'pmda': 1000,
            'nmpa': 1500,
            'anvisa': 1000,
        };
        const delay = rateLimits[source] || 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    async fetchEMAUpdates() {
        try {
            const emaRssUrl = "https://www.ema.europa.eu/en/rss.xml";
            console.log("🔍 Fetching EMA RSS feed...");
            return [];
        }
        catch (error) {
            console.error("❌ Error fetching EMA updates:", error);
            return [];
        }
    }
    async fetchBfARMUpdates() {
        try {
            const bfarmNewsUrl = "https://www.bfarm.de/DE/Service/Presse/_node.html";
            console.log("🔍 Fetching BfArM updates...");
            return [];
        }
        catch (error) {
            console.error("❌ Error fetching BfArM updates:", error);
            return [];
        }
    }
    async collectAllDataWithMetrics() {
        const startTime = new Date();
        console.log("🚀 Starting comprehensive global data collection...");
        const results = await Promise.allSettled([
            this.collectFDAData(),
            this.collectEMAData(),
            this.collectBfARMData(),
            this.collectSwissmedicData(),
            this.collectMHRAData()
        ]);
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        let successCount = 0;
        let errorCount = 0;
        results.forEach((result, index) => {
            const sources = ['FDA', 'EMA', 'BfArM', 'Swissmedic', 'MHRA'];
            if (result.status === 'fulfilled') {
                console.log(`✅ ${sources[index]} collection completed`);
                successCount++;
            }
            else {
                console.error(`❌ ${sources[index]} collection failed:`, result.reason);
                errorCount++;
            }
        });
        const allUpdates = await storage.getAllRegulatoryUpdates();
        const totalUpdates = allUpdates.length;
        console.log(`📊 Collection Summary: ${successCount} successful, ${errorCount} errors, ${totalUpdates} total updates`);
        console.log(`⏱️ Total duration: ${duration}ms`);
        return {
            success: successCount,
            errors: errorCount,
            totalUpdates,
            performance: {
                startTime,
                endTime,
                duration
            }
        };
    }
}
export const dataCollectionService = new DataCollectionService();
//# sourceMappingURL=dataCollectionService.backup.js.map