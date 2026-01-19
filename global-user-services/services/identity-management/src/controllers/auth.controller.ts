import { Request, Response } from "express";
    import axios from "axios";
    import UserLogin from "../models/UserLogin";
    import { handleApiError } from "../Utils/errorHandler";
    import {
        convertGraphQLErrorToPlainString,
        getMarketIdByLanguage,
        validateBrandAndRegion,
        validateConfirmPassword,
        validateEmail,
        validatePassword,
        validateRequiredField,
        APP_IDS,
        getRegionIdValue
    } from "../Utils/shared";
    import {
        validateRequest,
        getUserProfile,
        getAccessTokenByUUID,
        triggerEmailVerification,
        updateEmailPref,
        validateRequestSupport
    } from "../Utils/changeEmailUtil";
    import { errorResponse, successResponse } from "../Utils/responseWrapper";
    import {
        registerWithAIC,
        registerWithIterable,
        registerWithTD,
        sendNonPIIData,
        updateEmailVerifiedStatusToTD,
    } from "../services/auth.service";
    import UserResponse from "../models/UserResponse.model";
    import * as config from "../env";
    import { getMarket } from "../services/lookup.service";
    import { getConfig } from "../services/config.service";
    import {
        getOrCreateMuuid,
        handleNewsletterSignup,
        updateEmail,
    } from "../Utils/userMuuid";
    import { sendLogToNewRelic } from "../Utils/newRelicLogger";
