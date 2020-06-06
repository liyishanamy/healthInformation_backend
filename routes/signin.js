const express = require('express')
const router = express.Router()
const bcrypt =require('bcrypt')
const Users = require('../models/users')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const app=express()
app.use(express.json())
let refreshTokens = []
//Generate renew token using refresh token
router.post('/token',(req,res)=>{
    const refreshToken = req.body.token
    console.log("refresh",refreshToken)
    if(refreshToken==null) return res.send(401)
    if(!refreshTokens.includes(refreshToken))return res.status(403).json({message:"Forbidden"})
    jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET,(err,user)=>{
        if (err)return res.status(403).json({message:err.name})
        const accessToken=generateAccessToken({name:user.name})
        res.status(200).json({accessToken:accessToken})
    })
})

router.delete('/logout', authenticateToken,(req,res)=>{
    refreshTokens = refreshTokens.filter(token=>token!==req.body.token)
    res.status(200).json({"message":"Refresh token is deleted"})
})



router.post('/login',async (req,res)=>{
   // const user = Users.find(user=>user.email=req.body.email)
   const user = await Users.find({email:req.body.email},null,{limit:1})
    console.log(user)
    if(user.length===0){
        return res.status(401).json({'message':'Authentication failed'})
    }
    const useremail={email:req.body.email}
    try{
        if(await bcrypt.compare(req.body.password,user[0].password)){
            const accessToken = generateAccessToken(useremail)
            const refreshToken = jwt.sign(useremail,process.env.REFRESH_TOKEN_SECRET)
            refreshTokens.push(refreshToken)
            // Get the user information
            const findUser = await Users.find({"email":req.body.email})
            console.log(findUser)
            const user = findUser[0]
            if(user['role']==='doctor'){
                res.status(200).json({accessToken:accessToken, refreshToken:refreshToken,email:req.body.email,firstname:user['firstname'],
                lastname:user['lastname'],gender:user['gender'],role:user['role'],street:user['street'],city:user['city'],state:user['state'],
                postcode:user['postcode'],birthday:user['birthday'],age:user['age'],patientList:user['patientList'],createdDate:user['createdDate']})
            }
            else if(user['role'] ==='patient'){
                res.status(200).json({accessToken:accessToken, refreshToken:refreshToken,email:req.body.email,firstname:user['firstname'],
                    lastname:user['lastname'],gender:user['gender'],role:user['role'],invitation:user['invitation'],street:user['street'],city:user['city'],state:user['state'],
                    postcode:user['postcode'],birthday:user['birthday'],age:user['age'],createdDate:user['createdDate'],myDoctor:user['myDoctor']})
            }
        }else {
            res.status(401).json({'message':'Authentication failed'});
        }
    }catch{
        res.status(500).send()

    }
})

async function authenticateAuthHeader({username,password}) {
    console.log(username,password)
    const user  = await Users.find({email: username});
    if(user.length===0){
        userMsg = "Authentication failure"
    }else{
        console.log("user",user)
        var userMsg;
        if (await bcrypt.compare(password,user[0].password)) {
            userMsg = "Authenticated"
        }else{
            userMsg = "Authentication failure"
        }
    }

    return userMsg
}


function generateAccessToken(user){
    return jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1800s'})
}

async function authenticateToken(req, res, next) {
    console.log("authenticated")
    const authHeader = req.headers['authorization']


    console.log("authHeader", authHeader)
    const token = authHeader && authHeader.split(' ')[1]
    const header = authHeader.split(' ')[0]

    if (token == null) return res.status(401).json({message: "Unauthorized"})
    if (header === "Bearer") { // access token
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.status(403).json({"message": "the token is invalid"})
            req.user = user
            next()
        })
    }
    if (header === "Basic") { // basic auth
        const credentials = Buffer.from(token, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');
        try {
            const userHeader = await authenticateAuthHeader({username, password});
            if (userHeader === "Authentication failure") {
                res.status(401).json({message: userHeader})
            } else if (userHeader === "Authenticated") {
                req.user = {email: username}
                next()
            }
        }catch (e) {
            console.log(e)
        }



    }
}

module.exports = router;
module.exports.authenticateToken=authenticateToken;
module.exports.generateAccessToken=generateAccessToken;
