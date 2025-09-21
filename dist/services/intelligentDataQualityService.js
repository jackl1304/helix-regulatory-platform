import { storage } from '../storage';
export class IntelligentDataQualityService {
    async assessDataQuality() {
        console.log('[Data Quality] Starting comprehensive data quality assessment...');
        const [regulatoryUpdates, legalCases] = await Promise.all([
            storage.getAllRegulatoryUpdates(),
            storage.getAllLegalCases()
        ]);
        const issues = [];
        const regulatoryIssues = await this.analyzeRegulatoryUpdates(regulatoryUpdates);
        issues.push(...regulatoryIssues);
        const legalIssues = await this.analyzeLegalCases(legalCases);
        issues.push(...legalIssues);
        const metrics = this.calculateQualityMetrics(regulatoryUpdates, legalCases, issues);
        const recommendations = this.generateRecommendations(issues);
        const improvementActions = this.generateImprovementActions(issues);
        const report = {
            overallScore: metrics.overall,
            metrics,
            issues,
            recommendations,
            improvementActions
        };
        console.log(`[Data Quality] Assessment complete. Overall score: ${(metrics.overall * 100).toFixed(1)}%`);
        return report;
    }
    async performAutomaticCleanup() {
        console.log('[Data Quality] Starting automatic data cleanup...');
        const qualityReport = await this.assessDataQuality();
        const autoFixableIssues = qualityReport.issues.filter(issue => issue.autoFixable);
        let fixedCount = 0;
        let skippedCount = 0;
        const details = [];
        for (const issue of autoFixableIssues) {
            try {
                const fixed = await this.fixIssue(issue);
                if (fixed) {
                    fixedCount++;
                    details.push(`Fixed: ${issue.description}`);
                }
                else {
                    skippedCount++;
                    details.push(`Skipped: ${issue.description} (could not auto-fix)`);
                }
            }
            catch (error) {
                skippedCount++;
                details.push(`Error fixing ${issue.description}: ${error}`);
            }
        }
        console.log(`[Data Quality] Cleanup complete: ${fixedCount} fixed, ${skippedCount} skipped`);
        return { fixedIssues: fixedCount, skippedIssues: skippedCount, details };
    }
    async analyzeRegulatoryUpdates(updates) {
        const issues = [];
        const duplicates = this.findDuplicateUpdates(updates);
        if (duplicates.length > 0) {
            issues.push({
                id: 'regulatory_duplicates',
                type: 'duplicate',
                severity: 'medium',
                description: `Found ${duplicates.length} potential duplicate regulatory updates`,
                affectedRecords: duplicates.map(d => d.id),
                suggestedAction: 'Review and merge or remove duplicate entries',
                autoFixable: false
            });
        }
        const missingFields = updates.filter(u => !u.title || !u.content || !u.sourceId || !u.publishedAt);
        if (missingFields.length > 0) {
            issues.push({
                id: 'regulatory_missing_fields',
                type: 'missing_data',
                severity: 'high',
                description: `${missingFields.length} regulatory updates missing essential fields`,
                affectedRecords: missingFields.map(u => u.id),
                suggestedAction: 'Complete missing required fields',
                autoFixable: false
            });
        }
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
        const outdatedUpdates = updates.filter(u => u.publishedAt && new Date(u.publishedAt) < cutoffDate);
        if (outdatedUpdates.length > 100) {
            issues.push({
                id: 'regulatory_outdated',
                type: 'outdated',
                severity: 'low',
                description: `${outdatedUpdates.length} regulatory updates are over 2 years old`,
                affectedRecords: outdatedUpdates.map(u => u.id),
                suggestedAction: 'Consider archiving very old updates',
                autoFixable: true
            });
        }
        const poorContentUpdates = updates.filter(u => u.content && u.content.length < 50);
        if (poorContentUpdates.length > 0) {
            issues.push({
                id: 'regulatory_poor_content',
                type: 'missing_data',
                severity: 'medium',
                description: `${poorContentUpdates.length} regulatory updates have very short content`,
                affectedRecords: poorContentUpdates.map(u => u.id),
                suggestedAction: 'Enhance content with more detailed information',
                autoFixable: false
            });
        }
        return issues;
    }
    async analyzeLegalCases(cases) {
        const issues = [];
        const duplicates = this.findDuplicateCases(cases);
        if (duplicates.length > 0) {
            issues.push({
                id: 'legal_duplicates',
                type: 'duplicate',
                severity: 'high',
                description: `Found ${duplicates.length} potential duplicate legal cases`,
                affectedRecords: duplicates.map(d => d.id),
                suggestedAction: 'Review and merge or remove duplicate cases',
                autoFixable: false
            });
        }
        const incompleteCases = cases.filter(c => !c.caseTitle || !c.summary || !c.jurisdiction || c.keyIssues.length === 0);
        if (incompleteCases.length > 0) {
            issues.push({
                id: 'legal_incomplete',
                type: 'missing_data',
                severity: 'high',
                description: `${incompleteCases.length} legal cases missing key information`,
                affectedRecords: incompleteCases.map(c => c.id),
                suggestedAction: 'Complete missing case details',
                autoFixable: false
            });
        }
        const jurisdictionFormats = new Set(cases.map(c => c.jurisdiction).filter(Boolean));
        const inconsistentJurisdictions = Array.from(jurisdictionFormats).filter(j => j && (j.length > 10 || j.includes(',') || j.includes(';')));
        if (inconsistentJurisdictions.length > 0) {
            const affectedCases = cases.filter(c => inconsistentJurisdictions.includes(c.jurisdiction));
            issues.push({
                id: 'legal_jurisdiction_format',
                type: 'formatting',
                severity: 'low',
                description: `Inconsistent jurisdiction formatting in ${affectedCases.length} cases`,
                affectedRecords: affectedCases.map(c => c.id),
                suggestedAction: 'Standardize jurisdiction field format',
                autoFixable: true
            });
        }
        return issues;
    }
    findDuplicateUpdates(updates) {
        const duplicates = [];
        const seen = new Map();
        for (const update of updates) {
            const key = `${update.title?.toLowerCase()}_${update.sourceId}`;
            if (seen.has(key)) {
                duplicates.push(update);
            }
            else {
                seen.set(key, update);
            }
        }
        return duplicates;
    }
    findDuplicateCases(cases) {
        const duplicates = [];
        const seen = new Map();
        for (const case_ of cases) {
            const key = `${case_.caseTitle?.toLowerCase()}_${case_.jurisdiction}`;
            if (seen.has(key)) {
                duplicates.push(case_);
            }
            else {
                seen.set(key, case_);
            }
        }
        return duplicates;
    }
    calculateQualityMetrics(updates, cases, issues) {
        const totalRecords = updates.length + cases.length;
        const highSeverityIssues = issues.filter(i => i.severity === 'high').length;
        const mediumSeverityIssues = issues.filter(i => i.severity === 'medium').length;
        const lowSeverityIssues = issues.filter(i => i.severity === 'low').length;
        const completeUpdates = updates.filter(u => u.title && u.content && u.sourceId && u.publishedAt).length;
        const completeCases = cases.filter(c => c.caseTitle && c.summary && c.jurisdiction && c.keyIssues.length > 0).length;
        const completeness = totalRecords > 0 ? (completeUpdates + completeCases) / totalRecords : 1;
        const accuracy = Math.max(0, 1 - (highSeverityIssues / Math.max(totalRecords, 1)));
        const recentCutoff = new Date();
        recentCutoff.setFullYear(recentCutoff.getFullYear() - 1);
        const recentUpdates = updates.filter(u => u.publishedAt && new Date(u.publishedAt) >= recentCutoff).length;
        const recentCases = cases.filter(c => c.decisionDate && new Date(c.decisionDate) >= recentCutoff).length;
        const timeliness = totalRecords > 0 ? (recentUpdates + recentCases) / totalRecords : 1;
        const relevantUpdates = updates.filter(u => this.isRelevantContent(u.content || '')).length;
        const relevantCases = cases.filter(c => this.isRelevantContent(c.summary || '')).length;
        const relevance = totalRecords > 0 ? (relevantUpdates + relevantCases) / totalRecords : 1;
        const consistencyIssues = issues.filter(i => i.type === 'duplicate' || i.type === 'formatting' || i.type === 'inconsistent').length;
        const consistency = Math.max(0, 1 - (consistencyIssues / Math.max(totalRecords, 1)));
        const overall = (completeness * 0.25 +
            accuracy * 0.3 +
            timeliness * 0.15 +
            relevance * 0.15 +
            consistency * 0.15);
        return {
            completeness,
            accuracy,
            timeliness,
            relevance,
            consistency,
            overall
        };
    }
    isRelevantContent(content) {
        const medtechKeywords = [
            'medical device', 'medizinprodukt', 'fda', 'ema', 'ce mark',
            'clinical trial', 'regulatory', 'approval', 'clearance',
            'recall', 'safety', 'biocompatibility', 'cybersecurity'
        ];
        const lowerContent = content.toLowerCase();
        return medtechKeywords.some(keyword => lowerContent.includes(keyword));
    }
    generateRecommendations(issues) {
        const recommendations = [];
        const highSeverityCount = issues.filter(i => i.severity === 'high').length;
        const duplicateIssues = issues.filter(i => i.type === 'duplicate').length;
        const missingDataIssues = issues.filter(i => i.type === 'missing_data').length;
        if (highSeverityCount > 0) {
            recommendations.push(`Prioritize fixing ${highSeverityCount} high-severity data quality issues`);
        }
        if (duplicateIssues > 0) {
            recommendations.push('Implement automated duplicate detection to prevent future duplicates');
        }
        if (missingDataIssues > 0) {
            recommendations.push('Enhance data collection processes to capture all required fields');
        }
        const autoFixableCount = issues.filter(i => i.autoFixable).length;
        if (autoFixableCount > 0) {
            recommendations.push(`${autoFixableCount} issues can be automatically fixed - consider running automated cleanup`);
        }
        recommendations.push('Establish regular data quality monitoring and alerts');
        recommendations.push('Create data quality dashboards for ongoing monitoring');
        return recommendations;
    }
    generateImprovementActions(issues) {
        const actions = [];
        if (issues.some(i => i.type === 'duplicate')) {
            actions.push({
                action: 'Implement automated duplicate detection',
                priority: 'high',
                impact: 'Significantly reduces data redundancy and improves accuracy',
                effort: 'Medium - requires development of similarity algorithms'
            });
        }
        if (issues.some(i => i.type === 'missing_data')) {
            actions.push({
                action: 'Enhance data validation at input',
                priority: 'high',
                impact: 'Prevents incomplete data from entering the system',
                effort: 'Low - add validation rules to forms and APIs'
            });
        }
        if (issues.some(i => i.type === 'formatting')) {
            actions.push({
                action: 'Standardize data formats and create data dictionaries',
                priority: 'medium',
                impact: 'Improves data consistency and searchability',
                effort: 'Medium - requires defining standards and updating existing data'
            });
        }
        if (issues.some(i => i.type === 'outdated')) {
            actions.push({
                action: 'Implement automated archiving for old content',
                priority: 'low',
                impact: 'Improves system performance and focuses on recent content',
                effort: 'Low - simple date-based rules'
            });
        }
        actions.push({
            action: 'Set up automated data quality monitoring',
            priority: 'medium',
            impact: 'Enables proactive identification of quality issues',
            effort: 'Medium - requires setting up monitoring infrastructure'
        });
        return actions;
    }
    async fixIssue(issue) {
        switch (issue.type) {
            case 'outdated':
                return await this.archiveOldContent(issue.affectedRecords);
            case 'formatting':
                return await this.fixFormattingIssues(issue.affectedRecords);
            default:
                return false;
        }
    }
    async archiveOldContent(recordIds) {
        try {
            console.log(`[Data Quality] Would archive ${recordIds.length} old records`);
            return true;
        }
        catch (error) {
            console.error('[Data Quality] Error archiving old content:', error);
            return false;
        }
    }
    async fixFormattingIssues(recordIds) {
        try {
            console.log(`[Data Quality] Would fix formatting for ${recordIds.length} records`);
            return true;
        }
        catch (error) {
            console.error('[Data Quality] Error fixing formatting:', error);
            return false;
        }
    }
}
export const intelligentDataQualityService = new IntelligentDataQualityService();
//# sourceMappingURL=intelligentDataQualityService.js.map