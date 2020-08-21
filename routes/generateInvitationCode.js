const express = require('express')
const router = express.Router()
const Invitation = require('../models/invitations')
const Signin=require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
ObjectId = require('mongodb').ObjectID
// Only doctor can call this

router.get('/',Signin.authenticateToken, async (req, res)=>{
    const requestPerson = await Users.find({email:req.user['email']})
    const requestPersonRole = requestPerson[0]['role']
    if(requestPersonRole === "doctor"){
        const doctorInvitation = await Invitation.find({doctorId:requestPerson[0]["_id"].toString()})
        res.status(200).json({invitationCode:doctorInvitation[0]['invitationCode']})

    }else if(requestPersonRole === "patient"){
        res.status(403).json({message:"You do not have permission"})
    }

})

module.exports = router;
