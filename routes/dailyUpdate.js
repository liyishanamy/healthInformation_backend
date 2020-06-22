const express = require('express')
const router = express.Router()
const HealthStatus = require('../models/healthStatus')
const Invitation = require('../models/invitations')
const Signin = require('./signin')
const Users = require('../models/users')
const patientsNotification = require('../models/patientsNotification')
var mongoose = require('mongoose');
//const rateLimit = require("express-rate-limit");
ObjectId = require('mongodb').ObjectID
/**
 const limiter = rateLimit({
    //windowMs: 60 * 60 * 24 * 1000, //24 hours
    windowMs: 1 * 60 * 1000,// test for 1 min
    max: 1, // limit each IP to 100 requests per windowMs
    message: "You can only submit daily request once a day",
    headers:true
});*/
// Generate daily health status
router.post('/', Signin.authenticateToken, async (req, res) => {
    const findUsers = await Users.find({"email": req.user["email"]})
    const requestPerson = findUsers[0]["email"]
    const findPatientId = findUsers[0]
    const myDoctor = findUsers[0]["myDoctor"]

    // Check to see if the patient has no symptom for more than 14 days

    if (findUsers == null) {
        return res.status(404).json({message: "cannot find user"})
    }
    console.log(requestPerson)
    console.log(req.body.email)
    if (requestPerson===req.body.email) {
        console.log("first time")
        // Check last health status record
        var recentRecord = await HealthStatus.find({patientEmail: req.body.email}).sort({"Date": -1}).limit(1)
        console.log("recentRecord",recentRecord)

        if (recentRecord.length === 0) {
            var updatedDays;
            if (req.body.temperature < 37 || req.body.symptom.length === 0) {
                // get better
                updatedDays = 1
            } else {
                // get worse
                updatedDays = 0
            }
            const dailyUpdate = new HealthStatus({
                myDoctor:myDoctor,
                patientEmail: req.body.email,
                patientName: findPatientId['firstname'],
                daysOfNoSymptom: updatedDays,
                temperature: req.body.temperature,
                symptom: req.body.symptom,// Give me an array of symptoms,
                Date: req.body.Date
            })
            const newDayUpdate = await dailyUpdate.save()
            res.status(201).json(newDayUpdate)
        }else if (recentRecord.length === 1 && recentRecord[0]["Date"].setHours(0, 0, 0, 0) !== new Date().setHours(0, 0, 0, 0)) {
            console.log("we do not have record today")
            var updatedDays;
            if (req.body.temperature < 37 && req.body.symptom.length === 0) {
                // get better
                updatedDays = recentRecord[0]['daysOfNoSymptom'] + 1
                if(updatedDays>=7){
                    const filterPatient = await patientsNotification.find({userEmail:req.body.email})
                    const notification = new patientsNotification({
                        userEmail: req.body.email,
                        myDoctorId:myDoctor,
                        registrationDate:findUsers[0]['createdDate'],
                        noSymptomsDays:updatedDays
                    })
                    console.log("here",filterPatient)
                    if(filterPatient.length!==0){
                        await patientsNotification.deleteOne({"userEmail": req.body.email})
                        await notification.save()

                    }else if(filterPatient.length===0){
                        await notification.save()
                    }
                }
            } else {
                // get worse
                updatedDays = 0

                await patientsNotification.deleteOne({"userEmail": req.body.email})

            }
            const dailyUpdate = new HealthStatus({
                myDoctor:myDoctor,
                patientEmail:req.body.email,
                patientName: findPatientId['firstname'],
                temperature: req.body.temperature,
                daysOfNoSymptom: updatedDays,
                symptom: req.body.symptom,// Give me an array of symtoms,
                Date: req.body.Date
            })
            const newDayUpdate = await dailyUpdate.save()
            res.status(201).json(newDayUpdate)
        } else if (recentRecord.length === 1 && recentRecord[0]["Date"].setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)) {
            console.log("We have your records today")

            var recentRecord = await HealthStatus.find({patientEmail: req.body.email}).sort({"Date": -1}).limit(1)

            if (req.body.temperature > 37 || req.body.symptom.length !== 0 ) {
                // get worse
                updatedDays = 0

                await patientsNotification.deleteOne({"userEmail": req.body.email})

            } else {
                // get better
                if(recentRecord[0]['temperature']<37 && recentRecord[0]['symptom'].length===0){
                    // Better last update
                    updatedDays = recentRecord[0]['daysOfNoSymptom']
                }
                if(recentRecord[0]['temperature']>37 || recentRecord[0]['symptom'].length!==0){
                    updatedDays = recentRecord[0]['daysOfNoSymptom'] + 1
                }
                if(updatedDays>=7){
                    const filterPatient = await patientsNotification.find({userEmail:req.body.email})
                    const notification = new patientsNotification({
                        userEmail: req.body.email,
                        myDoctorId:myDoctor,
                        registrationDate:findUsers[0]['createdDate'],
                        noSymptomsDays:updatedDays
                    })
                    if(filterPatient.length!==0){
                        await patientsNotification.deleteOne({"userEmail": req.body.email})
                        await notification.save()

                    }else if(filterPatient.length===0){
                        await notification.save()
                    }
                }
            }

            const dailyUpdate = new HealthStatus({
                myDoctor:myDoctor,
                patientEmail: req.body.email,
                patientName: findPatientId['firstname'],
                daysOfNoSymptom: updatedDays,
                temperature: req.body.temperature,
                symptom: req.body.symptom,// Give me an array of symptoms,
                Date: req.body.Date
            })
            await HealthStatus.deleteOne({patientEmail:req.body.email})

            console.log("delete")
            const newDayUpdate = await dailyUpdate.save()
            res.status(201).json(newDayUpdate)
        }
    }
    else {
        res.status(403).json({"message": "You do not have permission"})
    }

})

