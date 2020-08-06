const express = require('express')
const router = express.Router()
const HealthStatus = require('../models/healthStatus')
const Invitation = require('../models/invitations')
const Signin = require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
// Return all the possible routes that confirmed patient has gone through
router.get('/getRecentRoute',Signin.authenticateToken,async (req, res)=>{
    const findUsers = await Users.find({"email": req.user["email"]})
    const role =  findUsers[0]["role"]
    if(role==="doctor"){
        const findRoute = await HealthStatus.aggregate([{$match: {patientEmail: {$in: findUsers[0]['patientList']}}},
            { $project : { placesFrom:{ $ifNull: ["$placesFrom","Unspecified"]}, placesTo : { $ifNull: ["$placesTo","Unspecified"]},
                    mask : 1, Date: 1}} ])
        //const res = findRoute({})
        res.status(200).json(findRoute)
    }
    else if(role==="patient"){
        res.status(403).json({message:"You do not have permission to see."})

    }




})
module.exports = router;