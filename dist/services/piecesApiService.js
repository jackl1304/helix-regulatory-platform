import fetch from 'node-fetch';
export class PiecesApiService {
    constructor() {
        this.baseUrl = 'http://localhost:1000';
    }
    async isHealthy() {
        try {
            const response = await fetch(`${this.baseUrl}/.well-known/health`);
            return response.ok;
        }
        catch (error) {
            console.warn('[PIECES] API nicht verfügbar:', error);
            return false;
        }
    }
    async shareRegulatoryUpdate(update) {
        try {
            const isHealthy = await this.isHealthy();
            if (!isHealthy) {
                console.warn('[PIECES] API nicht verfügbar - Regulatory Update wird nicht geteilt');
                return null;
            }
            const content = this.formatRegulatoryUpdateForSharing(update);
            const shareUrl = await this.createSharedPiece(content, 'regulatory-update');
            console.log(`[PIECES] Regulatory Update geteilt: ${shareUrl}`);
            return shareUrl;
        }
        catch (error) {
            console.error('[PIECES] Fehler beim Teilen des Regulatory Updates:', error);
            return null;
        }
    }
    async shareLegalCase(legalCase) {
        try {
            const isHealthy = await this.isHealthy();
            if (!isHealthy) {
                console.warn('[PIECES] API nicht verfügbar - Rechtsfall wird nicht geteilt');
                return null;
            }
            const content = this.formatLegalCaseForSharing(legalCase);
            const shareUrl = await this.createSharedPiece(content, 'legal-case');
            console.log(`[PIECES] Rechtsfall geteilt: ${shareUrl}`);
            return shareUrl;
        }
        catch (error) {
            console.error('[PIECES] Fehler beim Teilen des Rechtsfalls:', error);
            return null;
        }
    }
    async shareNewsletterContent(newsletter) {
        try {
            const isHealthy = await this.isHealthy();
            if (!isHealthy) {
                console.warn('[PIECES] API nicht verfügbar - Newsletter wird nicht geteilt');
                return null;
            }
            const content = this.formatNewsletterForSharing(newsletter);
            const shareUrl = await this.createSharedPiece(content, 'newsletter');
            console.log(`[PIECES] Newsletter geteilt: ${shareUrl}`);
            return shareUrl;
        }
        catch (error) {
            console.error('[PIECES] Fehler beim Teilen des Newsletters:', error);
            return null;
        }
    }
    async createSharedPiece(content, type) {
        const response = await fetch(`${this.baseUrl}/pieces/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                content,
                type,
                metadata: {
                    source: 'Helix Regulatory Intelligence',
                    timestamp: new Date().toISOString()
                }
            })
        });
        if (!response.ok) {
            throw new Error(`Pieces API Fehler: ${response.status}`);
        }
        const result = await response.json();
        return result.shareUrl || `${this.baseUrl}/shared/${result.id}`;
    }
    formatRegulatoryUpdateForSharing(update) {
        return `# ${update.title}

## 🏛️ Regulatorische Information
- **Quelle:** ${update.jurisdiction || 'Unbekannt'}
- **Typ:** ${update.type || 'Regulation'}
- **Datum:** ${new Date(update.publishedDate || update.published_date).toLocaleDateString('de-DE')}
- **Risiko-Level:** ${update.riskLevel || update.risk_level || 'Medium'}

## 📝 Zusammenfassung
${update.summary || update.description || 'Keine Zusammenfassung verfügbar'}

## 📄 Vollständiger Inhalt
${update.content || 'Vollständiger Inhalt wird nachgeladen...'}

## 🏷️ Tags
${update.tags ? update.tags.join(', ') : 'Keine Tags'}

## 🔗 Dokumentation
${update.documentUrl || update.document_url || 'Kein Originaldokument verfügbar'}

---
*Geteilt über Helix Regulatory Intelligence Platform*
*Generiert am: ${new Date().toLocaleString('de-DE')}*`;
    }
    formatLegalCaseForSharing(legalCase) {
        return `# ⚖️ ${legalCase.title}

## 🏛️ Gerichtsinformationen
- **Gericht:** ${legalCase.court}
- **Aktenzeichen:** ${legalCase.caseNumber || legalCase.case_number}
- **Entscheidungsdatum:** ${new Date(legalCase.decisionDate || legalCase.decision_date).toLocaleDateString('de-DE')}
- **Rechtsprechung:** ${legalCase.jurisdiction}
- **Impact Level:** ${legalCase.impactLevel || legalCase.impact_level}

## 📝 Zusammenfassung
${legalCase.summary || 'Keine Zusammenfassung verfügbar'}

## ⚖️ Urteilsspruch
${legalCase.verdict || 'Urteilsspruch wird nachgeladen...'}

## 💰 Schadensersatz
${legalCase.damages || 'Schadensersatzinformationen werden nachgeladen...'}

## 📄 Vollständiger Inhalt
${legalCase.content || 'Vollständiger Inhalt wird nachgeladen...'}

## 🏷️ Schlagwörter
${legalCase.keywords ? legalCase.keywords.join(', ') : 'Keine Schlagwörter'}

## 🔗 Originaldokument
${legalCase.documentUrl || legalCase.document_url || 'Kein Originaldokument verfügbar'}

---
*Geteilt über Helix Regulatory Intelligence Platform*
*Generiert am: ${new Date().toLocaleString('de-DE')}*`;
    }
    formatNewsletterForSharing(newsletter) {
        return `# 📧 ${newsletter.subject}

## 📅 Newsletter-Informationen
- **Gesendet am:** ${newsletter.sentAt ? new Date(newsletter.sentAt).toLocaleDateString('de-DE') : 'Noch nicht gesendet'}
- **Status:** ${newsletter.status || 'draft'}
- **Empfänger:** ${newsletter.recipientCount || 'Unbekannt'} Abonnenten

## 📝 Inhalt
${newsletter.content || 'Newsletter-Inhalt wird nachgeladen...'}

## 🎯 Extrahierte Artikel
${newsletter.extractedArticles ? newsletter.extractedArticles.length + ' Artikel extrahiert' : 'Keine Artikel extrahiert'}

## 📊 Quellen
${newsletter.sources ? newsletter.sources.map((s) => `- ${s.name}: ${s.url}`).join('\n') : 'Keine Quellen definiert'}

---
*Geteilt über Helix Regulatory Intelligence Platform*
*Newsletter-System - Automatische Generierung*
*Erstellt am: ${new Date().toLocaleString('de-DE')}*`;
    }
    async getSharedPiece(shareId) {
        try {
            const response = await fetch(`${this.baseUrl}/?p=${shareId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html'
                }
            });
            if (!response.ok) {
                throw new Error(`Pieces API Fehler: ${response.status}`);
            }
            return await response.text();
        }
        catch (error) {
            console.error('[PIECES] Fehler beim Abrufen des geteilten Pieces:', error);
            return null;
        }
    }
    async autoShareCriticalUpdates(updates) {
        const sharedUrls = [];
        for (const update of updates) {
            if (this.isCriticalUpdate(update)) {
                const shareUrl = await this.shareRegulatoryUpdate(update);
                if (shareUrl) {
                    sharedUrls.push(shareUrl);
                }
            }
        }
        return sharedUrls;
    }
    isCriticalUpdate(update) {
        const criticalKeywords = ['recall', 'safety', 'urgent', 'immediate', 'critical', 'emergency'];
        const riskLevels = ['high', 'critical'];
        const title = (update.title || '').toLowerCase();
        const content = (update.content || update.summary || '').toLowerCase();
        const riskLevel = (update.riskLevel || update.risk_level || '').toLowerCase();
        return riskLevels.includes(riskLevel) ||
            criticalKeywords.some(keyword => title.includes(keyword) || content.includes(keyword));
    }
}
export const piecesApiService = new PiecesApiService();
//# sourceMappingURL=piecesApiService.js.map