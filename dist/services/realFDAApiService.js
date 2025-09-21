import { apiManagementService } from './apiManagementService';
import { storage } from '../storage';
export class RealFDAApiService {
    constructor() {
        this.sourceId = 'fda_openfda';
        this.baseEndpoints = {
            devices510k: '/device/510k.json',
            devicesPMA: '/device/pma.json',
            devicesRecalls: '/device/recall.json',
            devicesEnforcement: '/device/enforcement.json',
            deviceClassification: '/device/classification.json'
        };
    }
    async fetch510kClearances(limit = 100, skip = 0) {
        try {
            const endpoint = `${this.baseEndpoints.devices510k}?limit=${limit}&skip=${skip}`;
            const response = await apiManagementService.callAPI(this.sourceId, endpoint);
            if (!response.success) {
                console.error('[Real FDA API] 510k fetch failed:', response.error);
                return [];
            }
            return response.data?.results || [];
        }
        catch (error) {
            console.error('[Real FDA API] 510k fetch error:', error);
            return [];
        }
    }
    async fetchPMAApprovals(limit = 100, skip = 0) {
        try {
            const endpoint = `${this.baseEndpoints.devicesPMA}?limit=${limit}&skip=${skip}`;
            const response = await apiManagementService.callAPI(this.sourceId, endpoint);
            if (!response.success) {
                console.error('[Real FDA API] PMA fetch failed:', response.error);
                return [];
            }
            return response.data?.results || [];
        }
        catch (error) {
            console.error('[Real FDA API] PMA fetch error:', error);
            return [];
        }
    }
    async fetchDeviceRecalls(limit = 100, skip = 0) {
        try {
            const endpoint = `${this.baseEndpoints.devicesRecalls}?limit=${limit}&skip=${skip}`;
            const response = await apiManagementService.callAPI(this.sourceId, endpoint);
            if (!response.success) {
                console.error('[Real FDA API] Recalls fetch failed:', response.error);
                return [];
            }
            return response.data?.results || [];
        }
        catch (error) {
            console.error('[Real FDA API] Recalls fetch error:', error);
            return [];
        }
    }
    async fetchEnforcementActions(limit = 100, skip = 0) {
        try {
            const endpoint = `${this.baseEndpoints.devicesEnforcement}?limit=${limit}&skip=${skip}`;
            const response = await apiManagementService.callAPI(this.sourceId, endpoint);
            if (!response.success) {
                console.error('[Real FDA API] Enforcement fetch failed:', response.error);
                return [];
            }
            return response.data?.results || [];
        }
        catch (error) {
            console.error('[Real FDA API] Enforcement fetch error:', error);
            return [];
        }
    }
    async searchDevices(searchQuery, limit = 50) {
        try {
            const encodedQuery = encodeURIComponent(searchQuery);
            const endpoint = `${this.baseEndpoints.devices510k}?search=${encodedQuery}&limit=${limit}`;
            const response = await apiManagementService.callAPI(this.sourceId, endpoint);
            if (!response.success) {
                console.error('[Real FDA API] Device search failed:', response.error);
                return [];
            }
            return response.data?.results || [];
        }
        catch (error) {
            console.error('[Real FDA API] Device search error:', error);
            return [];
        }
    }
    convert510kToRegulatoryUpdate(device) {
        const deviceName = device.device_name ||
            device.openfda?.device_name?.[0] ||
            'Unknown Device';
        const specialty = device.openfda?.medical_specialty_description?.[0] || 'General';
        return {
            title: `510(k) Clearance: ${deviceName}`,
            content: this.buildDeviceContent(device),
            summary: `FDA 510(k) clearance for ${deviceName} by ${device.applicant || 'Unknown'}`,
            source: 'FDA OpenFDA API',
            sourceUrl: `https://open.fda.gov/apis/device/510k/`,
            publishedAt: device.decision_date ? new Date(device.decision_date) : new Date(),
            region: 'United States',
            regulatoryBody: 'FDA',
            documentType: '510k_clearance',
            impactLevel: 'medium',
            deviceTypes: [specialty.toLowerCase().replace(/\s+/g, '-')],
            isActive: true,
        };
    }
    convertRecallToRegulatoryUpdate(recall) {
        const deviceName = recall.product_description ||
            recall.openfda?.device_name?.[0] ||
            'Unknown Device';
        const classification = recall.classification || 'Unknown';
        const impactLevel = classification.includes('Class I') ? 'high' :
            classification.includes('Class II') ? 'medium' : 'low';
        return {
            title: `Device Recall: ${deviceName}`,
            content: this.buildRecallContent(recall),
            summary: `FDA device recall - ${recall.reason_for_recall || 'Reason not specified'}`,
            source: 'FDA OpenFDA API',
            sourceUrl: `https://open.fda.gov/apis/device/recall/`,
            publishedAt: recall.recall_initiation_date ? new Date(recall.recall_initiation_date) : new Date(),
            region: 'United States',
            regulatoryBody: 'FDA',
            documentType: 'recall',
            impactLevel: impactLevel,
            deviceTypes: recall.openfda?.device_name?.map(name => name.toLowerCase().replace(/\s+/g, '-')) || ['unknown'],
            isActive: true,
        };
    }
    buildDeviceContent(device) {
        const sections = [];
        sections.push(`**Geräteinformationen:**`);
        sections.push(`- Gerätename: ${device.device_name || 'Nicht angegeben'}`);
        sections.push(`- Antragsteller: ${device.applicant || 'Nicht angegeben'}`);
        sections.push(`- K-Nummer: ${device.k_number || 'Nicht angegeben'}`);
        sections.push(`- Produktcode: ${device.product_code || 'Nicht angegeben'}`);
        if (device.openfda) {
            sections.push(`\n**Regulatorische Details:**`);
            sections.push(`- Geräteklasse: ${device.openfda.device_class || 'Nicht angegeben'}`);
            sections.push(`- Medizinische Spezialisierung: ${device.openfda.medical_specialty_description?.join(', ') || 'Nicht angegeben'}`);
            sections.push(`- Regulierungsnummer: ${device.openfda.regulation_number?.join(', ') || 'Nicht angegeben'}`);
        }
        sections.push(`\n**Verfahrensinformationen:**`);
        sections.push(`- Entscheidungsdatum: ${device.decision_date || 'Nicht angegeben'}`);
        sections.push(`- Entscheidung: ${device.decision || 'Nicht angegeben'}`);
        sections.push(`- Clearance-Typ: ${device.clearance_type || 'Standard'}`);
        if (device.statement_or_summary) {
            sections.push(`\n**Zusammenfassung:**`);
            sections.push(device.statement_or_summary);
        }
        return sections.join('\n');
    }
    buildRecallContent(recall) {
        const sections = [];
        sections.push(`**Rückruf-Informationen:**`);
        sections.push(`- Rückruf-Nummer: ${recall.recall_number || 'Nicht angegeben'}`);
        sections.push(`- Status: ${recall.status || 'Nicht angegeben'}`);
        sections.push(`- Klassifizierung: ${recall.classification || 'Nicht angegeben'}`);
        sections.push(`- Rückrufendes Unternehmen: ${recall.recalling_firm || 'Nicht angegeben'}`);
        sections.push(`\n**Produktdetails:**`);
        sections.push(`- Produktbeschreibung: ${recall.product_description || 'Nicht angegeben'}`);
        if (recall.openfda) {
            sections.push(`- Gerätename: ${recall.openfda.device_name?.join(', ') || 'Nicht angegeben'}`);
            sections.push(`- Geräteklasse: ${recall.openfda.device_class || 'Nicht angegeben'}`);
        }
        sections.push(`\n**Rückrufgrund:**`);
        sections.push(recall.reason_for_recall || 'Grund nicht spezifiziert');
        sections.push(`\n**Initiierungsdatum:**`);
        sections.push(recall.recall_initiation_date || 'Nicht angegeben');
        return sections.join('\n');
    }
    async syncAllFDAData() {
        console.log('[Real FDA API] Starting comprehensive FDA data sync...');
        let processed = 0;
        let errors = 0;
        try {
            console.log('[Real FDA API] Syncing 510(k) clearances...');
            const devices510k = await this.fetch510kClearances(50);
            for (const device of devices510k) {
                try {
                    const update = this.convert510kToRegulatoryUpdate(device);
                    await storage.createRegulatoryUpdate(update);
                    processed++;
                }
                catch (error) {
                    console.error('[Real FDA API] Error processing 510k device:', error);
                    errors++;
                }
            }
            console.log('[Real FDA API] Syncing device recalls...');
            const recalls = await this.fetchDeviceRecalls(50);
            for (const recall of recalls) {
                try {
                    const update = this.convertRecallToRegulatoryUpdate(recall);
                    await storage.createRegulatoryUpdate(update);
                    processed++;
                }
                catch (error) {
                    console.error('[Real FDA API] Error processing recall:', error);
                    errors++;
                }
            }
            console.log(`[Real FDA API] Sync completed: ${processed} processed, ${errors} errors`);
            return { success: true, processed, errors };
        }
        catch (error) {
            console.error('[Real FDA API] Sync failed:', error);
            return { success: false, processed, errors: errors + 1 };
        }
    }
}
export const realFDAApiService = new RealFDAApiService();
//# sourceMappingURL=realFDAApiService.js.map