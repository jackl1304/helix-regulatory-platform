import { Logger } from './logger.service';
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
class DatabaseError extends AppError {
    constructor(message) {
        super(message, 500);
    }
}
const logger = new Logger('KnowledgeExtraction');
export class KnowledgeExtractionService {
    constructor(storage) {
        this.storage = storage;
    }
    async extractArticlesFromAllSources() {
        logger.info('Starting knowledge article extraction from all data sources');
        const stats = {
            totalProcessed: 0,
            articlesExtracted: 0,
            duplicatesSkipped: 0,
            errorsEncountered: 0,
            sourcesProcessed: []
        };
        try {
            const regulatoryStats = await this.extractFromRegulatoryUpdates();
            this.mergeStats(stats, regulatoryStats);
            const legalStats = await this.extractFromLegalCases();
            this.mergeStats(stats, legalStats);
            logger.info('Knowledge article extraction completed', {
                totalProcessed: stats.totalProcessed,
                articlesExtracted: stats.articlesExtracted,
                duplicatesSkipped: stats.duplicatesSkipped,
                errorsEncountered: stats.errorsEncountered
            });
            return stats;
        }
        catch (error) {
            logger.error('Failed to extract knowledge articles', { error });
            throw new AppError('Knowledge article extraction failed', 500);
        }
    }
    async extractFromRegulatoryUpdates() {
        logger.info('Extracting articles from regulatory updates');
        const stats = {
            totalProcessed: 0,
            articlesExtracted: 0,
            duplicatesSkipped: 0,
            errorsEncountered: 0,
            sourcesProcessed: ['regulatory_updates']
        };
        try {
            const updates = await this.storage.getAllRegulatoryUpdates();
            stats.totalProcessed = updates.length;
            for (const update of updates) {
                try {
                    const extracted = this.extractArticleFromRegulatoryUpdate(update);
                    if (extracted) {
                        const isDuplicate = await this.checkForDuplicate(extracted);
                        if (!isDuplicate) {
                            await this.createKnowledgeArticle(extracted);
                            stats.articlesExtracted++;
                            logger.debug('Created knowledge article from regulatory update', {
                                title: extracted.title,
                                source: extracted.source
                            });
                        }
                        else {
                            stats.duplicatesSkipped++;
                        }
                    }
                }
                catch (error) {
                    stats.errorsEncountered++;
                    logger.warn('Failed to process regulatory update', {
                        updateId: update.id,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            return stats;
        }
        catch (error) {
            logger.error('Failed to extract from regulatory updates', { error });
            throw new DatabaseError('Failed to fetch regulatory updates', 'getAllRegulatoryUpdates');
        }
    }
    async extractFromLegalCases() {
        logger.info('Extracting articles from legal cases');
        const stats = {
            totalProcessed: 0,
            articlesExtracted: 0,
            duplicatesSkipped: 0,
            errorsEncountered: 0,
            sourcesProcessed: ['legal_cases']
        };
        try {
            const legalCases = await this.storage.getAllLegalCases();
            stats.totalProcessed = legalCases.length;
            for (const legalCase of legalCases) {
                try {
                    const extracted = this.extractArticleFromLegalCase(legalCase);
                    if (extracted) {
                        const isDuplicate = await this.checkForDuplicate(extracted);
                        if (!isDuplicate) {
                            await this.createKnowledgeArticle(extracted);
                            stats.articlesExtracted++;
                            logger.debug('Created knowledge article from legal case', {
                                title: extracted.title,
                                source: extracted.source
                            });
                        }
                        else {
                            stats.duplicatesSkipped++;
                        }
                    }
                }
                catch (error) {
                    stats.errorsEncountered++;
                    logger.warn('Failed to process legal case', {
                        caseId: legalCase.id,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            return stats;
        }
        catch (error) {
            logger.error('Failed to extract from legal cases', { error });
            throw new DatabaseError('Failed to fetch legal cases', 'getAllLegalCases');
        }
    }
    extractArticleFromRegulatoryUpdate(update) {
        if (!update.title) {
            return null;
        }
        const link = update.source_url || `https://example.com/regulatory/${update.id}`;
        return {
            title: this.cleanTitle(update.title),
            link: link,
            source: update.source || 'Regulatory Authority',
            sourceType: 'regulatory',
            category: this.categorizeRegulatoryUpdate(update),
            region: update.region || 'Global',
            extractedAt: new Date()
        };
    }
    extractArticleFromLegalCase(legalCase) {
        if (!legalCase.title) {
            return null;
        }
        const link = this.constructLegalCaseLink(legalCase);
        return {
            title: this.cleanTitle(legalCase.title),
            link: link,
            source: legalCase.court,
            sourceType: 'legal',
            category: this.categorizeLegalCase(legalCase),
            region: legalCase.jurisdiction,
            extractedAt: new Date()
        };
    }
    cleanTitle(title) {
        return title
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-\(\)\[\].,;:!?]/g, '')
            .substring(0, 200);
    }
    categorizeRegulatoryUpdate(update) {
        const title = update.title.toLowerCase();
        const type = (update.update_type || '').toLowerCase();
        if (title.includes('software') || title.includes('samd')) {
            return 'Software & Digital Health';
        }
        else if (title.includes('clinical') || title.includes('trial')) {
            return 'Clinical Trials';
        }
        else if (title.includes('quality') || title.includes('iso')) {
            return 'Quality Management';
        }
        else if (type.includes('guidance')) {
            return 'Regulatory Guidance';
        }
        else if (type.includes('standard')) {
            return 'Standards & Compliance';
        }
        else {
            return 'General Regulatory';
        }
    }
    categorizeLegalCase(legalCase) {
        const title = legalCase.title.toLowerCase();
        const issues = (legalCase.keywords || []).join(' ').toLowerCase();
        if (title.includes('patent') || issues.includes('patent')) {
            return 'Patent Law';
        }
        else if (title.includes('product liability') || issues.includes('liability')) {
            return 'Product Liability';
        }
        else if (title.includes('regulatory') || issues.includes('fda')) {
            return 'Regulatory Compliance';
        }
        else if (title.includes('antitrust') || issues.includes('competition')) {
            return 'Antitrust & Competition';
        }
        else {
            return 'General Legal';
        }
    }
    constructLegalCaseLink(legalCase) {
        if (legalCase.document_url) {
            return legalCase.document_url;
        }
        const searchQuery = encodeURIComponent(`${legalCase.court} ${legalCase.case_number || legalCase.caseNumber || legalCase.id}`);
        return `https://www.google.com/search?q=${searchQuery}`;
    }
    async checkForDuplicate(extracted) {
        try {
            const existingArticles = await this.storage.getAllKnowledgeArticles();
            return existingArticles.some(article => article.title === extracted.title ||
                (extracted.link && extracted.link !== '' &&
                    article.content && article.content.includes(extracted.link)));
        }
        catch (error) {
            logger.warn('Failed to check for duplicates', { error });
            return false;
        }
    }
    async createKnowledgeArticle(extracted) {
        const articleContent = this.generateArticleContent(extracted);
        await this.storage.addKnowledgeArticle({
            title: extracted.title,
            content: articleContent,
            category: extracted.category,
            tags: this.generateTags(extracted),
            author: 'System - Automated Extraction',
            isPublished: false
        });
    }
    generateArticleContent(extracted) {
        return `# ${extracted.title}

**Quelle:** ${extracted.source}  
**Region:** ${extracted.region}  
**Typ:** ${extracted.sourceType === 'regulatory' ? 'Regulatorisches Update' : 'Rechtsfall'}  
**Kategorie:** ${extracted.category}  
**Extrahiert am:** ${extracted.extractedAt.toLocaleDateString('de-DE')}

## Originalquelle
[Zum Originaldokument](${extracted.link})

## Zusammenfassung
*Dieser Artikel wurde automatisch aus den Datenquellen extrahiert und erfordert eine manuelle Überprüfung und Ergänzung.*

---
*Automatisch generiert am ${extracted.extractedAt.toISOString()}*`;
    }
    generateTags(extracted) {
        const tags = [
            extracted.sourceType,
            extracted.region,
            extracted.category,
            'auto-extracted',
            'needs-review'
        ];
        const title = extracted.title.toLowerCase();
        if (title.includes('software'))
            tags.push('software');
        if (title.includes('clinical'))
            tags.push('clinical-trials');
        if (title.includes('fda'))
            tags.push('fda');
        if (title.includes('ema'))
            tags.push('ema');
        if (title.includes('mhra'))
            tags.push('mhra');
        if (title.includes('guidance'))
            tags.push('guidance');
        if (title.includes('recall'))
            tags.push('recall');
        return Array.from(new Set(tags));
    }
    mergeStats(target, source) {
        target.totalProcessed += source.totalProcessed || 0;
        target.articlesExtracted += source.articlesExtracted || 0;
        target.duplicatesSkipped += source.duplicatesSkipped || 0;
        target.errorsEncountered += source.errorsEncountered || 0;
        target.sourcesProcessed.push(...(source.sourcesProcessed || []));
    }
    async extractFromSpecificSources(sourceIds) {
        logger.info('Extracting articles from specific sources', { sourceIds });
        const stats = {
            totalProcessed: 0,
            articlesExtracted: 0,
            duplicatesSkipped: 0,
            errorsEncountered: 0,
            sourcesProcessed: sourceIds
        };
        return await this.extractArticlesFromAllSources();
    }
}
//# sourceMappingURL=knowledge-extraction.service.js.map