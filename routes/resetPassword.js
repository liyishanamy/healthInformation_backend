const express = require('express')
const router = express.Router()
const Invitation = require('../models/invitations')
const Signin=require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
const bcrypt = require('bcrypt')
ObjectId = require('mongodb').ObjectID

router.put('/', Signin.authenticateToken, async (req,res)=>{
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