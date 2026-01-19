import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { userCollection } from "../types/coll-constants";


// For letter use
export async function getOrCreateMuuid(userId: string): Promise<string> {
    try {
        const User = await mongoose.connection.collection(userCollection);
        const id = new ObjectId();
        const MUUID = id.toHexString();
        const result = await User.findOneAndUpdate({ userId }, { $set: { MUUID, userId } }, { upsert: true, returnDocument: "after" });
        if (!result) {
            throw new Error("Failed to find or create MUUID");
        }
        return result.MUUID;
    } catch (error) {
        console.log("Failed to find or create MUUID", error)
        throw error;
    }
}
export const APP_IDS = { AIC: "AIC", TD: "TD" }
export const dateToEpochTD = (date: Date): string => {
    return Math.floor(date.getTime() / 1000).toString();
};