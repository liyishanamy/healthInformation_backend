const express =require('express')
const flash = require('express-flash')
const session = require('express-session')

require('dotenv').config()
const app=express()
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



//Signin
const signin = require('./routes/signin')
app.use('/',signin)


// GetprofileInfo
const userProfile = require('./routes/userProfile')
app.use('/user',userProfile)

//invite
const invite = require("./routes/generateInvitationCode")
app.use('/invite',invite)

app.listen(3000,()=>console.log('server started'))