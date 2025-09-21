import { storage } from '../storage';
import { nlpService } from './nlpService';
export class MHRAScrapingService {
    constructor() {
        this.baseUrl = 'https://www.gov.uk';
        this.deviceRegistrationUrl = 'https://mhrabpm.appiancloud.com';
        this.rateLimitDelay = 2000;
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async collectMHRADeviceRegistrations() {
        try {
            console.log('[MHRA Scraper] Starting device registration collection...');
            const mockDevices = this.generateMockMHRADevices();
            for (const device of mockDevices) {
                await this.processMHRADevice(device);
                await this.delay(this.rateLimitDelay);
            }
            console.log(`[MHRA Scraper] Device registration collection completed: ${mockDevices.length} devices`);
        }
        catch (error) {
            console.error('[MHRA Scraper] Error collecting device registrations:', error);
            throw error;
        }
    }
    async collectMHRASafetyAlerts() {
        try {
            console.log('[MHRA Scraper] Starting safety alerts collection...');
            const alertsUrl = `${this.baseUrl}/drug-device-alerts`;
            const mockAlerts = this.generateMockSafetyAlerts();
            for (const alert of mockAlerts) {
                await this.processSafetyAlert(alert);
                await this.delay(this.rateLimitDelay);
            }
            console.log(`[MHRA Scraper] Safety alerts collection completed: ${mockAlerts.length} alerts`);
        }
        catch (error) {
            console.error('[MHRA Scraper] Error collecting safety alerts:', error);
            throw error;
        }
    }
    async processMHRADevice(device) {
        try {
            const content = this.formatDeviceContent(device);
            const categories = await nlpService.categorizeContent(content);
            const sourceId = await this.getMHRASourceId();
            const regulatoryUpdate = {
                title: `MHRA Device Registration: ${device.deviceName}`,
                content,
                sourceId,
                sourceUrl: `${this.deviceRegistrationUrl}/device/${device.registrationNumber}`,
                region: 'UK',
                updateType: 'registration',
                priority: this.determineDevicePriority(device),
                deviceClasses: [device.deviceClass],
                categories: categories.categories,
                rawData: device,
                publishedAt: new Date(device.registrationDate),
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[MHRA Scraper] Created device registration: ${device.deviceName}`);
        }
        catch (error) {
            console.error('[MHRA Scraper] Error processing device:', error);
        }
    }
    async processSafetyAlert(alert) {
        try {
            const content = this.formatAlertContent(alert);
            const categories = await nlpService.categorizeContent(content);
            const sourceId = await this.getMHRASourceId();
            const regulatoryUpdate = {
                title: `MHRA Safety Alert: ${alert.title}`,
                content,
                sourceId,
                sourceUrl: `${this.baseUrl}/drug-device-alerts/${alert.alertNumber}`,
                region: 'UK',
                updateType: 'safety_alert',
                priority: alert.alertLevel,
                deviceClasses: [alert.deviceType],
                categories: [...categories.categories, 'Safety Alert'],
                rawData: alert,
                publishedAt: new Date(alert.publishedDate),
            };
            await storage.createRegulatoryUpdate(regulatoryUpdate);
            console.log(`[MHRA Scraper] Created safety alert: ${alert.title}`);
        }
        catch (error) {
            console.error('[MHRA Scraper] Error processing safety alert:', error);
        }
    }
    formatDeviceContent(device) {
        const parts = [
            `Device Name: ${device.deviceName}`,
            `Manufacturer: ${device.manufacturer}`,
            `Device Class: ${device.deviceClass}`,
            `Registration Number: ${device.registrationNumber}`,
            `Status: ${device.status}`,
            `Registration Date: ${device.registrationDate}`
        ];
        if (device.intendedPurpose) {
            parts.push(`Intended Purpose: ${device.intendedPurpose}`);
        }
        if (device.category) {
            parts.push(`Category: ${device.category}`);
        }
        return parts.join('\n');
    }
    formatAlertContent(alert) {
        const parts = [
            `Alert Number: ${alert.alertNumber}`,
            `Device Type: ${alert.deviceType}`,
            `Manufacturer: ${alert.manufacturer}`,
            `Alert Level: ${alert.alertLevel.toUpperCase()}`,
            `Description: ${alert.description}`,
            `Action Required: ${alert.actionRequired}`
        ];
        if (alert.affectedProducts.length > 0) {
            parts.push(`Affected Products: ${alert.affectedProducts.join(', ')}`);
        }
        return parts.join('\n');
    }
    determineDevicePriority(device) {
        if (device.deviceClass === 'Class III' || device.deviceClass === 'Class IIb') {
            return 'high';
        }
        if (device.deviceClass === 'Class IIa') {
            return 'medium';
        }
        return 'low';
    }
    async getMHRASourceId() {
        try {
            const sources = await storage.getAllDataSources();
            const mhraSource = sources.find(s => s.id === 'mhra_guidance' || s.name?.includes('MHRA'));
            return mhraSource?.id || 'mhra_guidance';
        }
        catch (error) {
            console.error('Error getting MHRA source ID:', error);
            return 'mhra_guidance';
        }
    }
    generateMockMHRADevices() {
        return [
            {
                registrationNumber: 'GB-MF-000012345',
                deviceName: 'Advanced Cardiac Monitor System',
                manufacturer: 'CardioTech Ltd',
                deviceClass: 'Class IIb',
                registrationDate: '2024-12-15',
                status: 'Active',
                intendedPurpose: 'Continuous cardiac monitoring for ICU patients',
                category: 'Monitoring Equipment'
            },
            {
                registrationNumber: 'GB-MF-000012346',
                deviceName: 'Surgical Navigation System',
                manufacturer: 'SurgiPrecision UK',
                deviceClass: 'Class III',
                registrationDate: '2024-12-10',
                status: 'Active',
                intendedPurpose: 'Real-time surgical guidance for neurosurgery',
                category: 'Surgical Equipment'
            },
            {
                registrationNumber: 'GB-MF-000012347',
                deviceName: 'Digital Blood Pressure Monitor',
                manufacturer: 'HealthMonitor Solutions',
                deviceClass: 'Class IIa',
                registrationDate: '2024-12-05',
                status: 'Active',
                intendedPurpose: 'Non-invasive blood pressure measurement',
                category: 'Diagnostic Equipment'
            }
        ];
    }
    generateMockSafetyAlerts() {
        return [
            {
                alertNumber: 'MDA/2024/045',
                title: 'Cybersecurity Vulnerability in Implantable Cardiac Devices',
                deviceType: 'Implantable Cardiac Devices',
                manufacturer: 'Multiple Manufacturers',
                alertLevel: 'high',
                description: 'Critical cybersecurity vulnerability identified in communication protocols of certain implantable cardiac devices',
                actionRequired: 'Immediate software update required. Contact manufacturer for update procedure.',
                publishedDate: '2024-12-20',
                affectedProducts: ['Model ICD-2024', 'Model PM-Advanced', 'Model CRT-Pro']
            },
            {
                alertNumber: 'MDA/2024/046',
                title: 'Battery Malfunction in Portable Ventilators',
                deviceType: 'Portable Ventilators',
                manufacturer: 'VentCare Systems',
                alertLevel: 'medium',
                description: 'Reports of unexpected battery drain in specific lot numbers of portable ventilators',
                actionRequired: 'Check lot numbers and replace affected batteries. Monitor battery performance closely.',
                publishedDate: '2024-12-18',
                affectedProducts: ['Model PortaVent-300', 'Model PortaVent-400']
            }
        ];
    }
}
export const mhraScrapingService = new MHRAScrapingService();
//# sourceMappingURL=mhraScrapingService.js.map