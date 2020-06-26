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
            console.log(recentRecord)
            var updatedDays;
            if (req.body.temperature < 37 && req.body.symptom.length === 0) {
                // get better
                updatedDays = recentRecord[0]['daysOfNoSymptom'] + 1
                if(updatedDays>=2){
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
                if(updatedDays>=2){
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
            console.log(recentRecord)
            console.log(recentRecord[0]["_id"])
            await HealthStatus.deleteOne({_id:recentRecord[0]["_id"]})

            console.log("delete")
            const newDayUpdate = await dailyUpdate.save()
            res.status(201).json(newDayUpdate)
        }
    }
    else {
        res.status(403).json({"message": "You do not have permission"})
    }

})

// Doctor view all the patients health status(good/bad/non-reporting) for one day
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
            const findPatients = requestPerson[0]['patientList']
            const findDate = await HealthStatus.find({Date: {$gte: date_from, $lt: date_to},patientEmail:{$in : findPatients}})
            console.log("findDate",findDate)
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
                reportDate:date_from,
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
    var requestPerson = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    var patient = await HealthStatus.aggregate([{$match:{patientEmail:findPatientEmail}},{$project:{Date:1,temperature:1}}])

    if(requestPerson[0]["role"]==="doctor"){

        res.status(200).json(patient)

    }else if (requestPerson[0]["role"]==="patient"){
        if(findPatientEmail===req.user["email"]){
            console.log(patient)
            res.status(200).json(patient)
        }else{
            res.status(403).json({message:"You do not have permission"})
        }

    }

})
router.post('/symptom/', Signin.authenticateToken,async (req,res)=>{
    const findPatientEmail = req.body.email
    const patientRecord = await Users.find({"email":findPatientEmail})
    var requestPerson = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    var patient = await HealthStatus.aggregate([{$match:{patientEmail:findPatientEmail}},{$project:{Date:1,symptom:1}}])

    if(requestPerson[0]["role"]==="doctor"){

        res.status(200).json(patient)

    }else if (requestPerson[0]["role"]==="patient"){
        if(findPatientEmail===req.user["email"]){
            res.status(200).json(patient)
        }else{
            res.status(403).json({message:"You do not have permission"})
        }

    }
})
// The Symptom count from started date till today
router.post('/symptom/count', Signin.authenticateToken,async (req,res)=>{
    const findPatientEmail = req.body.email
    let headache = 0
    let breatheHard = 0
    let cough = 0
    let runningNose = 0
    let diarrhea = 0
    var requestPerson = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    var findPatientRecord = await HealthStatus.find({patientEmail:findPatientEmail})
    console.log("findPatientRecord",findPatientRecord)
    for (var i=0;i<findPatientRecord.length;i++){
        let symptomsList = findPatientRecord[i]['symptom']
        if(symptomsList.length!==0){
            if(symptomsList.includes("Headache")){
                headache++
            }if(symptomsList.includes("Cough")){
                cough++
            }if(symptomsList.includes("Running Nose")){
                runningNose++
            }if(symptomsList.includes("Diarrhea")){
                diarrhea++
            }if(symptomsList.includes("Breathe Hard")){
                breatheHard++
            }
        }
    }
    res.status(200).json({
        headache:headache,
        cough:cough,
        runningNose:runningNose,
        diarrhea:diarrhea,
        breatheHard:breatheHard

    })

})
router.post('/daysHavingNoSymptoms',Signin.authenticateToken, async (req,res)=>{
    const findPatientEmail = req.body.email
    const patientRecord = await Users.find({"email":findPatientEmail})
    var requestPerson = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    //var patient = await HealthStatus.aggregate([{$match:{patientEmail:findPatientEmail}},{$project:{daysOfNoSymptom:1}}])
    var recentRecord = await HealthStatus.find({patientEmail: req.body.email}).sort({"Date": -1}).limit(1)
    if(requestPerson[0]["role"]==="doctor"){
        res.status(200).json({daysOfNoSymptom:recentRecord[0]['daysOfNoSymptom']})
    }else if (requestPerson[0]["role"]==="patient"){
        if(findPatientEmail===req.user["email"]){
            res.status(200).json({daysOfNoSymptom:recentRecord[0]['daysOfNoSymptom']})
        }else{
            res.status(403).json({message:"You do not have permission"})
        }

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
