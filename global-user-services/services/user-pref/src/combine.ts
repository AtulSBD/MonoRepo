import { configResolvers } from "./config/config-resolver";
import { ConfigTypeDefs } from "./config/config-schema";
import { userPrefResolvers } from "./user-pref/user-pref-resolver";
import { UserPrefTypeDefs } from "./user-pref/user-pref-schema";

export const resolvers = [userPrefResolvers, configResolvers];
export const typeDefs = [UserPrefTypeDefs, ConfigTypeDefs];