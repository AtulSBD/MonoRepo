import { Router, Request, Response } from "express";
import { userController } from "../controllers/user.controller";

const router = Router();
const UserController = new userController();
// Get user details
router.post("/", UserController.getUserData);

//* getting user data by muuid */
router.post("/get-user-by-muuid", UserController.getUserByMuuid);

// Update user details
router.put("/updateprofile", UserController.updateUserData);

// Update user details by muuid,brandId and regionId
router.put("/update-user-by-muuid", UserController.updateUserDataByMuuid)

//  Update user details
router.post("/user-details", UserController.getUserDetails)

export default router;