const express = require('express')
const router = express.Router()
const Invitation = require('../models/invitations')
const Signin=require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
const bcrypt = require('bcrypt')
ObjectId = require('mongodb').ObjectID
const rateLimit = require("express-rate-limit");

// Status code is 429 by default
const limiter = rateLimit({
    //windowMs: 60 * 60 * 24 * 1000, //24 hours
    windowMs: 24*60 * 60 * 1000,// test for 1 min
    max: 1, // limit each IP to 100 requests per windowMs
    message: "You can only change your password once a day",
    headers:true
});
router.put('/', limiter,Signin.authenticateToken, async (req,res)=>{
    const user = req.user['email'];
    const hashedPassword = await bcrypt.hash(req.body.password,10)
    if(req.body.password!==req.body.confirmedPassword){
        res.status(400).json({message:"The password does not match up"})
    }else{
        var hashedBody = {"password":hashedPassword,"confirmedPassword":hashedPassword}
        let conditions = {email:user}
        Users.update(conditions, hashedBody)
            .then(doc => {
                if (!doc) {
                    return res.status(404).end()
                }
                return res.status(200).json({"message":"Your password has been updated!"})
            })
    }
})

module.exports = router;
