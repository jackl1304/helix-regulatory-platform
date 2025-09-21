export class EnhancedLegalAnalysisService {
    constructor() {
        this.themes = [
            {
                id: "product_liability",
                name: "Produkthaftung bei Medizinprodukten",
                description: "Haftung des Herstellers für Schäden durch defekte Medizinprodukte",
                keywords: ["product liability", "defective device", "manufacturer liability", "Produkthaftung", "Herstellerhaftung"],
                relatedCases: [],
                precedentValue: "high",
                jurisdiction: ["US", "EU", "DE", "UK"],
                category: "Liability"
            },
            {
                id: "regulatory_compliance",
                name: "Regulatorische Compliance-Verletzungen",
                description: "Verstöße gegen FDA, EMA oder andere regulatorische Anforderungen",
                keywords: ["FDA violation", "regulatory breach", "compliance failure", "EMA non-compliance", "Zulassungsverstoß"],
                relatedCases: [],
                precedentValue: "high",
                jurisdiction: ["US", "EU", "DE", "UK", "CH"],
                category: "Regulatory"
            },
            {
                id: "clinical_trial_issues",
                name: "Klinische Studien und Ethik",
                description: "Probleme bei klinischen Studien, Einverständnis, Ethikkommissionen",
                keywords: ["clinical trial", "informed consent", "ethics committee", "klinische Studie", "Aufklärung"],
                relatedCases: [],
                precedentValue: "medium",
                jurisdiction: ["US", "EU", "DE", "UK", "CH"],
                category: "Clinical"
            },
            {
                id: "patent_ip",
                name: "Patente und geistiges Eigentum",
                description: "Patentstreitigkeiten, Lizenzierung, geistiges Eigentum bei Medizinprodukten",
                keywords: ["patent infringement", "intellectual property", "licensing", "Patentverletzung", "Lizenzierung"],
                relatedCases: [],
                precedentValue: "medium",
                jurisdiction: ["US", "EU", "DE", "UK", "CH"],
                category: "IP"
            },
            {
                id: "market_access",
                name: "Marktzugang und Erstattung",
                description: "Streitigkeiten um Marktzulassung, Preisgestaltung, Erstattung",
                keywords: ["market access", "reimbursement", "pricing", "Marktzugang", "Erstattung"],
                relatedCases: [],
                precedentValue: "medium",
                jurisdiction: ["US", "EU", "DE", "UK", "CH"],
                category: "Market Access"
            },
            {
                id: "data_privacy",
                name: "Datenschutz und Medizindaten",
                description: "GDPR/DSGVO Compliance, Patientendatenschutz, Cybersecurity",
                keywords: ["GDPR", "DSGVO", "data protection", "patient privacy", "Datenschutz"],
                relatedCases: [],
                precedentValue: "high",
                jurisdiction: ["EU", "DE", "UK", "CH"],
                category: "Privacy"
            },
            {
                id: "ai_ml_devices",
                name: "KI/ML-basierte Medizinprodukte",
                description: "Rechtliche Fragen zu künstlicher Intelligenz und maschinellem Lernen",
                keywords: ["artificial intelligence", "machine learning", "AI device", "KI-Medizinprodukt", "algorithm"],
                relatedCases: [],
                precedentValue: "high",
                jurisdiction: ["US", "EU", "DE", "UK"],
                category: "AI/ML"
            }
        ];
    }
    async analyzeLegalCases(cases) {
        console.log(`[Enhanced Legal Analysis] Analyzing ${cases.length} legal cases for themes and relationships...`);
        const analysis = {
            themes: [],
            relationships: [],
            precedentChains: [],
            conflictingDecisions: []
        };
        for (const theme of this.themes) {
            const relatedCases = this.findCasesForTheme(cases, theme);
            if (relatedCases.length > 0) {
                theme.relatedCases = relatedCases.map(c => c.id);
                analysis.themes.push({
                    ...theme,
                    relatedCases: theme.relatedCases
                });
            }
        }
        analysis.relationships = this.findCaseRelationships(cases);
        analysis.precedentChains = this.buildPrecedentChains(cases, analysis.relationships);
        analysis.conflictingDecisions = this.findConflictingDecisions(cases, analysis.themes);
        console.log(`[Enhanced Legal Analysis] Analysis complete: ${analysis.themes.length} themes, ${analysis.relationships.length} relationships`);
        return analysis;
    }
    async analyzeLegalTrends(cases, timeframe = 'yearly') {
        console.log(`[Enhanced Legal Analysis] Analyzing legal trends (${timeframe})...`);
        const cutoffDate = new Date();
        if (timeframe === 'quarterly') {
            cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        }
        else {
            cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        }
        const recentCases = cases.filter(c => new Date(c.decisionDate || c.filingDate) >= cutoffDate);
        const trends = {
            emergingTrends: this.identifyEmergingTrends(recentCases),
            jurisdictionActivity: this.analyzeJurisdictionActivity(recentCases),
            riskPatterns: this.identifyRiskPatterns(recentCases),
            litigationTypes: this.analyzeLitigationTypes(recentCases),
            preventiveRecommendations: this.generatePreventiveRecommendations(recentCases)
        };
        console.log(`[Enhanced Legal Analysis] Trend analysis complete for ${recentCases.length} recent cases`);
        return trends;
    }
    findCasesForTheme(cases, theme) {
        return cases.filter(case_ => {
            const searchText = `${case_.caseTitle} ${case_.summary} ${case_.keyIssues.join(' ')}`.toLowerCase();
            return theme.keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
        });
    }
    findCaseRelationships(cases) {
        const relationships = [];
        for (let i = 0; i < cases.length; i++) {
            for (let j = i + 1; j < cases.length; j++) {
                const case1 = cases[i];
                const case2 = cases[j];
                const relationship = this.analyzeCaseRelationship(case1, case2);
                if (relationship.strength > 0.3) {
                    relationships.push(relationship);
                }
            }
        }
        return relationships.sort((a, b) => b.strength - a.strength);
    }
    analyzeCaseRelationship(case1, case2) {
        let strength = 0;
        let relationshipType = 'similar_facts';
        let explanation = '';
        const commonIssues = case1.keyIssues.filter(issue => case2.keyIssues.some(issue2 => issue.toLowerCase().includes(issue2.toLowerCase()) ||
            issue2.toLowerCase().includes(issue.toLowerCase())));
        strength += commonIssues.length * 0.2;
        if (case1.summary.toLowerCase().includes(case2.caseTitle.toLowerCase()) ||
            case2.summary.toLowerCase().includes(case1.caseTitle.toLowerCase())) {
            relationshipType = 'citing';
            strength += 0.4;
            explanation = 'One case cites the other as precedent';
        }
        if (case1.legalBasis && case2.legalBasis) {
            const basis1 = case1.legalBasis.toLowerCase();
            const basis2 = case2.legalBasis.toLowerCase();
            if (basis1.includes(basis2) || basis2.includes(basis1)) {
                strength += 0.3;
                explanation = explanation || 'Cases share similar legal basis';
            }
        }
        if (commonIssues.length > 0 && case1.outcome !== case2.outcome) {
            relationshipType = 'conflicting';
            strength += 0.2;
            explanation = 'Cases have conflicting outcomes on similar issues';
        }
        const date1 = new Date(case1.decisionDate || case1.filingDate);
        const date2 = new Date(case2.decisionDate || case2.filingDate);
        const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff < 365) {
            strength += 0.1;
        }
        return {
            caseId1: case1.id,
            caseId2: case2.id,
            relationshipType,
            strength: Math.min(strength, 1.0),
            explanation: explanation || 'Cases share common legal themes'
        };
    }
    buildPrecedentChains(cases, relationships) {
        const chains = [];
        const themeGroups = new Map();
        for (const theme of this.themes) {
            const themeCases = this.findCasesForTheme(cases, theme);
            if (themeCases.length > 1) {
                themeGroups.set(theme.name, themeCases.sort((a, b) => new Date(a.decisionDate || a.filingDate).getTime() -
                    new Date(b.decisionDate || b.filingDate).getTime()));
            }
        }
        for (const [themeName, themeCases] of themeGroups) {
            if (themeCases.length >= 2) {
                chains.push({
                    theme: themeName,
                    cases: themeCases.map(c => c.id),
                    development: this.analyzeLegalDevelopment(themeCases)
                });
            }
        }
        return chains;
    }
    findConflictingDecisions(cases, themes) {
        const conflicts = [];
        for (const theme of themes) {
            const themeCases = this.findCasesForTheme(cases, theme);
            const outcomeGroups = new Map();
            for (const case_ of themeCases) {
                const outcome = case_.outcome || 'unknown';
                if (!outcomeGroups.has(outcome)) {
                    outcomeGroups.set(outcome, []);
                }
                outcomeGroups.get(outcome).push(case_);
            }
            if (outcomeGroups.size > 1) {
                const conflictCases = [];
                for (const [outcome, casesWithOutcome] of outcomeGroups) {
                    for (const case_ of casesWithOutcome) {
                        conflictCases.push({
                            caseId: case_.id,
                            position: outcome,
                            jurisdiction: case_.jurisdiction
                        });
                    }
                }
                if (conflictCases.length > 1) {
                    conflicts.push({
                        issue: theme.name,
                        cases: conflictCases
                    });
                }
            }
        }
        return conflicts;
    }
    identifyEmergingTrends(cases) {
        const trendKeywords = [
            'artificial intelligence', 'machine learning', 'cybersecurity', 'data protection',
            'telemedicine', 'digital health', 'remote monitoring', 'blockchain',
            'software as medical device', 'algorithm bias', 'privacy by design'
        ];
        const trends = new Map();
        for (const case_ of cases) {
            const caseText = `${case_.caseTitle} ${case_.summary} ${case_.keyIssues.join(' ')}`.toLowerCase();
            for (const keyword of trendKeywords) {
                if (caseText.includes(keyword.toLowerCase())) {
                    trends.set(keyword, (trends.get(keyword) || 0) + 1);
                }
            }
        }
        return Array.from(trends.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([trend]) => trend);
    }
    analyzeJurisdictionActivity(cases) {
        const activity = {};
        for (const case_ of cases) {
            const jurisdiction = case_.jurisdiction || 'Unknown';
            activity[jurisdiction] = (activity[jurisdiction] || 0) + 1;
        }
        return activity;
    }
    identifyRiskPatterns(cases) {
        const riskIndicators = [
            'class action', 'punitive damages', 'regulatory violation',
            'criminal charges', 'injunctive relief', 'recall',
            'death', 'serious injury', 'FDA warning letter'
        ];
        const patterns = new Map();
        for (const case_ of cases) {
            const caseText = `${case_.caseTitle} ${case_.summary}`.toLowerCase();
            for (const indicator of riskIndicators) {
                if (caseText.includes(indicator.toLowerCase())) {
                    patterns.set(indicator, (patterns.get(indicator) || 0) + 1);
                }
            }
        }
        return Array.from(patterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([pattern]) => pattern);
    }
    analyzeLitigationTypes(cases) {
        const types = {};
        for (const case_ of cases) {
            const caseType = case_.caseType || 'Other';
            types[caseType] = (types[caseType] || 0) + 1;
        }
        return types;
    }
    generatePreventiveRecommendations(cases) {
        const recommendations = [];
        const commonIssues = new Map();
        for (const case_ of cases) {
            for (const issue of case_.keyIssues) {
                commonIssues.set(issue, (commonIssues.get(issue) || 0) + 1);
            }
        }
        const topIssues = Array.from(commonIssues.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        for (const [issue] of topIssues) {
            if (issue.toLowerCase().includes('cybersecurity')) {
                recommendations.push('Implementierung robuster Cybersecurity-Maßnahmen für alle vernetzten Medizinprodukte');
            }
            else if (issue.toLowerCase().includes('clinical trial')) {
                recommendations.push('Verstärkung der Aufklärungs- und Einverständnisprozesse bei klinischen Studien');
            }
            else if (issue.toLowerCase().includes('product liability')) {
                recommendations.push('Verbesserung der Qualitätssicherung und Post-Market-Surveillance');
            }
            else if (issue.toLowerCase().includes('data protection')) {
                recommendations.push('GDPR-konforme Datenverarbeitung und Privacy-by-Design-Ansätze');
            }
            else {
                recommendations.push(`Verstärkte Compliance-Maßnahmen bezüglich: ${issue}`);
            }
        }
        return recommendations;
    }
    analyzeLegalDevelopment(cases) {
        if (cases.length < 2)
            return 'Insufficient data for development analysis';
        const firstCase = cases[0];
        const lastCase = cases[cases.length - 1];
        const developments = [];
        if (firstCase.outcome !== lastCase.outcome) {
            developments.push(`Rechtsprechung hat sich von "${firstCase.outcome}" zu "${lastCase.outcome}" entwickelt`);
        }
        return developments.join('. ') || 'Konsistente Rechtsprechung über den Zeitraum';
    }
}
export const enhancedLegalAnalysisService = new EnhancedLegalAnalysisService();
//# sourceMappingURL=enhancedLegalAnalysisService.js.map