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
            res.status(200).json({accessToken:accessToken, refreshToken:refreshToken})

        }else {
            res.status(401).json({'message':'Authentication failed'});
        }
    }catch{
        res.status(500).send()

    }
})

function generateAccessToken(user){
    return jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '60s'})

}

function authenticateToken(req,res,next){
    console.log("authenticated")
    const authHeader =req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.status(401).json({message:"Unauthorized"})
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,user)=>{
       if (err) return res.status(403).json({"message":"the token is invalid"})
        req.user = user
        next()
    })
}

module.exports = router;
module.exports.authenticateToken=authenticateToken;
