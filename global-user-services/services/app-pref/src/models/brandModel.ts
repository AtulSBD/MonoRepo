import mongoose, { Document, Schema } from "mongoose";


export interface IBrand extends Document {
  _id: string;
  name: string;
}

const brandSchema = new Schema<IBrand>(
  {
    _id: { type: String, required: true }, 
    name: { type: String, required: true },
  },
  {
    collection: "brand", 
    timestamps: false, 
  }
);


const Brand = mongoose.model<IBrand>("Brand", brandSchema);
export default Brand;