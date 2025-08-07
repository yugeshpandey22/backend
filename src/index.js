//require ('dotenv').config({path:'./env'})


const dotenv = require("dotenv");
const connectDB = require("./db/index.js");
const express = require("express");
const app = express();

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running at port: ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connect failed !!!", err);
  });
















/*

import express from "express"
const app = express()

(async  ()=>{
    try{
        await mongoose.connect(`${process.env.
            MONGODB_URI}/${DB_NAME}`)
     app.on ("error",()=>{
        console.log("ERROR:",error);
        throw error
     })


     app.listen (process.env.PORT,()=>{
        console.log('app is listing on port ${process.env.PORT');
     })
    }catch(error){
        console.error("ERROR:",error)
        throw err
    }
})()

*/