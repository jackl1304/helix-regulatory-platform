import { Logger } from './logger.service';

export interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  averageQualityScore: number;
  qualityDistribution: {
    excellent: number; // 90-100
    good: number;      // 70-89
    fair: number;      // 50-69
    poor: number;      // 0-49
  };
  commonIssues: Array<{
    issue: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'email' | 'url' | 'enum';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enumValues?: string[];
  customValidator?: (value: any) => boolean;
}

export interface DuplicateDetectionConfig {
  titleSimilarityThreshold: number;
  contentSimilarityThreshold: number;
  dateToleranceDays: number;
  fields: string[];
}

export interface StandardizationConfig {
  countries: Record<string, string>;
  dateFormats: string[];
  categories: Record<string, string>;
}

class ModernDataQualityService {
  private logger: Logger;
  private validationRules: ValidationRule[] = [];
  private standardizationConfig: StandardizationConfig;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('DataQualityService');
    this.standardizationConfig = this.getDefaultStandardizationConfig();
    this.initializeValidationRules();
  }

  /**
   * Comprehensive data quality assessment
   */
  async assessDataQuality(data: any[]): Promise<DataQualityMetrics> {
    const startTime = Date.now();
    this.logger.info('Starting comprehensive data quality assessment', { 
      recordCount: data.length 
    });

    const results = await Promise.all([
      this.validateAllRecords(data),
      this.detectDuplicates(data),
      this.calculateQualityScores(data)
    ]);

    const [validationResults, duplicates, qualityScores] = results;
    const metrics = this.generateMetrics(data, validationResults, duplicates, qualityScores);

    const processingTime = Date.now() - startTime;
    this.logger.info('Data quality assessment completed', { 
      processingTimeMs: processingTime,
      averageQualityScore: metrics.averageQualityScore
    });

    return metrics;
  }

  /**
   * Validate all records against defined rules
   */
  private async validateAllRecords(data: any[]): Promise<Array<{ record: any; isValid: boolean; errors: string[] }>> {
    return data.map(record => {
      const errors: string[] = [];
      
      for (const rule of this.validationRules) {
        const fieldValue = record[rule.field];
        
        // Check if required field is missing
        if (rule.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
          errors.push(`Field '${rule.field}' is required but missing`);
          continue;
        }

        // Skip validation if field is not required and empty
        if (!rule.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
          continue;
        }

        // Type validation
        if (!this.validateFieldType(fieldValue, rule)) {
          errors.push(`Field '${rule.field}' has invalid type. Expected ${rule.type}`);
        }

        // Length validation
        if (rule.minLength && typeof fieldValue === 'string' && fieldValue.length < rule.minLength) {
          errors.push(`Field '${rule.field}' is too short. Minimum length: ${rule.minLength}`);
        }

        if (rule.maxLength && typeof fieldValue === 'string' && fieldValue.length > rule.maxLength) {
          errors.push(`Field '${rule.field}' is too long. Maximum length: ${rule.maxLength}`);
        }

        // Pattern validation
        if (rule.pattern && typeof fieldValue === 'string' && !rule.pattern.test(fieldValue)) {
          errors.push(`Field '${rule.field}' does not match required pattern`);
        }

        // Enum validation
        if (rule.enumValues && !rule.enumValues.includes(fieldValue)) {
          errors.push(`Field '${rule.field}' has invalid value. Allowed values: ${rule.enumValues.join(', ')}`);
        }

        // Custom validation
        if (rule.customValidator && !rule.customValidator(fieldValue)) {
          errors.push(`Field '${rule.field}' failed custom validation`);
        }
      }

      return {
        record,
        isValid: errors.length === 0,
        errors
      };
    });
  }

  /**
   * Detect duplicate records using multiple strategies
   */
  private async detectDuplicates(data: any[]): Promise<Array<{ indices: number[]; similarity: number; type: string }>> {
    const duplicates: Array<{ indices: number[]; similarity: number; type: string }> = [];
    
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const record1 = data[i];
        const record2 = data[j];

        // Exact match detection
        if (this.isExactMatch(record1, record2)) {
          duplicates.push({
            indices: [i, j],
            similarity: 1.0,
            type: 'exact'
          });
          continue;
        }

        // Fuzzy match detection
        const similarity = this.calculateSimilarity(record1, record2);
        if (similarity > 0.85) {
          duplicates.push({
            indices: [i, j],
            similarity,
            type: 'fuzzy'
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Calculate quality scores for all records
   */
  private async calculateQualityScores(data: any[]): Promise<number[]> {
    return data.map(record => {
      let score = 100;
      let penalties = 0;

      // Check completeness
      const requiredFields = this.validationRules.filter(rule => rule.required).map(rule => rule.field);
      const missingFields = requiredFields.filter(field => !record[field] || record[field] === '');
      penalties += missingFields.length * 15;

      // Check data quality indicators
      if (record.title && record.title.length < 10) penalties += 10;
      if (record.description && record.description.length < 50) penalties += 10;
      if (record.published_at && !this.isValidDate(record.published_at)) penalties += 15;
      if (record.source && record.source.length < 3) penalties += 10;

      // Check for suspicious patterns
      if (record.title && /test|sample|example/i.test(record.title)) penalties += 20;
      if (record.description && record.description === record.title) penalties += 15;

      return Math.max(0, score - penalties);
    });
  }

  /**
   * Generate comprehensive metrics
   */
  private generateMetrics(
    data: any[], 
    validationResults: Array<{ record: any; isValid: boolean; errors: string[] }>,
    duplicates: Array<{ indices: number[]; similarity: number; type: string }>,
    qualityScores: number[]
  ): DataQualityMetrics {
    const validRecords = validationResults.filter(result => result.isValid).length;
    const invalidRecords = data.length - validRecords;
    const duplicateRecords = duplicates.reduce((count, dup) => count + dup.indices.length, 0);
    const averageQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

    const qualityDistribution = {
      excellent: qualityScores.filter(score => score >= 90).length,
      good: qualityScores.filter(score => score >= 70 && score < 90).length,
      fair: qualityScores.filter(score => score >= 50 && score < 70).length,
      poor: qualityScores.filter(score => score < 50).length
    };

    const commonIssues = this.extractCommonIssues(validationResults);

    return {
      totalRecords: data.length,
      validRecords,
      invalidRecords,
      duplicateRecords,
      averageQualityScore,
      qualityDistribution,
      commonIssues
    };
  }

  /**
   * Standardize data formats
   */
  async standardizeData(data: any[]): Promise<{ data: any[]; report: any }> {
    const report = {
      countriesStandardized: 0,
      datesFixed: 0,
      categoriesNormalized: 0,
      fieldsProcessed: 0
    };

    const standardizedData = data.map(record => {
      const standardized = { ...record };
      
      // Standardize countries
      if (standardized.country) {
        const normalizedCountry = this.standardizationConfig.countries[standardized.country.toLowerCase()];
        if (normalizedCountry && normalizedCountry !== standardized.country) {
          standardized.country = normalizedCountry;
          report.countriesStandardized++;
        }
      }

      // Standardize dates
      if (standardized.date || standardized.published_at) {
        const dateField = standardized.date || standardized.published_at;
        const standardizedDate = this.standardizeDate(dateField);
        if (standardizedDate) {
          if (standardized.date) standardized.date = standardizedDate;
          if (standardized.published_at) standardized.published_at = standardizedDate;
          report.datesFixed++;
        }
      }

      // Standardize categories
      if (standardized.category) {
        const normalizedCategory = this.standardizationConfig.categories[standardized.category.toLowerCase()];
        if (normalizedCategory && normalizedCategory !== standardized.category) {
          standardized.category = normalizedCategory;
          report.categoriesNormalized++;
        }
      }

      report.fieldsProcessed++;
      return standardized;
    });

    return { data: standardizedData, report };
  }

  // Helper methods
  private validateFieldType(value: any, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'date':
        return this.isValidDate(value);
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        return typeof value === 'string' && /^https?:\/\/.+/.test(value);
      case 'enum':
        return rule.enumValues?.includes(value) || false;
      default:
        return true;
    }
  }

  private isValidDate(dateString: any): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private isExactMatch(record1: any, record2: any): boolean {
    return JSON.stringify(record1) === JSON.stringify(record2);
  }

  private calculateSimilarity(record1: any, record2: any): number {
    let totalWeight = 0;
    let matchWeight = 0;

    // Title similarity (high weight)
    if (record1.title && record2.title) {
      totalWeight += 40;
      const titleSim = this.stringSimilarity(record1.title, record2.title);
      matchWeight += titleSim * 40;
    }

    // Content similarity (medium weight)
    if (record1.description && record2.description) {
      totalWeight += 30;
      const contentSim = this.stringSimilarity(record1.description, record2.description);
      matchWeight += contentSim * 30;
    }

    // Date similarity (low weight)
    if (record1.published_at && record2.published_at) {
      totalWeight += 20;
      const dateSim = this.dateSimilarity(record1.published_at, record2.published_at);
      matchWeight += dateSim * 20;
    }

    // Source similarity (low weight)
    if (record1.source && record2.source) {
      totalWeight += 10;
      const sourceSim = record1.source === record2.source ? 1 : 0;
      matchWeight += sourceSim * 10;
    }

    return totalWeight > 0 ? matchWeight / totalWeight : 0;
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private dateSimilarity(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (!this.isValidDate(d1) || !this.isValidDate(d2)) return 0;
    
    const diffMs = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffDays === 0) return 1;
    if (diffDays <= 7) return 0.8;
    if (diffDays <= 30) return 0.5;
    return 0;
  }

  private standardizeDate(dateString: any): string | null {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (!this.isValidDate(date)) return null;
    
    return date.toISOString();
  }

  private extractCommonIssues(validationResults: Array<{ record: any; isValid: boolean; errors: string[] }>): Array<{ issue: string; count: number; severity: 'low' | 'medium' | 'high' | 'critical' }> {
    const issueMap = new Map<string, number>();
    
    validationResults.forEach(result => {
      result.errors.forEach(error => {
        issueMap.set(error, (issueMap.get(error) || 0) + 1);
      });
    });

    const issues = Array.from(issueMap.entries())
      .map(([issue, count]) => ({
        issue,
        count,
        severity: this.determineSeverity(issue, count, validationResults.length)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 issues

    return issues;
  }

  private determineSeverity(issue: string, count: number, totalRecords: number): 'low' | 'medium' | 'high' | 'critical' {
    const percentage = (count / totalRecords) * 100;
    
    if (percentage >= 50) return 'critical';
    if (percentage >= 25) return 'high';
    if (percentage >= 10) return 'medium';
    return 'low';
  }

  private initializeValidationRules(): void {
    this.validationRules = [
      {
        field: 'title',
        required: true,
        type: 'string',
        minLength: 5,
        maxLength: 500
      },
      {
        field: 'description',
        required: false,
        type: 'string',
        minLength: 10,
        maxLength: 10000
      },
      {
        field: 'published_at',
        required: false,
        type: 'date'
      },
      {
        field: 'source',
        required: false,
        type: 'string',
        minLength: 2,
        maxLength: 100
      },
      {
        field: 'region',
        required: false,
        type: 'enum',
        enumValues: ['US', 'EU', 'UK', 'CA', 'AU', 'JP', 'Global']
      }
    ];
  }

  private getDefaultStandardizationConfig(): StandardizationConfig {
    return {
      countries: {
        'usa': 'United States',
        'us': 'United States',
        'united states': 'United States',
        'america': 'United States',
        'uk': 'United Kingdom',
        'britain': 'United Kingdom',
        'england': 'United Kingdom',
        'germany': 'Germany',
        'deutschland': 'Germany',
        'canada': 'Canada',
        'ca': 'Canada'
      },
      dateFormats: [
        'YYYY-MM-DD',
        'MM/DD/YYYY',
        'DD/MM/YYYY',
        'YYYY/MM/DD'
      ],
      categories: {
        'medical device': 'Medical Device',
        'pharmaceutical': 'Pharmaceutical',
        'biotechnology': 'Biotechnology',
        'diagnostics': 'Diagnostics',
        'digital health': 'Digital Health'
      }
    };
  }
}

export { ModernDataQualityService };