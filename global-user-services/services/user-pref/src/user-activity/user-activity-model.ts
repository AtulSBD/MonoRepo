import { ObjectId } from "mongodb"; 

export interface UserActivity {
  id?: ObjectId;
  uuid: string;
  data: Record<string, any>;
  updatedBy: string;
}