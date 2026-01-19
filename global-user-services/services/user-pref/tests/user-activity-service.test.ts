import { UserActivityService } from '../src/user-activity/user-activity-service';
import { MongoClient, Db, ObjectId } from 'mongodb';
 

describe('UserActivityService', () => {
  let mockCollection: any;
  let mockDB: any;
  let service: UserActivityService;

  beforeEach(() => {
    mockCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn(),
      }),
    };

    mockDB = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    service = new UserActivityService(mockDB);
  });

  it('should throw error if uuid is missing', async () => {
    await expect(service.getUserActivity('')).rejects.toThrow('uuid is required');
  });

  it('should throw error if no activities are found', async () => {
    mockCollection.find().toArray.mockResolvedValue([]);

    await expect(service.getUserActivity('user-123')).rejects.toThrow(
      'No activities found for uuid: user-123'
    );
  });

  it('should return activities if found', async () => {
    const mockActivities = [
      { _id: '1', uuid: 'user-123', action: 'login' },
      { _id: '2', uuid: 'user-123', action: 'logout' },
    ];

    mockCollection.find().toArray.mockResolvedValue(mockActivities);

    const result = await service.getUserActivity('user-123');

    expect(mockDB.collection).toHaveBeenCalledWith('userPrefActivityLog');
    expect(mockCollection.find).toHaveBeenCalledWith({ uuid: 'user-123' });
    expect(result).toEqual(mockActivities);
  });
});
