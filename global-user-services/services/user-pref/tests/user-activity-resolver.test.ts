import { userActivityResolvers } from '../src/user-activity/user-activity-resolver'; // adjust path
import { UserActivityService } from '../src/user-activity/user-activity-service';

jest.mock('../src/user-activity/user-activity-service');


describe('userActivityResolvers.Query.getUserActivity', () => {
  const mockUUID = 'user-123';
  const mockDB = {};
  const mockActivities = [
    { _id: { toString: () => 'abc123' }, action: 'login', timestamp: '2023-01-01' },
    { _id: { toString: () => 'def456' }, action: 'logout', timestamp: '2023-01-02' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user activities with id field', async () => {
    const getUserActivityMock = jest.fn().mockResolvedValue(mockActivities);

    // Mock the constructor to return an object with the mocked method
    (UserActivityService as jest.Mock).mockImplementation(() => ({
      getUserActivity: getUserActivityMock,
    }));

    const result = await userActivityResolvers.Query.getUserActivity(
      {},
      { uuid: mockUUID },
      { db: mockDB }
    );

    expect(result).toEqual([
      { _id: mockActivities[0]._id, action: 'login', timestamp: '2023-01-01', id: 'abc123' },
      { _id: mockActivities[1]._id, action: 'logout', timestamp: '2023-01-02', id: 'def456' },
    ]);

    expect(UserActivityService).toHaveBeenCalledWith(mockDB);
    expect(getUserActivityMock).toHaveBeenCalledWith(mockUUID);
  });
});

