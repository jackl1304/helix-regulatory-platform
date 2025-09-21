import { storage } from '../storage';
export class FDAOpenAPIService {
    constructor() {
        this.baseUrl = 'https://api.fda.gov';
        this.apiKey = process.env.FDA_API_KEY || '';
        this.rateLimitDelay = 250;
        this.maxRetries = 3;
        this.retryDelay = 2000;
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async exponentialBackoff(attempt) {
        const delay = this.retryDelay * Math.pow(2, attempt);
        await this.delay(delay);
    }
    async makeRequest(endpoint, retryAttempt = 0) {
        try {
            const urlWithKey = this.apiKey ?
                `${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${this.apiKey}` :
                endpoint;
            console.log(`🔄 [FDA API] Requesting: ${urlWithKey.replace(this.apiKey, 'API_KEY_HIDDEN')} (attempt ${retryAttempt + 1})`);
            const response = await fetch(urlWithKey, {
                headers: {
                    'User-Agent': 'Helix-Regulatory-Intelligence/1.0',
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                if (response.status === 429 && retryAttempt < this.maxRetries) {
                    console.log(`⏱️ [FDA API] Rate limited, retrying after backoff...`);
                    await this.exponentialBackoff(retryAttempt);
                    return this.makeRequest(endpoint, retryAttempt + 1);
                }
                throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid FDA API response format');
            }
            await this.delay(this.rateLimitDelay);
            console.log(`✅ [FDA API] Request successful - received ${data.results?.length || 0} items`);
            return data;
        }
        catch (error) {
            if (retryAttempt < this.maxRetries && !error.message.includes('Rate limited')) {
                console.log(`🔄 [FDA API] Retrying request (attempt ${retryAttempt + 2})...`);
                await this.exponentialBackoff(retryAttempt);
                return this.makeRequest(endpoint, retryAttempt + 1);
            }
            console.error(`❌ [FDA API] Request failed after ${retryAttempt + 1} attempts:`, error);
            throw error;
        }
    }
    async collect510kDevices(limit = 100) {
        try {
            console.log(`[FDA API] Collecting 510(k) devices (limit: ${limit})`);
            const endpoint = `${this.baseUrl}/device/510k.json?limit=${limit}&sort=date_received:desc`;
            const data = await this.makeRequest(endpoint);
            if (!data.results || !Array.isArray(data.results)) {
                throw new Error('Invalid FDA 510k response format');
            }
            console.log(`[FDA API] Found ${data.results.length} 510(k) devices`);
            for (const device of data.results) {
                await this.process510kDevice(device);
            }
            console.log(`[FDA API] 510(k) collection completed`);
            return data.results;
        }
        catch (error) {
            console.error('[FDA API] Error collecting 510k devices:', error);
            throw error;
        }
    }
    async process510kDevice(device) {
        try {
            const regulatoryUpdate = {
                title: `FDA 510(k): ${device.device_name || 'Unknown Device'}${device.k_number ? ` (${device.k_number})` : ''}`,
                description: this.formatDeviceContent(device),
                sourceId: 'fda_510k',
                sourceUrl: `https://www.fda.gov/medical-devices/510k-clearances/510k-clearance-${device.k_number}`,
                region: 'US',
                updateType: 'approval',
                priority: this.determinePriority(device),
                deviceClasses: device.openfda?.device_class ? [device.openfda.device_class] : [],
                categories: await this.categorizeDevice(device),
                rawData: device,
                publishedAt: this.parseDate(device.decision_date) || new Date(),
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[FDA API] Successfully created regulatory update: ${regulatoryUpdate.title}`);
        }
        catch (error) {
            console.error('[FDA API] Error processing 510k device:', error);
        }
    }
    async collectRecalls(limit = 100) {
        try {
            console.log(`[FDA API] Collecting device recalls (limit: ${limit})`);
            const endpoint = `${this.baseUrl}/device/recall.json?limit=${limit}&sort=recall_initiation_date:desc`;
            const data = await this.makeRequest(endpoint);
            if (!data.results || !Array.isArray(data.results)) {
                throw new Error('Invalid FDA recall response format');
            }
            console.log(`[FDA API] Found ${data.results.length} recalls`);
            for (const recall of data.results) {
                await this.processRecall(recall);
            }
            console.log(`[FDA API] Recall collection completed`);
            return data.results;
        }
        catch (error) {
            console.error('[FDA API] Error collecting recalls:', error);
            throw error;
        }
    }
    async processRecall(recall) {
        try {
            const regulatoryUpdate = {
                title: `FDA Recall: ${recall.product_description || 'Medical Device Recall'}`,
                description: this.formatRecallContent(recall),
                sourceId: 'fda_recalls',
                sourceUrl: `https://www.fda.gov/medical-devices/medical-device-recalls/${recall.recall_number}`,
                region: 'US',
                updateType: 'recall',
                priority: this.determineRecallPriority(recall),
                deviceClasses: recall.openfda?.device_class ? [recall.openfda.device_class] : [],
                categories: ['Safety Alert', 'Device Recall'],
                rawData: recall,
                publishedAt: this.parseDate(recall.recall_initiation_date) || new Date(),
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[FDA API] Successfully created recall update: ${regulatoryUpdate.title}`);
        }
        catch (error) {
            console.error('[FDA API] Error processing recall:', error);
        }
    }
    formatDeviceContent(device) {
        const parts = [
            `K-Nummer: ${device.k_number || 'N/A'}`,
            `Antragsteller: ${device.applicant || 'N/A'}`,
            `Produktcode: ${device.product_code || 'N/A'}`,
            `Geräteklasse: ${device.openfda?.device_class || 'N/A'}`,
            `Regulierungsnummer: ${device.regulation_number || device.openfda?.regulation_number || 'N/A'}`,
            `Entscheidungsdatum: ${device.decision_date || 'N/A'}`,
            `Status: ${device.decision || 'N/A'}`
        ];
        if (device.statement_or_summary) {
            parts.push(`Zusammenfassung: ${device.statement_or_summary}`);
        }
        if (device.openfda?.medical_specialty_description) {
            parts.push(`Medizinischer Bereich: ${device.openfda.medical_specialty_description}`);
        }
        return parts.join('\n');
    }
    formatRecallContent(recall) {
        const parts = [
            `Recall-Nummer: ${recall.recall_number || 'N/A'}`,
            `Grund: ${recall.reason_for_recall || 'N/A'}`,
            `Status: ${recall.status || 'N/A'}`,
            `Klassifizierung: ${recall.classification || 'N/A'}`,
            `Rückrufende Firma: ${recall.recalling_firm || 'N/A'}`,
            `Produktmenge: ${recall.product_quantity || 'N/A'}`,
            `Verteilungsmuster: ${recall.distribution_pattern || 'N/A'}`,
            `Freiwillig/Verpflichtend: ${recall.voluntary_mandated || 'N/A'}`
        ];
        if (recall.code_info) {
            parts.push(`Code-Info: ${recall.code_info}`);
        }
        return parts.join('\n');
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
    determinePriority(device) {
        const deviceClass = device.openfda?.device_class;
        const deviceName = device.device_name?.toLowerCase() || '';
        if (deviceClass === 'Class III' ||
            deviceName.includes('implant') ||
            deviceName.includes('pacemaker') ||
            deviceName.includes('defibrillator')) {
            return 'critical';
        }
        if (deviceName.includes('ai') ||
            deviceName.includes('artificial intelligence') ||
            deviceName.includes('machine learning')) {
            return 'high';
        }
        if (deviceClass === 'Class II') {
            return 'medium';
        }
        return 'low';
    }
    determineRecallPriority(recall) {
        const classification = recall.classification?.toLowerCase() || '';
        const reason = recall.reason_for_recall?.toLowerCase() || '';
        if (classification.includes('class i') ||
            reason.includes('death') ||
            reason.includes('serious injury')) {
            return 'critical';
        }
        if (classification.includes('class ii')) {
            return 'high';
        }
        if (classification.includes('class iii')) {
            return 'medium';
        }
        return 'medium';
    }
    async categorizeDevice(device) {
        const categories = [];
        const deviceName = device.device_name?.toLowerCase() || '';
        const specialty = device.openfda?.medical_specialty_description?.toLowerCase() || '';
        if (specialty.includes('cardio'))
            categories.push('Kardiologie');
        if (specialty.includes('neuro'))
            categories.push('Neurologie');
        if (specialty.includes('ortho'))
            categories.push('Orthopädie');
        if (specialty.includes('radio'))
            categories.push('Radiologie');
        if (deviceName.includes('software') || deviceName.includes('ai')) {
            categories.push('Software-Medizinprodukt');
        }
        if (deviceName.includes('implant'))
            categories.push('Implantat');
        if (deviceName.includes('monitor'))
            categories.push('Monitoring');
        if (deviceName.includes('diagnostic'))
            categories.push('Diagnostik');
        if (categories.length === 0) {
            categories.push('Medizinprodukt');
        }
        return categories;
    }
}
export const fdaOpenApiService = new FDAOpenAPIService();
//# sourceMappingURL=fdaOpenApiService.js.map