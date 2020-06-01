const express = require('express')
const router = express.Router()
const Invitation = require('../models/invitations')
const Signin=require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
ObjectId = require('mongodb').ObjectID
// middleware of doctor signup process
// Only doctor can call this
router.post('/', Signin.authenticateToken, async (req,res)=>{
    const findUsers = await Users.find({"email":req.user["email"]},null,{limit:1})
    const requestPerson = findUsers[0]["role"]
    if (requestPerson ==='doctor'){
        const invite = new Invitation({
            doctorId:findUsers[0]['_id'],
            invitationCode:Math.random().toString(36).substring(7)
        })
        const newInvitationCode = await invite.save()
        res.status(201).json(newInvitationCode)

    }else{
        res.status(403).json({"message":"You do not have permission"})
    }

})

module.exports = router;
