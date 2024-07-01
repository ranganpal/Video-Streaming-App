import dotenv from "dotenv";
import connectDB from "./database/index.js";

dotenv.config({
  path: "./env"
})

connectDB()


/*
import express from "express";

const app = express()

; (async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

    app.on("error", (error) => {
      console.log("ERROR: ", error)
      throw error
    })

    app.listen(process.env.PORT, (req, res) => {
      console.log(`App is listening on port${process.env.PORT}`)
    })
  } 
  catch(error) {
    console.log("ERROR: ", error)
    throw error
  }
})()
*/