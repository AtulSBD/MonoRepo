import mongoose from 'mongoose';
import { validateLocale } from '../src/utils/validateLocale';


describe('validateLocale', () => {
  const mockFindOne = jest.fn();

  beforeAll(() => {
    // Safely mock the entire db chain
    (mongoose.connection as any).db = {
      collection: jest.fn(() => ({
        findOne: mockFindOne,
      })),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true if locale exists in market collection', async () => {
    mockFindOne.mockResolvedValue({ _id: 'IN', languages: ['en-IN'] });

    const result = await validateLocale('en-IN');
    expect(result).toBe(true);
    expect(mockFindOne).toHaveBeenCalledWith({ languages: { $in: ['en-IN'] } });
  });

  it('should return false if locale does not exist', async () => {
    mockFindOne.mockResolvedValue(null);

    const result = await validateLocale('fr-FR');
    expect(result).toBe(false);
  });

  it('should return false if an error occurs during DB query', async () => {
    mockFindOne.mockRejectedValue(new Error('DB error'));

    const result = await validateLocale('en-US');
    expect(result).toBe(false);
  });
});

