import express from " express"
const  app = express()
import cors from "cors"
import cookieParser from "cookie-parser"


app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extends:true,limit:"16kb"}))

app.use(express.static("public"))
app.use(cookieParser())

// routes router

import  userRouter  from "./routes/user.routes.js"


// routes declaration

app.use("/api/v1/users",userRouter)
//http://localhost:3000/users/api/v1/users/register

export {app}