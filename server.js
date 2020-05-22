const express =require('express')
const app=express()

require('dotenv').config()

const mongoose =require('mongoose')
const cors = require('cors')


mongoose.connect(process.env.DATABASE_URL,{useUnifiedTopology:true})
const db = mongoose.connection
app.use(express.json())
db.on('error',(error)=>console.log(error))
db.once('open',()=>console.log("connected to db"))


app.use(cors())
app.use(express.json())


//Singup
const signup = require('./routes/userInformation')
app.use('/users',signup)

// Reset password
const resetPassword = require('./routes/resetPassword')
app.use('resetPassword',resetPassword)

//Signin
const signin = require('./routes/signin')
app.use('/',signin)


// GetprofileInfo
const userProfile = require('./routes/userProfile')
app.use('/user',userProfile)

//invite
const invite = require("./routes/generateInvitationCode")
app.use('/invite',invite)

//Patient daily update
const dailyUpdate = require("./routes/dailyUpdate")
app.use('/healthStatus', dailyUpdate)

app.listen(3000,()=>console.log('server started'))