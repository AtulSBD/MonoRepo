import { v4 as uuidv4 } from 'uuid';
import { User, UserProductAgg } from '../models/UserMuuid.model';
import { IUser, IUserProductAgg } from '../models/UserMuuid.model';
import {ObjectId} from 'mongodb'; 
import { PipelineStage } from 'mongoose';
interface EnsureMuuidInput {
  userId: string;
  brandId: string;
  regionId: string;
}
 
interface LinkAggressiveInput {
  MUUID: string;
  uuid?: string;
  brandId: string;
  regionId: string;
  tool_usage?: string[];
  company?: string;
  source?: string;
  websiteMemberAccountType?: string;
}
 
/**
 * Get or create a muuid based on email.
 * This is used before user registration or newsletter signup.
 */
export async function getOrCreateMuuid(userId: string): Promise<string> {
  let user = await User.findOne({ userId });
 
  if (!user) {
    const id = new ObjectId();
    const MUUID = id.toHexString();
    await User.create({ MUUID, userId });
    return MUUID;
  }
  return user.MUUID;
}

export async function getUserByUUID(uuidValue: string): Promise<any> {
  const pipline: PipelineStage[] = [
  {
    $match: {
      uuid: uuidValue,
    },
  },
  {
    $lookup: {
      from: "user",
      localField: "MUUID",
      foreignField: "MUUID",
      as: "emails",
    },
  },
  { $unwind: "$emails" },
  {
    $sort: { muuid: 1, "emails.createOrder": -1 },
  },
  {
    $group: {
      _id: "$MUUID",
      uuid: { $first: "$uuid" },
      email: { $first: "$emails.userId" },
      createOrder: {
        $first: "$emails.createOrder",
      },
      brandId: { $first: "$brandId" } 
    },
  },
  {
    $project: {
      _id: 0,
      muuid: "$_id",
      uuid: 1,
      email: 1,
      brandId: 1
    },
  },
]
  let user = await UserProductAgg.aggregate(pipline);
 if (!user) {
  return null
 } 
  return user[0];
}
 
/**
 * Link muuid to aggressive details after registration is complete.
 * Called only when uuid is available.
 */
export async function linkMuuidWithAggressiveDetails(input: LinkAggressiveInput): Promise<void> {
  const { MUUID, uuid, brandId, regionId, tool_usage, company, source, websiteMemberAccountType } = input;
 try {
  await UserProductAgg.create({
    MUUID,
    uuid,
    brandId,
    regionId,
    tool_usage,
    company,
    source,
    websiteMemberAccountType
  });
 } catch (error) {
  
 }

}
 
/**
 * Called during newsletter signup to get muuid (no uuid involved).
 */
export async function handleNewsletterSignup(userId: string): Promise<string> {
  const MUUID = await getOrCreateMuuid(userId);
  return MUUID;
}

export async function updateEmail(MUUID: string, newEmail: string): Promise<any> {
  // Check if this email is already associated with the muuid
  const existing = await User.findOne({ MUUID, userId: newEmail });
  if (existing) return; 

  // if (!originalUser) return;
  const count = await User.countDocuments({ MUUID });
  // Create a new user record with the same muuid and new email
  await User.create({
    MUUID,
    userId: newEmail,
    createdOrder: count + 1
  });
}
