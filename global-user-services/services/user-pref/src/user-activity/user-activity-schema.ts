

import { gql } from "apollo-server-express";

export const userActivityTypeDefs = gql`
scalar JSON

  type UserActivity {
    id: ID!
    uuid: String!
    data: JSON
    updatedBy: String!
  }
 

  type Query {
    getUserActivity(uuid: String!): [UserActivity]
  }
`;