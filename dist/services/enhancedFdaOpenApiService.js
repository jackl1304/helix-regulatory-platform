import { storage } from '../storage';
import { nlpService } from './nlpService';
export class EnhancedFDAOpenAPIService {
    constructor() {
        this.baseUrl = 'https://api.fda.gov';
        this.rateLimitDelay = 1000;
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async makeRequest(endpoint) {
        try {
            console.log(`[Enhanced FDA API] Requesting: ${endpoint}`);
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            await this.delay(this.rateLimitDelay);
            return data;
        }
        catch (error) {
            console.error(`[Enhanced FDA API] Request failed:`, error);
            throw error;
        }
    }
    async collect510kDevices(limit = 100) {
        try {
            console.log(`[Enhanced FDA API] Collecting 510(k) devices (limit: ${limit})`);
            const endpoint = `${this.baseUrl}/device/510k.json?limit=${limit}&sort=date_received:desc`;
            const data = await this.makeRequest(endpoint);
            if (!data.results || !Array.isArray(data.results)) {
                throw new Error('Invalid FDA 510k response format');
            }
            console.log(`[Enhanced FDA API] Found ${data.results.length} 510(k) devices`);
            for (const device of data.results) {
                await this.process510kDevice(device);
            }
            console.log(`[Enhanced FDA API] 510(k) collection completed`);
        }
        catch (error) {
            console.error('[Enhanced FDA API] Error collecting 510k devices:', error);
            throw error;
        }
    }
    async process510kDevice(device) {
        try {
            const content = this.formatDeviceContent(device);
            const categories = await nlpService.categorizeContent(content);
            const sourceId = await this.getFDASourceId();
            const regulatoryUpdate = {
                title: `FDA 510(k): ${device.device_name || 'Unknown Device'}${device.k_number ? ` (${device.k_number})` : ''}`,
                content,
                sourceId,
                sourceUrl: device.k_number ? `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${device.k_number}` : '',
                region: 'US',
                updateType: 'approval',
                priority: this.determinePriority(device),
                deviceClasses: device.openfda?.device_class ? [device.openfda.device_class] : [],
                categories: categories.categories,
                rawData: device,
                publishedAt: this.parseDate(device.date_received) || new Date(),
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[Enhanced FDA API] Successfully created regulatory update: ${regulatoryUpdate.title}`);
        }
        catch (error) {
            console.error('[Enhanced FDA API] Error processing 510k device:', error);
        }
    }
    async collectRecalls(limit = 100) {
        try {
            console.log(`[Enhanced FDA API] Collecting device recalls (limit: ${limit})`);
            const endpoint = `${this.baseUrl}/device/recall.json?limit=${limit}&sort=recall_initiation_date:desc`;
            const data = await this.makeRequest(endpoint);
            if (!data.results || !Array.isArray(data.results)) {
                throw new Error('Invalid FDA recall response format');
            }
            console.log(`[Enhanced FDA API] Found ${data.results.length} recalls`);
            for (const recall of data.results) {
                await this.processRecall(recall);
            }
            console.log(`[Enhanced FDA API] Recall collection completed`);
        }
        catch (error) {
            console.error('[Enhanced FDA API] Error collecting recalls:', error);
            throw error;
        }
    }
    async processRecall(recall) {
        try {
            const content = this.formatRecallContent(recall);
            const categories = await nlpService.categorizeContent(content);
            const sourceId = await this.getFDASourceId();
            const regulatoryUpdate = {
                title: `FDA Recall: ${recall.product_description || 'Medical Device Recall'}`,
                content,
                sourceId,
                sourceUrl: recall.recall_number ? `https://www.fda.gov/medical-devices/medical-device-recalls/${recall.recall_number}` : '',
                region: 'US',
                updateType: 'recall',
                priority: this.determineRecallPriority(recall),
                deviceClasses: recall.openfda?.device_class ? [recall.openfda.device_class] : [],
                categories: categories.categories,
                rawData: recall,
                publishedAt: this.parseDate(recall.recall_initiation_date) || new Date(),
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[Enhanced FDA API] Successfully created recall update: ${regulatoryUpdate.title}`);
        }
        catch (error) {
            console.error('[Enhanced FDA API] Error processing recall:', error);
        }
    }
    formatDeviceContent(device) {
        const parts = [];
        if (device.device_name)
            parts.push(`Device: ${device.device_name}`);
        if (device.applicant)
            parts.push(`Applicant: ${device.applicant}`);
        if (device.decision)
            parts.push(`Decision: ${device.decision}`);
        if (device.statement_or_summary)
            parts.push(`Summary: ${device.statement_or_summary}`);
        if (device.review_advisory_committee)
            parts.push(`Review Committee: ${device.review_advisory_committee}`);
        if (device.product_code)
            parts.push(`Product Code: ${device.product_code}`);
        if (device.regulation_number)
            parts.push(`Regulation: ${device.regulation_number}`);
        if (device.openfda?.device_class)
            parts.push(`Device Class: ${device.openfda.device_class}`);
        if (device.openfda?.medical_specialty_description)
            parts.push(`Medical Specialty: ${device.openfda.medical_specialty_description}`);
        return parts.join('\n');
    }
    formatRecallContent(recall) {
        const parts = [];
        if (recall.product_description)
            parts.push(`Product: ${recall.product_description}`);
        if (recall.reason_for_recall)
            parts.push(`Reason: ${recall.reason_for_recall}`);
        if (recall.recalling_firm)
            parts.push(`Recalling Firm: ${recall.recalling_firm}`);
        if (recall.distribution_pattern)
            parts.push(`Distribution: ${recall.distribution_pattern}`);
        if (recall.product_quantity)
            parts.push(`Quantity: ${recall.product_quantity}`);
        if (recall.classification)
            parts.push(`Classification: ${recall.classification}`);
        if (recall.voluntary_mandated)
            parts.push(`Type: ${recall.voluntary_mandated}`);
        if (recall.status)
            parts.push(`Status: ${recall.status}`);
        return parts.join('\n');
    }
    determinePriority(device) {
        if (device.openfda?.device_class === 'Class III' || device.expedited_review_flag === 'Y') {
            return 'high';
        }
        if (device.openfda?.device_class === 'Class II') {
            return 'medium';
        }
        return 'low';
    }
    determineRecallPriority(recall) {
        if (recall.classification === 'Class I') {
            return 'high';
        }
        if (recall.classification === 'Class II') {
            return 'medium';
        }
        return 'low';
    }
    parseDate(dateString) {
        if (!dateString)
            return null;
        try {
            return new Date(dateString);
        }
        catch {
            return null;
        }
    }
    async getFDASourceId() {
        try {
            const sources = await storage.getAllDataSources();
            const fdaSource = sources.find(s => s.id === 'fda_510k' || s.name?.includes('FDA'));
            return fdaSource?.id || 'fda_510k';
        }
        catch (error) {
            console.error('Error getting FDA source ID:', error);
            return 'fda_510k';
        }
    }
}
export const enhancedFdaOpenApiService = new EnhancedFDAOpenAPIService();
//# sourceMappingURL=enhancedFdaOpenApiService.js.map