const express =require('express')
const app=express()

require('dotenv').config()

const mongoose =require('mongoose')
const cors = require('cors')



mongoose.connect(process.env.DATABASE_URL,{useUnifiedTopology:true})
const db = mongoose.connection


app.use(express.json())
app.use(express.static('public'));
//Serves all the request which includes /images in the url from Images folder
app.use('/images', express.static(__dirname + '/images'));

db.on('error',(error)=>console.log(error))
db.once('open',()=>console.log("connected to db"))


app.use(cors())
app.use(express.json())

//Singup
const signup = require('./routes/userInformation')
app.use('/users',signup)

// Reset password
const resetPassword = require('./routes/resetPassword')
app.use('/resetPassword',resetPassword)

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


//Patient health track
const healthTrack = require("./routes/healthTracking")
app.use('/healthTrack', healthTrack)

// Security questions setting
const securityQuestions = require("./routes/securityQuestions")
app.use('/security-questions',securityQuestions)

// Patients who have no symptoms for 14 days should get notification to get retest
const patientDays = require("./routes/patientsNotification")
app.use('/notification',patientDays)


// Patients can book appointment of retest once their health status get better
const appointment = require("./routes/appointment")
app.use('/appointment', appointment)



app.listen(3000,()=>console.log('server started'))
