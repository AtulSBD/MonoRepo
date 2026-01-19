
import { getOrCreateMuuid, getUserByUUID, linkMuuidWithAggressiveDetails, handleNewsletterSignup, updateEmail } from '../src/Utils/userMuuid';
import { User, UserProductAgg } from '../src/models/UserMuuid.model';

jest.mock('../src/models/UserMuuid.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn()
  },
  UserProductAgg: {
    aggregate: jest.fn(),
    create: jest.fn()
  }
}));

describe('getOrCreateMuuid', () => {
  it('should return existing MUUID if user exists', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({ MUUID: 'existing-muuid' });
    const result = await getOrCreateMuuid('user@example.com');
    expect(result).toBe('existing-muuid');
  });

  it('should create and return new MUUID if user does not exist', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User.create as jest.Mock).mockResolvedValue({});
    const result = await getOrCreateMuuid('newuser@example.com');
    expect(result).toMatch(/^[a-f0-9]{24}$/); // ObjectId hex string
  });
});

describe('getUserByUUID', () => {
  it('should return user data if aggregation returns result', async () => {
    const mockUser = [{ muuid: 'muuid123', uuid: 'uuid123', email: 'user@example.com' }];
    (UserProductAgg.aggregate as jest.Mock).mockResolvedValue(mockUser);
    const result = await getUserByUUID('uuid123');
    expect(result).toEqual(mockUser[0]);
  });

  it('should return null if aggregation returns empty', async () => {
    (UserProductAgg.aggregate as jest.Mock).mockResolvedValue([]);
    const result = await getUserByUUID('uuid123');
    expect(result).toBeUndefined();
  });
});

describe('linkMuuidWithAggressiveDetails', () => {
  it('should create aggressive details without error', async () => {
    (UserProductAgg.create as jest.Mock).mockResolvedValue({});
    await expect(linkMuuidWithAggressiveDetails({
      MUUID: 'muuid123',
      uuid: 'uuid123',
      brandId: 'CM',
      regionId: 'NA',
      tool_usage: ["test"]
    })).resolves.toBeUndefined();
  });

  it('should handle error during creation gracefully', async () => {
    (UserProductAgg.create as jest.Mock).mockRejectedValue(new Error('Create error'));
    await expect(linkMuuidWithAggressiveDetails({
      MUUID: 'muuid123',
      uuid: 'uuid123',
      brandId: 'CM',
      regionId: 'NA',
      tool_usage: ['test']
    })).resolves.toBeUndefined();
  });
});

describe('handleNewsletterSignup', () => {
  it('should return MUUID from getOrCreateMuuid', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({ MUUID: 'newsletter-muuid' });
    const result = await handleNewsletterSignup('user@example.com');
    expect(result).toBe('newsletter-muuid');
  });
});

describe('updateEmail', () => {
  it('should not create new email if already exists', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({ MUUID: 'muuid123', userId: 'new@example.com' });
    const result = await updateEmail('muuid123', 'new@example.com');
    expect(result).toBeUndefined();
  });

  it('should create new email if not exists', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User.countDocuments as jest.Mock).mockResolvedValue(1);
    (User.create as jest.Mock).mockResolvedValue({});
    const result = await updateEmail('muuid123', 'new@example.com');
    expect(User.create).toHaveBeenCalledWith({
      MUUID: 'muuid123',
      userId: 'new@example.com',
      createdOrder: 2
    });
  });
});
