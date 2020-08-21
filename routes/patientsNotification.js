const express = require('express')
const router = express.Router()
const Signin=require('./signin')
const Users = require('../models/users')
const patientNotification = require('../models/patientsNotification')
var mongoose = require('mongoose');
ObjectId = require('mongodb').ObjectID

// Doctor get all the patients' information who do not have symptoms for 2 weeks
router.get('/', Signin.authenticateToken, async (req,res)=> {
    const requestPerson = await Users.find({email:req.user['email']})
    var doctorId = requestPerson[0]["_id"]
    if(requestPerson[0]["role"]==="doctor"){
        var patientNotification = await patientNotification.find({myDoctorId:doctorId})
        res.status(200).json(patientNotification)
    }else if(requestPerson[0]["role"]==="patient"){
        res.status(403).json({message:"You do not have permission."})
    }
})

// Check particular patients'(whether he or she has appointment)
router.post('/', Signin.authenticateToken, async (req,res)=>{
    const requestPerson = await Users.find({email:req.user['email']})
    const patientEmail = req.body.email
    if(requestPerson[0]['role']==="doctor"){
        const findPatient = await patientNotification.find({userEmail:patientEmail})
        if(findPatient.length===0){
            res.status(200).json({"Appointment":false})
        }else{
            res.status(200).json({"Appointment":true})
        }
    }else if(requestPerson[0]['role']==="patient"){
        res.status(403).json({message:"You do not have permission."})
    }

})
module.exports = router;