import { sendFullUserDataToTD } from "../Utils/sendAllDataTD";
import { callGraphQL } from "../Utils/graphQlHelper";
import { REGISTER_PRODUCT_MUTATION } from "../Utils/constant";


    export const register = async (req: Request, res: Response): Promise<void> => {
        const { emailAddress, newPassword, newPasswordConfirm } = req.body;

            try {
                // Validate input fields
                const data = req.body;
                data.brand = req.body.brandId
                data.region = req.body.regionId
                validateEmail(emailAddress);
                validatePassword(newPassword);
                validateConfirmPassword(newPassword, newPasswordConfirm);
                validateRequiredField(data);
                await validateBrandAndRegion(data);
                const isValidMarketId = await getMarket(data.market);
                if (!isValidMarketId) {
                    throw new Error("Invalid market Id. Pleasese provide a valid market ID");
                }
                data.brand = req.body.brandId.toUpperCase()
                data.region = req.body.regionId.toUpperCase()

                const regionExists = await getRegionIdValue(data.regionId);
                if (regionExists) {
                    data.websiteMemberAccountType = "Member Account";
                    data.source = "website_create_account";
                }

                //store muuid
                const MUUID = await getOrCreateMuuid(data.emailAddress);
                data.MUUID = MUUID;
                
                // Call registerWithAIC and wait for result
                const result = await new Promise((resolve, reject) => {
                    registerWithAIC(data, (error: any, result: any) => {
                        if (error) {
                            return reject(error);
                        }
                        resolve(result);
                    });
                });

            // // Process the successful result
             data.uuid = (result as any).capture_user.uuid;
             data.updatedDate = (result as any).capture_user.created
             data.createdDate = (result as any).capture_user.created
             data.lastLoginDate = (result as any).capture_user.lastLogin

                // Perform parallel processing
                // migrateLagecyUserDataGPR(data)
                sendNonPIIData(data);

                 try {
                    const input ={
                        emailAddress: data.emailAddress,
                        brandId: data.brandId,
                        regionId: data.regionId,
                        MUUID: data.MUUID
                    }
                    await callGraphQL(REGISTER_PRODUCT_MUTATION, { input });
                } catch (error) {
                    const logs = [
                    {
                        message: "Error while legacy prodcut migration",
                        error: error,
                        timestamp: Date.now(),
                        logtype: "ERROR",
                        service: "UUP",
                        endpoint: "register",
                        emailAddress: `${data?.emailAddress}-${data?.MUUID}`,
                    },
                    ];
                    sendLogToNewRelic(logs);
                }

                const body = {
                        locale: data.locale
                    }
                sendFullUserDataToTD(data.uuid, data.brandId, data.regionId, body)
                // registerWithTD(data, "signup");
                
                /********************************* NewRelic Log Capture :: starts ************************************/
                const logs = [
                    {
                        message: "User has registered successfully.",
                        timestamp: Date.now(),
                        logtype: "INFO",
                        service: "uup",
                        endpoint: "register",
                        emailAddress: data.emailAddress,
                    },
                ];
                sendLogToNewRelic(logs);
                /********************************* NewRelic Log Capture :: ends *************************************/
                // Send final response
                res
                    .status(201)
                    .json(
                        successResponse("Registration successful", { UserId: data.uuid }, 201)
                    );
            } catch (error) {
                // Ensure only one response is sent
                /********************************* NewRelic Log Capture :: starts ************************************/
                const logs = [
                    {
                        message: "User could not be registered successfully.",
                        timestamp: Date.now(),
                        logtype: "INFO",
                        service: "uup",
                        endpoint: "register"  
                    },
                ];
                sendLogToNewRelic(logs);
                /********************************* NewRelic Log Capture :: ends *************************************/
                const ApiError = handleApiError({error});
                if (!res.headersSent) {
                    res.status(ApiError.statusCode).json(ApiError);
                }
            }
        };

    export const login = async (req: Request, res: Response): Promise<any> => {
        const {
            signInEmailAddress,
            signInPassword,
            redirect_uri,
            locale,
            brandId,
            regionId
        } = req.body;
        try {

            await validateBrandAndRegion({ brand: brandId, region: regionId });
            const brand = brandId.toUpperCase();
            const region = regionId.toUpperCase();
            const marketId = await getMarketIdByLanguage(locale);
            const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);
            const newUser = new UserLogin({
                signInEmailAddress,
                currentPassword: signInPassword,
                signInPassword,
                client_id: configData.clientId as string,
                flow: configData.flow as string,
                flow_version: configData.flowVersion as string,
                form: "signInForm",
                locale,
                redirect_uri,
                response_type: "code_and_token",
            });

            const response = await axios.post(
                `${config.baseURL}/oauth/auth_native_traditional` as string,
                newUser
            );
            if (response.data?.stat === "error") {
                const apiError = handleApiError({ response }, "Login failed", 401);
                return res.status(401).json(apiError);
            }
            const { stat, ...responseBody } = response.data;

            if (!responseBody.capture_user.emailVerified) {
                return res
                    .status(202)
                    .json(
                        errorResponse(
                            "Email not verified",
                            202,
                            "Account exists but not activated"
                        )
                    );
            }

        

            const user = new UserResponse(responseBody.capture_user);
            user.authorization_code = responseBody.authorization_code;
            user.access_token = responseBody.access_token;
            
                    
            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "User has logged in successfully.",
                    timestamp: Date.now(),
                    logtype: "INFO",
                    service: "uup",
                    endpoint: "login",
                    signInEmailAddress: user.email,
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            return res.status(200).json(successResponse("Login successful", user)); // response
        } catch (error) {
            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "User is unable to log in",
                    timestamp: Date.now(),
                    logtype: "ERROR",
                    service: "uup",
                    endpoint: "login",
                    errorCode: 400,
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            const apiError = handleApiError({ error }, "Login failed", 400);
            return res.status(400).json(apiError);
        }
    };

    export const refreshToken = async (
        req: Request,
        res: Response
    ): Promise<any> => {
        const { redirect_uri, refresh_token, brandId, regionId,locale } = req.query; // req.query may generate response of several types - not just string
    if (!locale) {
        return res.status(400).json({statusCode: "400",message:"missing arguments locale",errorCode: "missing_argument"});
        }
        try {
            await validateBrandAndRegion({ brand: brandId, region: regionId });
        
            const brand = (brandId as any).toUpperCase();
            const region = (regionId as any).toUpperCase();
            // validateBrandAndRegion({ brand, region });
            //  const configData = getConfig(`${APP_IDS.AIC}_${brandId}_${regionId}`);
            const locale = req.query.locale as string;
            const marketId = await getMarketIdByLanguage(locale);
            const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);

            const url = `${config.baseURL}/oauth/token`;
            const params = {
                grant_type: "refresh_token",
                refresh_token,
                redirect_uri,
            };
            const auth = {
                username: configData.clientId || "",
                password: configData.clientSecret || "",
            };

            const response = await axios.post(url, null, { params, auth });
            if (response.data?.stat === "error") {
                const apiError = handleApiError({ response }, response.data.message, 401);
                return res.status(400).json(apiError);
            }
            const { stat, ...responseBody } = response.data;

            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "Token has been refreshed successfully.",
                    timestamp: Date.now(),
                    logtype: "INFO",
                    service: "uup",
                    endpoint: "refreshToken",
                    redirect_uri: responseBody.redirect_uri,
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            return res
                .status(200)
                .json(successResponse("Token refreshed successfully", responseBody));
        } catch (error) {
            const apiError = handleApiError({ error }, (error as any).message, 400);
            return res.status(apiError.statusCode).json(apiError);
        }
    };

    export const logout = async (req: Request, res: Response): Promise<any> => {
        const { userId, brandId, regionId,locale } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID missing" });
        }
        
    if (!locale) {
        return res.status(400).json({statusCode: "400",message:"missing arguments locale",errorCode: "missing_argument"});
        }
        try {
            await validateBrandAndRegion({ brand: brandId, region: regionId });
            const brand = brandId.toUpperCase();
            const region = regionId.toUpperCase();
            //   const configData = getConfig(`${APP_IDS.AIC}_${brandId}_${regionId}`);
        const marketId = await getMarketIdByLanguage(locale);
        const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);

            const auth = {
                username: configData.ownerId || "",
                password: configData.ownerSecret || "",
            };
            const params = {
                type_name: configData.entity,
                uuid: userId,
            };
            const response = await axios.post(
                `${config.baseURL}/entity.deleteAccess`,
                null,
                { params, auth }
            );
            if (response.data?.stat === "error") {
                const apiError = handleApiError({ response }, "Logout failed", 400);
                return res.status(400).json(apiError);
            }
            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "User has logged out successfully.",
                    timestamp: Date.now(),
                    logtype: "INFO",
                    service: "uup",
                    endpoint: "logout",
                    rsponseData: response.data,
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            return res
                .status(200)
                .json(successResponse("Logout successful", response.data));
        } catch (error) {
            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "Logout failed. User is unable to log out",
                    timestamp: Date.now(),
                    logtype: "ERROR",
                    service: "uup",
                    endpoint: "logout",
                    errorCode: 400,
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            const apiError = handleApiError({ error }, "Logout failed");
            return res.status(apiError.statusCode).json(apiError);
        }
    };

    export const verifyEmail = async (
        req: Request,
        res: Response
    ): Promise<any> => {
        const { verification_code, regionId, locale} = req.query;

        if (!verification_code) {
            return res.status(400).json({ message: "Code is required." });
        }

        if(!regionId) {
            return res.status(400).json({ message: "region is required." });
        }
    if(!locale) {
            return res.status(400).json({ message: "locale is required." });
        }
        try {
            const url = `${config.baseURL}/access/useVerificationCode?verification_code=${verification_code}`;
            const params = {
                grant_type: "verification_code",
            };

            const response = await axios.post(url, null, { params });
            
            if (response.data?.stat === "error") {
                const apiError = handleApiError(
                    { response },
                    "Failed to verify email.",
                    400
                );
                return res.status(400).json(apiError);
            }
        
            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "User email has been successfully verified.",
                    timestamp: Date.now(),
                    logtype: "INFO",
                    service: "uup",
                    endpoint: "verifyEmail",
                    customField: "customValue",
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            updateEmailVerifiedStatusToTD(response.data.uuid, regionId as string, locale as string)
            return res
                .status(200)
                .json(successResponse("Email verified successfully", response.data));
        } catch (error) {
            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "Failed to verify email.",
                    timestamp: Date.now(),
                    logtype: "INFO",
                    service: "uup",
                    endpoint: "logout",
                    customField: "customValue",
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            const apiError = handleApiError({ error }, "Failed to verify email.", 400);
            return res.status(400).json(apiError);
        }
    };

    /**-------------------------------------- for latter use ----------------------------------------------------- */
    export const resendEmail = async (
        req: Request,
        res: Response
    ): Promise<any> => {
        const { emailAddress, locale, redirect_uri, brandId, regionId } = req.body;
        
        try {
            validateEmail(emailAddress);
            await validateBrandAndRegion({ brand: brandId, region: regionId });
            const brand = brandId.toUpperCase();
            const region = regionId.toUpperCase();
            const marketId = await getMarketIdByLanguage(locale);
        
            const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);
            const bodyData = {
                signInEmailAddress: emailAddress,
                client_id: configData.clientId as string,
                flow: configData.flow as string,
                flow_version: configData.flowVersion as string,
                form: "resendVerificationForm",
                locale,
                redirect_uri,
                response_type: "code",
            };
            const auth = {
                username: configData.ownerId || "",
                password: configData.ownerSecret || "",
            };

            const response = await axios.post(
                `${config.baseURL}/oauth/verify_email_native` as string,
                bodyData,
                { auth }
            );
            if (response.data?.stat === "error") {
                const statusCode = response.data?.code === 540 ? 202 : 400;
                const apiError = handleApiError(
                    { response },
                    "Failed to resend email.",
                    statusCode
                );
                return res.status(statusCode).json(apiError);
            }
            /********************************* NewRelic Log Capture :: ends *************************************/
            const logs = [
                {
                    message: "Verification code email has been resent successfully.",
                    timestamp: Date.now(),
                    logtype: "INFO",
                    service: "uup",
                    endpoint: "resendEmail",
                    customField: "customValue",
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            return res
                .status(200)
                .json(
                    successResponse(
                        "Verification code email resent successfully",
                        response.data
                    )
                );
            
        } catch (error) {
            /********************************* NewRelic Log Capture :: ends *************************************/
            const logs = [
                {
                    message: "Verification code email could not be resent successfully.",
                    timestamp: Date.now(),
                    logtype: "ERROR",
                    service: "uup",
                    endpoint: "resendEmail",
                    customField: "customValue",
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/

            const apiError = handleApiError({ error }, "Failed to resend email.", 400);
            return res.status(apiError.statusCode).json(apiError);
        }
    };
    /**--------------------------------------------------------------------------------------------------------- */

    export const newsletterSignUp = async (
        req: Request,
        res: Response
    ): Promise<any> => {
        const { emailAddress } = req.body;
        try {
            const data = req.body;
            
            validateEmail(emailAddress);
            data.brand = req.body.brandId
            data.region = req.body.regionId
            validateRequiredField(req.body, false);
            
            await validateBrandAndRegion({ brand: req.body.brandId, region: req.body.regionId });
            data.brand = req.body.brandId.toUpperCase()
            data.region = req.body.regionId.toUpperCase()
            const marketData = await getMarket(data.market);
            const isValidMarketId = marketData.isExits;
            if (!isValidMarketId) {
                throw new Error("Invalid market Id. Pleasese provide a valid market ID");
            }

            data.market = data.market.toUpperCase();
            data.marketName = marketData.data.name.toUpperCase();
        
            const regionExists = await getRegionIdValue(data.region);

            if (regionExists) {
                if (
                    ![
                        "website_newsletter_footer",
                        "website_newsletter_standalone",
                    ].includes(data.source)
                ) {
                    return res
                        .status(400)
                        .json(
                            errorResponse(
                                "The source must be either website_newsletter_footer or website_newsletter_standalone for newsletter signup",
                                400,
                                "INVALID_SOURCE_DATA"
                            )
                        );
                }
            }
            const MUUID = await handleNewsletterSignup(emailAddress);
            data.MUUID = MUUID;
            const result = await sendNonPIIData(data);
            if (result.errors) {
                result.errors[0].message = convertGraphQLErrorToPlainString(
                    result.errors[0].message
                );
                const apiError = handleApiError(result, "BAD_INPUT", 400);
                return res.status(400).json(apiError);
            }
            
            data.updatedDate = new Date().toDateString()
            data.createdDate = new Date().toDateString()
            
            registerWithTD(data, "nl");

            //* Insert newsletter data into Iterable only when regionId is "EM_EANZ"
            if(data?.region === "EM_EANZ"){
                registerWithIterable(data);
            }
            
            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "Newsletter signup has been successfully done",
                    timestamp: Date.now(),
                    logtype: "INFO",
                    service: "uup",
                    endpoint: "newsletterSignUp",
                    customField: "customValue",
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            return res
                .status(201)
                .json(
                    successResponse(
                        "Newsletter signup successful",
                        { userId: result.data },
                        201
                    )
                );
        } catch (error) {
            const ApiError = handleApiError(error);
            if (!res.headersSent) {
                /********************************* NewRelic Log Capture :: starts ************************************/
                const logs = [
                    {
                        message: "Newsletter signup is not successful",
                        timestamp: Date.now(),
                        logtype: "ERROR",
                        service: "uup",
                        endpoint: "newsletterSignUp",
                        customField: "customValue",
                    },
                ];
                sendLogToNewRelic(logs);
                /********************************* NewRelic Log Capture :: ends *************************************/
                return res.status(ApiError.statusCode).json(ApiError);
            }
        }
    };

    export async function changeEmailController(
        req: Request,
        res: Response
    ): Promise<any> {
        const { currentEmail, newEmail, password, brandId, regionId, locale, market } = req.body;
        try {
            await validateBrandAndRegion({ brand: brandId, region: regionId });
        
            // Step 1: Validate request
            const validationError = validateRequest(req.body);
            if (validationError) {
                res.status(400).json({ statusCode: "400", message: validationError });
                return;
            }
            //Step 3: Verify current email & password, get UUID
            const currentEmailUuid = await getUserProfile(
                currentEmail,
                password,
                brandId,
                regionId,
                locale
            );

            if (!currentEmailUuid) {
                res.status(401).json({
                    statusCode: "401",
                    message: "Invalid current email or password.",
                });
                return;
            }
            const { uuid, MUUID } = currentEmailUuid;

            // Step 2: Check if the new email is already in use
            const newEmailUuid = await getUserProfile(newEmail, "", brandId, regionId,locale);

            if (newEmailUuid) {
                res
                    .status(409)
                    .json({ statusCode: "409", message: "New email is already in use." });
                return;
            }

            //step 4-get token
            const accessToken = await getAccessTokenByUUID(uuid, brandId, regionId,locale);
            if (!accessToken) {
                res
                    .status(500)
                    .json({
                        statusCode: "500",
                        message: "Failed to retrieve access token",
                    });
                return;
            }
            //step-update mongo
            const updatePref = await updateEmailPref(
                uuid,
                brandId,
                regionId,
                currentEmail,
                newEmail
            );
            if (!updatePref) {
                res
                    .status(500)
                    .json({
                        statusCode: "500",
                        message: "Failed to update user Pref data",
                    });
                return;
            }
            //step--update count in user table
            const changecount = await updateEmail(MUUID, newEmail);
            // Step : send data to td
            const userData = {
                old_email: currentEmail,
                new_email: newEmail,
                brand: brandId,
                market: updatePref.marketId,
                region: regionId,
                muuid: MUUID,
                ...req.body,
            };
            delete userData.password;

            //step--
            const emailTriggered = await triggerEmailVerification(
                accessToken,
                newEmail,
                brandId,
                regionId,
                locale,
                false
            );

            if (!emailTriggered) {
                res.status(500).json({
                    statusCode: "500",
                    error: "Failed to trigger email verification.",
                });
                return;
            }
            if (emailTriggered) {
                /********************************* NewRelic Log Capture :: starts ************************************/
                const logs = [
                    {
                        message:
                            "Email change is successfully done. Verification email has been successfully sent",
                        timestamp: Date.now(),
                        logtype: "INFO",
                        service: "uup",
                        endpoint: "changeEmail"
                    },
                ];
                registerWithTD(userData, "changeEmail")
                sendLogToNewRelic(logs);
                /********************************* NewRelic Log Capture :: ends *************************************/
                res.status(200).json({
                    statusCode: "200",
                    message: "Email change successful. Verification email has been sent",
                });
                return;
            }
        } catch (error) {
            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "Email change has not been successfully done",
                    timestamp: Date.now(),
                    logtype: "ERROR",
                    service: "uup",
                    endpoint: "changeEmail"
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            const ApiError = handleApiError(error);
            if (!res.headersSent) {
                res.status(ApiError.statusCode).json(ApiError);
            }
        }
    }

    export async function changeEmailSupportController(
        req: Request,
        res: Response
    ): Promise<any> {
        const { currentEmail, newEmail, brandId, regionId, locale, isDuploUser, isPolarisUser } = req.body;
        try {
            await validateBrandAndRegion({ brand: brandId, region: regionId });
            const marketId = await getMarketIdByLanguage(locale);
            // Step 1: Validate request
            const validationError = validateRequestSupport(req.body);
            if (validationError) {
                res.status(400).json({ statusCode: "400", message: validationError });
                return;
            }
            //Step 3: Verify current email & password, get UUID
            const currentEmailUuid = await getUserProfile(
                currentEmail,
                "",
                brandId,
                regionId,
                locale,
                isDuploUser,
                
            );

            if (!currentEmailUuid) {
                res.status(401).json({
                    statusCode: "401",
                    message: "Invalid current email.",
                });
                return;
            }
            const { uuid, MUUID } = currentEmailUuid;

            // Step 2: Check if the new email is already in use
            const newEmailUuid = await getUserProfile(newEmail, "", brandId, regionId,locale, isDuploUser);

            if (newEmailUuid) {
                res
                    .status(409)
                    .json({ statusCode: "409", message: "New email is already in use." });
                return;
            }

            //step 4-get token
            const accessToken = await getAccessTokenByUUID(uuid, brandId, regionId,locale, isDuploUser);
            if (!accessToken) {
                res
                    .status(500)
                    .json({
                        statusCode: "500",
                        message: "Failed to retrieve access token",
                    });
                return;
            }
            //step-update mongo
            if(isPolarisUser) {
            const updatePref = await updateEmailPref(
                uuid,
                brandId,
                regionId,
                currentEmail,
                newEmail
            );
            if (!updatePref) {
                res.status(500).json({statusCode: "500",message: "Failed to update user Pref data",});
                return;
            }
            //step--update count in user table
            const changecount = await updateEmail(MUUID, newEmail);
        
            //Step : send data to td
            const userData = {
                old_email: currentEmail,
                new_email: newEmail,
                brand: brandId,
                market: updatePref.marketId,
                region: regionId,
                ...req.body,
            };
            registerWithTD(userData, "changeEmail");
            }
            
            //step--
            const emailTriggered = await triggerEmailVerification(
                accessToken,
                newEmail,
                brandId,
                regionId,
                locale,
                isDuploUser?? false,
                
            );

            if (!emailTriggered) {
                res.status(500).json({
                    statusCode: "500",
                    error: "Failed to trigger email verification.",
                });
                return;
            }
            if (emailTriggered) {
                /********************************* NewRelic Log Capture :: starts ************************************/
                const logs = [
                    {
                        message:
                            "Email change is successful. Verification email has been sent",
                        timestamp: Date.now(),
                        logtype: "INFO",
                        service: "uup",
                    },
                ];
                sendLogToNewRelic(logs);
                /********************************* NewRelic Log Capture :: ends *************************************/
                res.status(200).json({
                    statusCode: "200",
                    message: "Email change successful. Verification email has been sent",
                });
                return;
            }
        } catch (error) {
            /********************************* NewRelic Log Capture :: starts ************************************/
            const logs = [
                {
                    message: "Email change is not done",
                    timestamp: Date.now(),
                    logtype: "ERROR",
                    service: "uup",
                },
            ];
            sendLogToNewRelic(logs);
            /********************************* NewRelic Log Capture :: ends *************************************/
            const ApiError = handleApiError(error);
            if (!res.headersSent) {
                res.status(ApiError.statusCode).json(ApiError);
            }
        }
    }