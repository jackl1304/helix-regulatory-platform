import { aiService } from "./aiService";
export class AIApprovalService {
    constructor() {
        this.serviceName = "AIApprovalService";
        this.autoApprovalThreshold = 0.85;
        this.seniorReviewThreshold = 0.70;
        this.expertReviewThreshold = 0.50;
    }
    async evaluateRegulatoryUpdate(update) {
        try {
            console.log(`🔍 [AI Approval] Evaluating: ${update.title}`);
            const contentAnalysis = await aiService.analyzeRegulatoryContent(`${update.title} ${update.description || ''}`);
            const qualityMetrics = await this.assessContentQuality(update);
            const riskAssessment = await this.assessContentRisk(update, contentAnalysis);
            const complianceCheck = await this.checkCompliance(update, contentAnalysis);
            const decision = this.makeApprovalDecision(update, contentAnalysis, qualityMetrics, riskAssessment, complianceCheck);
            console.log(`✅ [AI Approval] Decision: ${decision.approved ? 'APPROVED' : 'REJECTED'} (${decision.confidence.toFixed(2)})`);
            return decision;
        }
        catch (error) {
            console.error(`❌ [AI Approval] Error evaluating update ${update.id}:`, error);
            return {
                approved: false,
                confidence: 0,
                reasoning: ['Approval system error - manual review required'],
                requiredActions: ['Technical team investigation needed'],
                reviewLevel: 'expert',
                riskFactors: ['System malfunction'],
                complianceIssues: ['Unable to verify compliance']
            };
        }
    }
    async evaluateLegalCase(legalCase) {
        try {
            console.log(`⚖️ [AI Approval] Evaluating legal case: ${legalCase.title}`);
            const legalAnalysis = await aiService.analyzeLegalCase({
                title: legalCase.title,
                summary: legalCase.summary,
                keyIssues: legalCase.keywords || []
            });
            const relevanceScore = this.assessLegalRelevance(legalCase);
            const precedentValue = legalAnalysis.precedentValue;
            const riskFactors = this.assessLegalRisk(legalCase, legalAnalysis);
            const confidence = this.calculateLegalConfidence(relevanceScore, precedentValue, legalAnalysis);
            let approved = false;
            let reviewLevel = 'expert';
            if (confidence >= this.autoApprovalThreshold && precedentValue === 'high') {
                approved = true;
                reviewLevel = 'auto';
            }
            else if (confidence >= this.seniorReviewThreshold) {
                reviewLevel = 'senior';
            }
            return {
                approved,
                confidence,
                reasoning: [
                    `Precedent value: ${precedentValue}`,
                    `Relevance score: ${relevanceScore.toFixed(2)}`,
                    `Risk assessment: ${legalAnalysis.riskAssessment}`
                ],
                requiredActions: legalAnalysis.actionItems,
                reviewLevel,
                riskFactors,
                complianceIssues: []
            };
        }
        catch (error) {
            console.error(`❌ [AI Approval] Error evaluating legal case:`, error);
            return {
                approved: false,
                confidence: 0,
                reasoning: ['Legal case evaluation failed'],
                requiredActions: ['Manual legal review required'],
                reviewLevel: 'board',
                riskFactors: ['Evaluation system failure'],
                complianceIssues: []
            };
        }
    }
    async assessContentQuality(update) {
        const metrics = {
            contentQuality: 0,
            sourceReliability: 0,
            relevanceScore: 0,
            timeliness: 0,
            overallScore: 0
        };
        metrics.contentQuality = this.evaluateContentQuality(update);
        metrics.sourceReliability = this.evaluateSourceReliability(update.sourceId);
        metrics.relevanceScore = this.evaluateRelevance(update);
        metrics.timeliness = this.evaluateTimeliness(update.publishedAt);
        metrics.overallScore = (metrics.contentQuality * 0.40 +
            metrics.sourceReliability * 0.25 +
            metrics.relevanceScore * 0.20 +
            metrics.timeliness * 0.15);
        return metrics;
    }
    evaluateContentQuality(update) {
        let score = 0.5;
        if (update.title && update.title.length >= 20 && update.title.length <= 200) {
            score += 0.15;
        }
        if (update.description) {
            if (update.description.length >= 100)
                score += 0.15;
            if (update.description.length >= 300)
                score += 0.10;
            const regKeywords = ['regulation', 'compliance', 'approval', 'standard', 'guideline'];
            const foundKeywords = regKeywords.filter(keyword => update.description.toLowerCase().includes(keyword));
            score += Math.min(foundKeywords.length * 0.05, 0.15);
        }
        if (update.categories && update.categories.length > 0) {
            score += 0.10;
        }
        if (update.deviceClasses && update.deviceClasses.length > 0) {
            score += 0.05;
        }
        return Math.min(score, 1.0);
    }
    evaluateSourceReliability(sourceId) {
        const reliabilityMap = {
            'fda_510k': 0.95,
            'fda_recalls': 0.98,
            'ema_epar': 0.90,
            'bfarm_guidelines': 0.85,
            'swissmedic_guidelines': 0.85,
            'mhra_guidance': 0.80,
            'iso_standards': 0.90,
            'iec_standards': 0.85,
            'who_prequalification': 0.75,
            'pmda_japan': 0.80,
            'nmpa_china': 0.70,
            'anvisa_brazil': 0.65
        };
        return reliabilityMap[sourceId] || 0.50;
    }
    evaluateRelevance(update) {
        let score = 0.3;
        const highRelevanceKeywords = [
            'medical device', 'medizinprodukt', 'mdr', 'ivdr', '510k', 'pma',
            'clinical evaluation', 'post-market surveillance', 'cybersecurity'
        ];
        const mediumRelevanceKeywords = [
            'healthcare', 'health technology', 'digital health', 'telemedicine',
            'artificial intelligence', 'machine learning', 'iot device'
        ];
        const content = `${update.title} ${update.description || ''}`.toLowerCase();
        const highMatches = highRelevanceKeywords.filter(keyword => content.includes(keyword));
        score += Math.min(highMatches.length * 0.20, 0.60);
        const mediumMatches = mediumRelevanceKeywords.filter(keyword => content.includes(keyword));
        score += Math.min(mediumMatches.length * 0.10, 0.20);
        if (['US', 'EU', 'DE', 'CH', 'UK'].includes(update.region)) {
            score += 0.10;
        }
        return Math.min(score, 1.0);
    }
    evaluateTimeliness(publishedAt) {
        const now = new Date();
        const ageInDays = (now.getTime() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays <= 7)
            return 1.0;
        if (ageInDays <= 30)
            return 0.8;
        if (ageInDays <= 90)
            return 0.6;
        if (ageInDays <= 180)
            return 0.4;
        if (ageInDays <= 365)
            return 0.2;
        return 0.1;
    }
    async assessContentRisk(update, analysis) {
        const riskFactors = [];
        if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
            riskFactors.push('High-risk device category');
        }
        if (analysis.categories.includes('Safety Alert') || update.updateType === 'recall') {
            riskFactors.push('Safety-critical content');
        }
        if (analysis.categories.includes('AI/ML Technology')) {
            riskFactors.push('Emerging AI/ML technology');
        }
        if (analysis.complianceRequirements.length > 3) {
            riskFactors.push('Complex compliance requirements');
        }
        if (analysis.timelineSensitivity === 'urgent') {
            riskFactors.push('Time-sensitive regulatory change');
        }
        return riskFactors;
    }
    async checkCompliance(update, analysis) {
        const complianceIssues = [];
        if (!update.description || update.description.length < 50) {
            complianceIssues.push('Insufficient content detail');
        }
        if (!update.categories || update.categories.length === 0) {
            complianceIssues.push('Missing content categorization');
        }
        if (!update.deviceClasses || update.deviceClasses.length === 0) {
            complianceIssues.push('Missing device classification');
        }
        if (!update.priority || !['critical', 'high', 'medium', 'low'].includes(update.priority)) {
            complianceIssues.push('Invalid priority assignment');
        }
        if (update.region === 'EU' && !analysis.categories.includes('MDR')) {
            const content = `${update.title} ${update.description}`.toLowerCase();
            if (content.includes('medical device') && !content.includes('mdr')) {
                complianceIssues.push('Potential MDR compliance gap');
            }
        }
        return complianceIssues;
    }
    makeApprovalDecision(update, analysis, quality, riskFactors, complianceIssues) {
        let confidence = quality.overallScore;
        const reasoning = [];
        const requiredActions = [];
        confidence *= analysis.aiConfidenceScore;
        if (riskFactors.length > 0) {
            confidence *= (1 - (riskFactors.length * 0.1));
            reasoning.push(`Risk factors identified: ${riskFactors.length}`);
        }
        if (complianceIssues.length > 0) {
            confidence *= (1 - (complianceIssues.length * 0.15));
            reasoning.push(`Compliance issues: ${complianceIssues.length}`);
            requiredActions.push('Address compliance issues before publication');
        }
        let approved = false;
        let reviewLevel = 'board';
        if (confidence >= this.autoApprovalThreshold && complianceIssues.length === 0) {
            approved = true;
            reviewLevel = 'auto';
            reasoning.push('High confidence, auto-approved');
        }
        else if (confidence >= this.seniorReviewThreshold) {
            reviewLevel = 'senior';
            reasoning.push('Medium confidence, senior review required');
            requiredActions.push('Senior reviewer approval needed');
        }
        else if (confidence >= this.expertReviewThreshold) {
            reviewLevel = 'expert';
            reasoning.push('Lower confidence, expert review required');
            requiredActions.push('Subject matter expert review needed');
        }
        else {
            reviewLevel = 'board';
            reasoning.push('Low confidence, board review required');
            requiredActions.push('Full board review and approval needed');
        }
        reasoning.push(`Quality score: ${quality.overallScore.toFixed(2)}`);
        reasoning.push(`AI confidence: ${analysis.aiConfidenceScore.toFixed(2)}`);
        return {
            approved,
            confidence: Math.max(0, Math.min(1, confidence)),
            reasoning,
            requiredActions,
            reviewLevel,
            riskFactors,
            complianceIssues
        };
    }
    assessLegalRelevance(legalCase) {
        let score = 0.3;
        const content = `${legalCase.title} ${legalCase.summary}`.toLowerCase();
        const medTechKeywords = [
            'medical device', 'implant', 'pacemaker', 'catheter', 'stent',
            'diagnostic device', 'surgical instrument', 'medical software'
        ];
        const foundMedTech = medTechKeywords.filter(keyword => content.includes(keyword));
        score += Math.min(foundMedTech.length * 0.15, 0.45);
        const legalKeywords = [
            'product liability', 'fda violation', 'regulatory compliance',
            'clinical trial', 'informed consent', 'medical malpractice'
        ];
        const foundLegal = legalKeywords.filter(keyword => content.includes(keyword));
        score += Math.min(foundLegal.length * 0.10, 0.30);
        if (legalCase.impactLevel === 'high') {
            score += 0.15;
        }
        else if (legalCase.impactLevel === 'medium') {
            score += 0.10;
        }
        return Math.min(score, 1.0);
    }
    assessLegalRisk(legalCase, analysis) {
        const riskFactors = [];
        if (legalCase.impactLevel === 'high') {
            riskFactors.push('High-impact legal precedent');
        }
        if (analysis.precedentValue === 'high') {
            riskFactors.push('Significant legal precedent value');
        }
        if (analysis.themes.includes('Produkthaftung')) {
            riskFactors.push('Product liability implications');
        }
        if (analysis.themes.includes('Regulatorische Compliance')) {
            riskFactors.push('Regulatory compliance implications');
        }
        return riskFactors;
    }
    calculateLegalConfidence(relevanceScore, precedentValue, analysis) {
        let confidence = relevanceScore * 0.6;
        const precedentWeight = {
            'high': 0.3,
            'medium': 0.2,
            'low': 0.1
        };
        confidence += precedentWeight[precedentValue];
        const relevantThemes = ['Produkthaftung', 'Regulatorische Compliance', 'KI/ML-Geräte'];
        const foundRelevantThemes = analysis.themes.filter((theme) => relevantThemes.includes(theme));
        confidence += Math.min(foundRelevantThemes.length * 0.05, 0.15);
        return Math.min(confidence, 1.0);
    }
    getServiceMetrics() {
        return {
            serviceName: this.serviceName,
            thresholds: {
                autoApproval: this.autoApprovalThreshold,
                seniorReview: this.seniorReviewThreshold,
                expertReview: this.expertReviewThreshold
            },
            version: "2.0.0",
            lastUpdate: new Date()
        };
    }
}
export const aiApprovalService = new AIApprovalService();
//# sourceMappingURL=ai-approval-service.js.map