// Doctor view all the patients health status(good/bad/non-reporting)
router.get('/stats', Signin.authenticateToken, async (req, res) => {
    var requestPerson = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    var date_from = req.query['from']
    var date_to = req.query['to']
    var gettingBetter = 0;
    var gettingWorse = 0;
    var forgetReporting = 0;

    // Patient case
    if (requestPerson[0]['role'] === 'patient') {
        res.status(403).json({message: "You do not have permission"})
    }
    // Doctor case
    if (requestPerson[0]['role'] === 'doctor') {
        var totalPatients = requestPerson[0]['patientList'].length
        console.log("totalPatients",totalPatients)
        //Query data on single data
        if (date_from !== undefined && date_to !== undefined) {
            const findPatients = await Users.aggregate([{$match: {email: {$in: requestPerson[0]['patientList']}}},
                { $project : { _id: 1 }} ])
            console.log(findPatients)
            const patients = []
            for (var i =0;i<findPatients.length;i++){
                patients.push(findPatients[i]['_id'])
            }
            console.log(patients)
            const findDate = await HealthStatus.find({Date: {$gte: date_from, $lt: date_to},patientId:{$in : patients}})
            console.log(findDate)

            for (var i = 0; i < findDate.length; i++) {
                console.log(i,findDate[i])
                if (findDate[i].symptom.length !== 0 || findDate[i].temperature > 37) {
                    gettingWorse += 1
                } else if (findDate[i].symptom.length === 0 && findDate[i].temperature < 37) {
                    gettingBetter += 1
                }
            }
            forgetReporting = totalPatients - gettingBetter - gettingWorse
            let finalReport = {
                gettingBetter: gettingBetter,
                gettingWorse: gettingWorse,
                forgetReporting: forgetReporting
            }
            res.status(200).json(finalReport)
        } else {
            res.status(400).json({message: "wrong format"})
        }
    }

})
router.post('/temperature/', Signin.authenticateToken,async (req,res)=>{
    const findPatientEmail = req.body.email
    const patientRecord = await Users.find({"email":findPatientEmail})
    const patientId = patientRecord[0]["_id"]
    var requestPerson = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    if(requestPerson[0]["role"]==="doctor"){
        var patient = await HealthStatus.aggregate([{$match:{patientId:patientId.toString()}},{$project:{Date:1,temperature:1}}])

        res.status(200).json(patient)

    }else if (requestPerson[0]["role"]==="patient"){
        res.status(403).json({message:"You do not have permission"})

    }

})
router.post('/symptom/', Signin.authenticateToken,async (req,res)=>{
    const findPatientEmail = req.body.email
    const patientRecord = await Users.find({"email":findPatientEmail})
    const patientId = patientRecord[0]["_id"]
    var requestPerson = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    if(requestPerson[0]["role"]==="doctor"){
        var patient = await HealthStatus.aggregate([{$match:{patientId:patientId.toString()}},{$project:{Date:1,symptom:1}}])

        res.status(200).json(patient)

    }else if (requestPerson[0]["role"]==="patient"){
        res.status(403).json({message:"You do not have permission"})

    }

})

// Single patient health status in a period of time
router.post('/patientHealth', Signin.authenticateToken, async (req, res) => {
    const postEmail = req.body.email
    var requestPerson = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    var targetPerson = await Users.find({"email":postEmail})
    // Patient case
    if (requestPerson[0]['role'] === 'patient') {
        if ( req.user["email"]===postEmail) {
            // This patient can access his health status
            var date_from = req.query['from'];
            var date_to = req.query['to'];
            if (date_from !== undefined && date_to === undefined) {
                const findDate = await HealthStatus.find({Date: {$gte: date_from}, patientId: requestPerson[0]["_id"].toString()})
                res.status(200).json(findDate)
            }
            if (date_from !== undefined && date_to !== undefined) {
                const findDate = await HealthStatus.find({
                    Date: {$gte: date_from, $lt: date_to},
                    patientId: requestPerson[0]["_id"].toString()
                })
                res.status(200).json(findDate)
            } else {
                res.status(400).json({message: "wrong format"})

            }
        }else{
            res.status(403).json({message:"You do not have permission"})
        }
    }
    // Doctor case
    if (requestPerson[0]['role'] === 'doctor') {
        var patientList = requestPerson[0]['patientList']
        console.log(patientList.includes(postEmail))



        if (patientList.includes(postEmail)) {
            var date_from = req.query['from'];
            var date_to = req.query['to'];
            if (date_from !== undefined && date_to === undefined) {
                const findDate = await HealthStatus.find({Date: {$gte: date_from, patientId: targetPerson[0]["_id"].toString()}})
                res.status(200).json(findDate)
            }
            if (date_from !== undefined && date_to !== undefined) {
                const findDate = await HealthStatus.find({
                    Date: {$gte: date_from, $lte: date_to},
                    patientId: targetPerson[0]["_id"].toString()
                })
                res.status(200).json(findDate)
            } else {
                res.status(400).json({message: "wrong format"})
            }
        } else {
            res.status(403).json({message: "you don't have permission"})
        }
    }
})


module.exports = router;
