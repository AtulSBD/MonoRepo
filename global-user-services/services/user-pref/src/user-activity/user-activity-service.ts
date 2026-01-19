import { Db, ObjectId } from "mongodb";
import { UserActivity } from "./user-activity-model";
import { json } from "stream/consumers";
import { error } from "console";

export class UserActivityService {
  private collection;
 
  constructor(db: any) {
    this.collection = db.collection("userPrefActivityLog"); // Ensure collection name is correct
  }
 
  async getUserActivity(uuid: string): Promise<any[]> {
    if (!uuid) {
      throw new Error("uuid is required");
    }
 
    // Fetch user activity based on uuid
    const activities = await this.collection.find({ uuid }).toArray();
    if (!activities.length) {
      throw new Error(`No activities found for uuid: ${uuid}`);
    }
 
    return activities;
  }
}
