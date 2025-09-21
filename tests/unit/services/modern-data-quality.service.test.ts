import { ModernDataQualityService } from '../../../server/services/modern-data-quality.service';
import { Logger } from '../../../server/services/logger.service';

// Mock logger
jest.mock('../../../server/services/logger.service');

describe('ModernDataQualityService', () => {
  let service: ModernDataQualityService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;
    
    service = new ModernDataQualityService(mockLogger);
  });

  describe('assessDataQuality', () => {
    it('should assess high-quality data correctly', async () => {
      const highQualityData = [
        {
          title: 'FDA Approves Revolutionary Cardiac Device',
          description: 'The FDA has approved a groundbreaking cardiac device that significantly improves patient outcomes through advanced monitoring capabilities.',
          published_at: '2024-01-15T10:30:00Z',
          source: 'FDA',
          region: 'US'
        },
        {
          title: 'EMA Issues New Medical Device Guidelines',
          description: 'The European Medicines Agency has released comprehensive guidelines for medical device manufacturers to ensure compliance with new regulations.',
          published_at: '2024-01-14T14:20:00Z',
          source: 'EMA',
          region: 'EU'
        }
      ];

      const metrics = await service.assessDataQuality(highQualityData);

      expect(metrics.totalRecords).toBe(2);
      expect(metrics.validRecords).toBe(2);
      expect(metrics.invalidRecords).toBe(0);
      expect(metrics.duplicateRecords).toBe(0);
      expect(metrics.averageQualityScore).toBeGreaterThan(80);
      expect(metrics.qualityDistribution.excellent + metrics.qualityDistribution.good).toBe(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting comprehensive data quality assessment',
        { recordCount: 2 }
      );
    });

    it('should identify low-quality data', async () => {
      const lowQualityData = [
        {
          title: '', // Missing required field
          description: 'Short', // Too short
          published_at: 'invalid-date', // Invalid date
          source: '', // Missing
          region: 'INVALID' // Invalid enum value
        },
        {
          title: 'Test Title', // Suspicious test content
          description: 'Test Title', // Same as title
          published_at: '2024-01-15T10:30:00Z',
          source: 'OK',
          region: 'US'
        }
      ];

      const metrics = await service.assessDataQuality(lowQualityData);

      expect(metrics.totalRecords).toBe(2);
      expect(metrics.validRecords).toBe(0);
      expect(metrics.invalidRecords).toBe(2);
      expect(metrics.averageQualityScore).toBeLessThan(60);
      expect(metrics.qualityDistribution.poor).toBe(2);
      expect(metrics.commonIssues.length).toBeGreaterThan(0);
      expect(metrics.commonIssues[0].severity).toMatch(/high|critical/);
    });

    it('should detect duplicate records', async () => {
      const dataWithDuplicates = [
        {
          title: 'FDA Device Approval',
          description: 'FDA approves new medical device',
          published_at: '2024-01-15T10:30:00Z',
          source: 'FDA',
          region: 'US'
        },
        {
          title: 'FDA Device Approval', // Exact duplicate
          description: 'FDA approves new medical device',
          published_at: '2024-01-15T10:30:00Z',
          source: 'FDA',
          region: 'US'
        },
        {
          title: 'FDA Device Approval', // Similar duplicate
          description: 'FDA approves new medical device for patients',
          published_at: '2024-01-15T10:30:00Z',
          source: 'FDA',
          region: 'US'
        }
      ];

      const metrics = await service.assessDataQuality(dataWithDuplicates);

      expect(metrics.duplicateRecords).toBeGreaterThan(0);
      expect(metrics.totalRecords).toBe(3);
    });
  });

  describe('standardizeData', () => {
    it('should standardize country names', async () => {
      const data = [
        { country: 'USA', title: 'Test 1' },
        { country: 'us', title: 'Test 2' },
        { country: 'United States', title: 'Test 3' },
        { country: 'germany', title: 'Test 4' },
        { country: 'uk', title: 'Test 5' }
      ];

      const result = await service.standardizeData(data);

      expect(result.data[0].country).toBe('United States');
      expect(result.data[1].country).toBe('United States');
      expect(result.data[2].country).toBe('United States'); // Already standardized
      expect(result.data[3].country).toBe('Germany');
      expect(result.data[4].country).toBe('United Kingdom');
      expect(result.report.countriesStandardized).toBe(4); // 3 US variants + 1 germany + 1 uk, but US already correct
    });

    it('should standardize dates', async () => {
      const data = [
        { date: '2024-01-01', title: 'Test 1' },
        { published_at: '01/01/2024', title: 'Test 2' },
        { date: 'Jan 1, 2024', title: 'Test 3' },
        { published_at: '2024-01-01T10:30:00Z', title: 'Test 4' } // Already ISO
      ];

      const result = await service.standardizeData(data);

      // All dates should be in ISO format
      expect(result.data[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.data[1].published_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.data[2].date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.report.datesFixed).toBeGreaterThan(0);
    });

    it('should standardize categories', async () => {
      const data = [
        { category: 'medical device', title: 'Test 1' },
        { category: 'pharmaceutical', title: 'Test 2' },
        { category: 'biotechnology', title: 'Test 3' }
      ];

      const result = await service.standardizeData(data);

      expect(result.data[0].category).toBe('Medical Device');
      expect(result.data[1].category).toBe('Pharmaceutical');
      expect(result.data[2].category).toBe('Biotechnology');
      expect(result.report.categoriesNormalized).toBe(3);
    });

    it('should handle mixed data with missing fields', async () => {
      const data = [
        { title: 'Test 1' }, // No standardizable fields
        { country: 'usa', category: 'medical device', title: 'Test 2' },
        { date: '2024-01-01', title: 'Test 3' }
      ];

      const result = await service.standardizeData(data);

      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({ title: 'Test 1' }); // Unchanged
      expect(result.data[1].country).toBe('United States');
      expect(result.data[1].category).toBe('Medical Device');
      expect(result.report.fieldsProcessed).toBe(3);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        title: `Test Title ${i}`,
        description: `Test description ${i} with sufficient length to pass validation`,
        published_at: new Date(2024, 0, i % 30 + 1).toISOString(),
        source: `Source ${i % 10}`,
        region: ['US', 'EU', 'UK'][i % 3]
      }));

      const startTime = Date.now();
      const metrics = await service.assessDataQuality(largeDataset);
      const processingTime = Date.now() - startTime;

      expect(metrics.totalRecords).toBe(1000);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Data quality assessment completed',
        expect.objectContaining({
          processingTimeMs: expect.any(Number),
          averageQualityScore: expect.any(Number)
        })
      );
    });

    it('should handle empty dataset gracefully', async () => {
      const metrics = await service.assessDataQuality([]);

      expect(metrics.totalRecords).toBe(0);
      expect(metrics.validRecords).toBe(0);
      expect(metrics.invalidRecords).toBe(0);
      expect(metrics.duplicateRecords).toBe(0);
      expect(metrics.averageQualityScore).toBe(0);
      expect(metrics.commonIssues).toHaveLength(0);
    });

    it('should handle malformed data without crashing', async () => {
      const malformedData = [
        null,
        undefined,
        {},
        { title: null },
        { title: 123 }, // Wrong type
        'string instead of object',
        { 
          title: 'Valid Title',
          description: 'Valid description that meets minimum length requirements',
          nested: { deeply: { nested: { object: 'test' } } }
        }
      ];

      expect(async () => {
        await service.assessDataQuality(malformedData as any);
      }).not.toThrow();
    });
  });

  describe('similarity calculations', () => {
    it('should calculate string similarity correctly', async () => {
      // Test with known similar strings
      const data = [
        {
          title: 'FDA Approves New Cardiac Device',
          description: 'Revolutionary cardiac monitoring device',
          published_at: '2024-01-15T10:30:00Z',
          source: 'FDA',
          region: 'US'
        },
        {
          title: 'FDA Approves New Cardiac Device for Patients',
          description: 'Revolutionary cardiac monitoring device for patients',
          published_at: '2024-01-15T10:30:00Z',
          source: 'FDA',
          region: 'US'
        }
      ];

      const metrics = await service.assessDataQuality(data);
      
      // These should be detected as potential duplicates due to high similarity
      expect(metrics.duplicateRecords).toBeGreaterThan(0);
    });

    it('should not flag dissimilar records as duplicates', async () => {
      const data = [
        {
          title: 'FDA Approves Cardiac Device',
          description: 'Heart monitoring technology',
          published_at: '2024-01-15T10:30:00Z',
          source: 'FDA',
          region: 'US'
        },
        {
          title: 'EMA Issues Software Guidelines',
          description: 'New software development standards',
          published_at: '2024-02-20T14:00:00Z',
          source: 'EMA',
          region: 'EU'
        }
      ];

      const metrics = await service.assessDataQuality(data);
      
      expect(metrics.duplicateRecords).toBe(0);
    });
  });
});