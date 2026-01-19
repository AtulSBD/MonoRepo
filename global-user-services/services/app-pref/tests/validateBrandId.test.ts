import { validateBrandId } from '../src/utils/validateBrandId';
import Brand from '../src/models/brandModel';

// Mock the Brand model
jest.mock('../src/models/brandModel');

describe('validateBrandId', () => {
  it('should return true if brand exists', async () => {
    (Brand.findOne as jest.Mock).mockResolvedValue({ _id: 'CM' });

    const result = await validateBrandId('CM');
    expect(result).toBe(true);
    expect(Brand.findOne).toHaveBeenCalledWith({ _id: 'CM' });
  });

  it('should return false if brand does not exist', async () => {
    (Brand.findOne as jest.Mock).mockResolvedValue(null);

    const result = await validateBrandId('INVALID');
    expect(result).toBe(false);
    expect(Brand.findOne).toHaveBeenCalledWith({ _id: 'INVALID' });
  });

  it('should handle errors gracefully', async () => {
    (Brand.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

    await expect(validateBrandId('CM')).rejects.toThrow('DB error');
  });
});
