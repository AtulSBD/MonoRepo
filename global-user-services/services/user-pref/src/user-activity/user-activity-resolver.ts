import { Db } from 'mongodb';
import { UserActivityService } from './user-activity-service';
import { UserActivity } from './user-activity-model';


export const userActivityResolvers = {
  Query: {
    getUserActivity: async (_: any, { uuid }: { uuid: string }, { db }: { db: any }) => {
      const service = new UserActivityService(db);
      const activities = await service.getUserActivity(uuid);

      return activities.map((activity: any) => ({
        ...activity,
        id: activity._id.toString(),
      }));
    },
  },
};