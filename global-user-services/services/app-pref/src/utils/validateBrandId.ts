import Brand from "../models/brandModel";

export const validateBrandId = async (brandId: string) => {
  const brand = await Brand.findOne({ _id: brandId }); 
  return !!brand; 
}