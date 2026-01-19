import mongoose from "mongoose";
 
export const validateLocale = async (locale: string): Promise<boolean> => {
  try {
    const result = await mongoose.connection.db
      .collection("market")
      .findOne({ languages: { $in: [locale.trim()] } });
 
    return !!result;
  } catch (error) {
    return false;
  }
};