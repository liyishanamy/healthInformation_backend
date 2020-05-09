const express =require('express')
const flash = require('express-flash')
const session = require('express-session')

require('dotenv').config()
const app=express()
const mongoose =require('mongoose')
const cors = require('cors')
const passport = require('passport')
const initializePassport = require('./passport-config')
initialize(
    passport,
    email=>users.find(user =>user.email === email),
    id => users.find(user=>user.id ===id)
)
mongoose.connect(process.env.DATABASE_URL,{useUnifiedTopology:true})
const db = mongoose.connection
db.on('error',(error)=>console.log(error))
db.once('open',()=>console.log("connected to db"))
app.use(flash())
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(cors())
app.use(express.json())

const signup = require('./routes/userInformation')
app.use('/users',signup)

//const signin = require('./routes/signin')
//app.use('/login',signin)
app.post('/login',passport.authenticate('local'),{
    successRedirect:"/",
    failureRedirect:'/login',
    failureFlash:true
})
app.listen(3000,()=>console.log('server started'))