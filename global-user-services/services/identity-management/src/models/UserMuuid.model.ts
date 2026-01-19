import mongoose, { Document, Schema, Types } from 'mongoose';
 
export interface IUser extends Document {
  MUUID: string;
  userId: string;
  createdOrder?: number;
}

const UserSchema: Schema = new Schema({
  MUUID: { type: String, required: true, index: true },
  userId: { type: String, required: true},
  createdOrder: { type: Number, default: 1 }
}, { versionKey: false });



export const User = mongoose.model<IUser>('user', UserSchema, 'user');
 
/////////////////////////////////////////////////////////////////////////////////////////
export interface IUserProductAgg extends Document {
  MUUID: string;
  uuid?: string;
  brandId: string;
  regionId: string;
  tool_usage?: string[];
  company?: string;
  source?: string;
  websiteMemberAccountType?: string;
}
 
const UserProductAggSchema: Schema = new Schema({
  MUUID: { type: String, required: true },
  uuid: { type: String },
  brandId: { type: String },
  regionId: { type: String },
  tool_usage: { type: [String]},
  company: { type: String},
  source: { type: String },
  websiteMemberAccountType: { type: String }
},{versionKey:false});
 
export const UserProductAgg = mongoose.model<IUserProductAgg>('userProductAgg', UserProductAggSchema,'userProductAgg');
 
/////////////////////////////////////////////////////////////////////////////////////////////
export interface IUserPref extends Document {
  uuid?: string;
  userId: string;
  brandId: string;
  regionId: string;
  source: string;
  websiteMemberAccountType: string;
}

const UserPrefSchema: Schema = new Schema({
  uuid: { type: String },
  userId: {type: String },
  market: { type: String },
  brandId: { type: String },
  regionId: { type: String },
  source: { type: String },
  websiteMemberAccountType: { type: String }
},{versionKey:false});
 
export const UserPref = mongoose.model<IUserPref>('userPref', UserPrefSchema,'userPref');
 

/////////////////////////////////////////////////////////////////////////////////////


export interface IUserRegisteredProduct extends Document {
  uuid: string;
  sku: string;
  registerDate: number;
  regionId: string;
  brandId: string;
  appId: string;
  marketId: string;
  // warranties: {
  //   createdDate: number;
  //   isDeleted: boolean;
  //   updatedDate: number;
  // }[];
}


// const WarrantySchema: Schema = new Schema({
//   createdDate: { type: Number, required: true },
//   isDeleted: { type: Boolean, required: true },
//   updatedDate: { type: Number, required: true }
// }, { _id: false });

const UserRegisteredProductSchema: Schema = new Schema({
  uuid: { type: String, required: true },
  sku: { type: String, required: true },
  registerDate: { type: Number, required: true },
  regionId: { type: String, required: true },
  brandId: { type: String, required: true },
  appId: { type: String, required: false, default: '' },
  marketId: { type: String, required: true },
  // warranties: { type: [WarrantySchema], required: false, default: [] }
}, { versionKey: false });

export const UserRegisteredProduct = mongoose.model<IUserRegisteredProduct>(
  'userProductRegister',
  UserRegisteredProductSchema,
  'userProductRegister'
);

export interface IMarket extends Document {
  _id: Types.ObjectId;
  name: string;
  regionId: string;
  languages: string[];
}

const MarketSchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  regionId: { type: String, required: true },
  languages: [{ type: String, required: true }]
}, { versionKey: false });

export const Market = mongoose.model<IMarket>('market', MarketSchema, 'market');


export interface IRegion extends Document {
  _id: Types.ObjectId;
}
const RegionSchema: Schema = new Schema({
  _id: { type: String, required: true },
 });

export const Region = mongoose.model<IRegion>('region', RegionSchema, 'region');