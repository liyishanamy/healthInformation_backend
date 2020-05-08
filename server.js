const express =require('express')

require('dotenv').config()
const app=express()
const mongoose =require('mongoose')
const cors = require('cors')
mongoose.connect(process.env.DATABASE_URL,{useUnifiedTopology:true})
const db = mongoose.connection
db.on('error',(error)=>console.log(error))
db.once('open',()=>console.log("connected to db"))
app.use(cors())
app.use(express.json())

const signup = require('./routes/userInformation')
app.use('/users',signup)

const signin = require('./routes/signin')
app.use('/login',signin)

app.listen(3000,()=>console.log('server started'))