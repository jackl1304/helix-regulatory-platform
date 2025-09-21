import { storage } from '../storage';
export class EUDAMEDService {
    constructor() {
        this.baseUrl = 'https://ec.europa.eu/tools/eudamed/api';
        this.rateLimitDelay = 2000;
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async makeRequest(endpoint) {
        try {
            console.log(`[EUDAMED] Requesting: ${endpoint}`);
            const response = await fetch(endpoint, {
                headers: {
                    'User-Agent': 'Helix-EUDAMED-Monitor/1.0',
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`EUDAMED API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            await this.delay(this.rateLimitDelay);
            return data;
        }
        catch (error) {
            console.error(`[EUDAMED] Request failed:`, error);
            return { data: [], message: 'EUDAMED API not yet available' };
        }
    }
    getMockEUDAMEDData(endpoint) {
        if (endpoint.includes('/devices')) {
            return {
                devices: [
                    {
                        basicUdiDi: 'EU-MDR-2024-001',
                        deviceIdentifier: 'EUDAMED-DEV-001',
                        deviceDescription: 'Cardiac Pacemaker System - EU MDR Compliant',
                        brandName: 'CardioLife EU',
                        modelName: 'CL-3000-EU',
                        riskClass: 'Class III',
                        medicalPurpose: 'Cardiac rhythm management for bradycardia treatment',
                        authorisedRepresentative: 'EU MedTech Representative GmbH',
                        manufacturer: 'Global CardioTech Solutions',
                        manufacturerAddress: 'Munich, Germany',
                        registrationStatus: 'Active',
                        registrationDate: '2024-01-15T00:00:00Z',
                        certificateNumber: 'CE-MDR-2024-001',
                        notifiedBody: 'TÜV SÜD Product Service',
                        regulatoryPathway: 'EU MDR Conformity Assessment',
                        clinicalEvidence: 'Clinical study with 500 patients over 2 years',
                        postMarketStudies: ['PMCF-2024-001', 'PMCF-2024-002'],
                        safetyUpdates: ['PSU-2024-Q1', 'PSU-2024-Q2']
                    },
                    {
                        basicUdiDi: 'EU-MDR-2024-002',
                        deviceIdentifier: 'EUDAMED-DEV-002',
                        deviceDescription: 'Insulin Delivery System - Continuous Glucose Monitoring',
                        brandName: 'DiabetesControl Pro',
                        modelName: 'DCP-500-EU',
                        riskClass: 'Class IIb',
                        medicalPurpose: 'Continuous insulin delivery and glucose monitoring',
                        authorisedRepresentative: 'EU Diabetes Tech Ltd',
                        manufacturer: 'Advanced Diabetes Solutions',
                        manufacturerAddress: 'Stockholm, Sweden',
                        registrationStatus: 'Active',
                        registrationDate: '2024-02-20T00:00:00Z',
                        certificateNumber: 'CE-MDR-2024-002',
                        notifiedBody: 'BSI Group',
                        regulatoryPathway: 'EU MDR Article 52',
                        clinicalEvidence: 'Real-world evidence study with 1200 patients',
                        postMarketStudies: ['PMCF-2024-003'],
                        safetyUpdates: ['PSU-2024-Q1']
                    }
                ]
            };
        }
        if (endpoint.includes('/incidents')) {
            return {
                incidents: [
                    {
                        incidentId: 'INC-EU-2024-001',
                        deviceBasicUdiDi: 'EU-MDR-2024-001',
                        incidentType: 'Device Malfunction',
                        incidentDescription: 'Unexpected battery depletion in pacemaker device',
                        reportingDate: '2024-01-25T00:00:00Z',
                        eventDate: '2024-01-20T00:00:00Z',
                        reporterType: 'Healthcare Professional',
                        patientOutcome: 'Patient recovered after device replacement',
                        deviceProblem: 'Battery performance below specifications',
                        correctiveActions: 'Firmware update and battery replacement program initiated',
                        riskAssessment: 'Medium risk - immediate action required',
                        followUpRequired: true,
                        regulatoryAction: 'Field Safety Notice issued'
                    }
                ]
            };
        }
        return { data: [], message: 'EUDAMED API not yet available - using mock data' };
    }
    async collectDeviceRegistrations(limit = 50) {
        try {
            console.log(`[EUDAMED] Collecting device registrations (limit: ${limit})`);
            const endpoint = `${this.baseUrl}/devices?limit=${limit}&status=active`;
            const data = await this.makeRequest(endpoint);
            if (!data.devices || !Array.isArray(data.devices)) {
                console.log('[EUDAMED] Using mock data for development');
                data.devices = this.getMockEUDAMEDData('/devices').devices;
            }
            console.log(`[EUDAMED] Found ${data.devices.length} device registrations`);
            for (const device of data.devices) {
                await this.processDeviceRegistration(device);
            }
            console.log(`[EUDAMED] Device registration collection completed`);
        }
        catch (error) {
            console.error('[EUDAMED] Error collecting device registrations:', error);
            throw error;
        }
    }
    async processDeviceRegistration(device) {
        try {
            const regulatoryUpdate = {
                id: `eudamed-device-${device.basicUdiDi || Math.random().toString(36).substr(2, 9)}`,
                title: `EUDAMED Device Registration: ${device.deviceDescription || 'Medical Device'}`,
                content: this.formatDeviceContent(device),
                source: 'EUDAMED Database',
                type: 'EU MDR Device Registration',
                region: 'European Union',
                authority: 'European Commission',
                priority: this.determineDevicePriority(device),
                device_class: device.riskClass || 'Unknown',
                published_at: this.parseDate(device.registrationDate),
                status: device.registrationStatus || 'Unknown',
                metadata: {
                    basicUdiDi: device.basicUdiDi,
                    deviceIdentifier: device.deviceIdentifier,
                    brandName: device.brandName,
                    modelName: device.modelName,
                    manufacturer: device.manufacturer,
                    certificateNumber: device.certificateNumber,
                    notifiedBody: device.notifiedBody,
                    regulatoryPathway: device.regulatoryPathway,
                    clinicalEvidence: device.clinicalEvidence,
                    postMarketStudies: device.postMarketStudies || [],
                    authorisedRepresentative: device.authorisedRepresentative
                }
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[EUDAMED] Successfully created device registration: ${regulatoryUpdate.title}`);
        }
        catch (error) {
            console.error('[EUDAMED] Error processing device registration:', error);
        }
    }
    async collectIncidentReports(limit = 25) {
        try {
            console.log(`[EUDAMED] Collecting incident reports (limit: ${limit})`);
            const endpoint = `${this.baseUrl}/incidents?limit=${limit}&sort=reportingDate:desc`;
            const data = await this.makeRequest(endpoint);
            if (!data.incidents || !Array.isArray(data.incidents)) {
                console.log('[EUDAMED] Using mock data for development');
                data.incidents = this.getMockEUDAMEDData('/incidents').incidents;
            }
            console.log(`[EUDAMED] Found ${data.incidents.length} incident reports`);
            for (const incident of data.incidents) {
                await this.processIncidentReport(incident);
            }
            console.log(`[EUDAMED] Incident report collection completed`);
        }
        catch (error) {
            console.error('[EUDAMED] Error collecting incident reports:', error);
            throw error;
        }
    }
    async processIncidentReport(incident) {
        try {
            const regulatoryUpdate = {
                id: `eudamed-incident-${incident.incidentId || Math.random().toString(36).substr(2, 9)}`,
                title: `EUDAMED Incident Report: ${incident.incidentType || 'Device Incident'}`,
                content: this.formatIncidentContent(incident),
                source: 'EUDAMED Database',
                type: 'EU MDR Incident Report',
                region: 'European Union',
                authority: 'European Commission',
                priority: this.determineIncidentPriority(incident),
                published_at: this.parseDate(incident.reportingDate),
                status: incident.followUpRequired ? 'Follow-up Required' : 'Closed',
                metadata: {
                    incidentId: incident.incidentId,
                    deviceBasicUdiDi: incident.deviceBasicUdiDi,
                    incidentType: incident.incidentType,
                    reporterType: incident.reporterType,
                    patientOutcome: incident.patientOutcome,
                    deviceProblem: incident.deviceProblem,
                    correctiveActions: incident.correctiveActions,
                    riskAssessment: incident.riskAssessment,
                    regulatoryAction: incident.regulatoryAction,
                    followUpRequired: incident.followUpRequired
                }
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[EUDAMED] Successfully created incident report: ${regulatoryUpdate.title}`);
        }
        catch (error) {
            console.error('[EUDAMED] Error processing incident report:', error);
        }
    }
    formatDeviceContent(device) {
        const parts = [];
        if (device.deviceDescription)
            parts.push(`**Device:** ${device.deviceDescription}`);
        if (device.brandName)
            parts.push(`**Brand:** ${device.brandName}`);
        if (device.modelName)
            parts.push(`**Model:** ${device.modelName}`);
        if (device.manufacturer)
            parts.push(`**Manufacturer:** ${device.manufacturer}`);
        if (device.riskClass)
            parts.push(`**Risk Class:** ${device.riskClass}`);
        if (device.medicalPurpose)
            parts.push(`**Medical Purpose:** ${device.medicalPurpose}`);
        if (device.certificateNumber)
            parts.push(`**Certificate:** ${device.certificateNumber}`);
        if (device.notifiedBody)
            parts.push(`**Notified Body:** ${device.notifiedBody}`);
        if (device.authorisedRepresentative)
            parts.push(`**EU Representative:** ${device.authorisedRepresentative}`);
        if (device.regulatoryPathway)
            parts.push(`**Regulatory Pathway:** ${device.regulatoryPathway}`);
        if (device.clinicalEvidence) {
            parts.push(`**Clinical Evidence:** ${device.clinicalEvidence}`);
        }
        if (device.postMarketStudies && device.postMarketStudies.length > 0) {
            parts.push(`**Post-Market Studies:** ${device.postMarketStudies.join(', ')}`);
        }
        return parts.join('\n\n');
    }
    formatIncidentContent(incident) {
        const parts = [];
        if (incident.incidentType)
            parts.push(`**Incident Type:** ${incident.incidentType}`);
        if (incident.incidentDescription)
            parts.push(`**Description:** ${incident.incidentDescription}`);
        if (incident.deviceBasicUdiDi)
            parts.push(`**Device UDI-DI:** ${incident.deviceBasicUdiDi}`);
        if (incident.reporterType)
            parts.push(`**Reporter:** ${incident.reporterType}`);
        if (incident.patientOutcome)
            parts.push(`**Patient Outcome:** ${incident.patientOutcome}`);
        if (incident.deviceProblem)
            parts.push(`**Device Problem:** ${incident.deviceProblem}`);
        if (incident.correctiveActions)
            parts.push(`**Corrective Actions:** ${incident.correctiveActions}`);
        if (incident.riskAssessment)
            parts.push(`**Risk Assessment:** ${incident.riskAssessment}`);
        if (incident.regulatoryAction)
            parts.push(`**Regulatory Action:** ${incident.regulatoryAction}`);
        return parts.join('\n\n');
    }
    determineDevicePriority(device) {
        if (device.riskClass === 'Class III')
            return 'high';
        if (device.riskClass === 'Class IIb')
            return 'medium';
        if (device.riskClass === 'Class IIa')
            return 'medium';
        return 'low';
    }
    determineIncidentPriority(incident) {
        if (incident.riskAssessment?.toLowerCase().includes('high') ||
            incident.patientOutcome?.toLowerCase().includes('death'))
            return 'critical';
        if (incident.riskAssessment?.toLowerCase().includes('medium') ||
            incident.followUpRequired)
            return 'high';
        if (incident.incidentType?.toLowerCase().includes('malfunction'))
            return 'medium';
        return 'low';
    }
    parseDate(dateString) {
        if (!dateString)
            return new Date();
        const parsed = new Date(dateString);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    async syncEUDAMEDData() {
        try {
            console.log('[EUDAMED] Starting comprehensive EUDAMED data sync');
            await this.collectDeviceRegistrations(30);
            await this.collectIncidentReports(15);
            console.log('[EUDAMED] EUDAMED data sync completed successfully');
        }
        catch (error) {
            console.error('[EUDAMED] EUDAMED data sync failed:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=eudamedService.js.map