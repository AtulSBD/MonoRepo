import { gql } from "apollo-server-express";

export const ConfigTypeDefs = gql`
  type Config {
    _id: ID
    configId: String!
    desc: String!
    appId: String!
    brandId: String!
    regionId: String!
    marketId:String
    locale:String
    env: String!
    settings: [ConfigSetting!]!
    group: String
  }

  type ConfigSetting {
    k: String!
    v: String!
  }

  input ConfigInput {
    configId: String!
    desc: String!
    appId: String!
    brandId: String!
    regionId: String!
    marketId:String
    locale:String
    env: String!
    settings: [ConfigSettingInput!]!
    group: String
  }

  input ConfigSettingInput {
    k: String!
    v: String!
  }

  type Query {
    configs(
      configId: String
      appId: String
      brandId: String
      regionId: String
      marketId:String
      locale:String
      env: String
      pgSize: Int
      pgIndex: Int
    ): [Config]
  }

  type Mutation {
    createOrUpdateConfig(input: [ConfigInput]!): String
  }
`;