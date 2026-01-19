import multer from "multer";
import path from "path";
 
// Configure storage (optional, can store in memory)
const storage = multer.memoryStorage();
 
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (path.extname(file.originalname) !== ".json") {
    return cb(new Error("Only .json files are allowed!"), false);
  }
  cb(null, true);
};
 
// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});
 
export default upload;
 