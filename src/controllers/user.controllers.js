import { asyncHandler } from "../utils/asynHandler.js";



const registerUser = asyncHandler(async(req,res)=>{
    res.status.json({
        message:"ok"
    })
})

export {registerUser}