export const legacyUserProductRegisterColl = "legacyUserProductRegister";
export const userRegisteredProductsColl = "userProductRegister";
export const brandColl = "brand";
export const appMapColl = "appMap";
export const marketColl = "market";
export const REGISTER_PRODUCT_MUTATION = `
mutation MigrateLegacyProducts($input: MigrateLegacyProductInput!) {
  migrateLegacyProducts(input: $input) {
    migratedCount
    message
  }
}

`;


