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
    const findUsers = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    const requestPerson = findUsers[0]["_id"]
    const findPatientId = findUsers[0]
    var recentRecord = await HealthStatus.find({patientId: req.body.patientId}).sort({"Date": -1}).limit(1)
    console.log("recentRecord",recentRecord[0]['daysOfNoSymptom'])
    // Check to see if the patient has no symptom for more than 14 days

    if (findUsers == null) {
        return res.status(404).json({message: "cannot find user"})
    }

    if (requestPerson.equals(ObjectId(req.body.patientId))) {
        // Check last health status record
        var recentRecord = await HealthStatus.find({patientId: req.body.patientId}).sort({"Date": -1}).limit(1)
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
                patientId: req.body.patientId,
                patientName: findPatientId['firstname'],
                daysOfNoSymptom: updatedDays,
                temperature: req.body.temperature,
                symptom: req.body.symptom,// Give me an array of symptoms,
                Date: req.body.Date
            })
            const newDayUpdate = await dailyUpdate.save()
            res.status(201).json(newDayUpdate)
        }if (recentRecord.length === 1 && recentRecord[0]["Date"].setHours(0, 0, 0, 0) !== new Date().setHours(0, 0, 0, 0)) {
            console.log("we do not have record today")
            var updatedDays;
            if (req.body.temperature < 37 && req.body.symptom.length === 0) {
                // get better
                updatedDays = recentRecord[0]['daysOfNoSymptom'] + 1
                if(updatedDays>=14){
                    const filterPatient = await patientsNotification.find({userId:req.body.patientId})
                    const notification = new patientsNotification({
                        userId: req.body.patientId,
                        email: findUsers[0]['email'],
                        registrationDate:findUsers[0]['createdDate'],
                        noSymptomsDays:updatedDays
                    })
                    console.log("here",filterPatient)
                    if(filterPatient.length!==0){
                        await patientsNotification.deleteOne({"userId": ObjectId(req.body.patientId)})
                        await notification.save()

                    }else if(filterPatient.length===0){
                        await notification.save()
                    }
                }
            } else {
                // get worse
                updatedDays = 0

                await patientsNotification.deleteOne({"userId": ObjectId(req.body.patientId)})

            }
            const dailyUpdate = new HealthStatus({
                patientId: req.body.patientId,
                patientName: findPatientId['firstname'],
                temperature: req.body.temperature,
                daysOfNoSymptom: updatedDays,
                symptom: req.body.symptom,// Give me an array of symtoms,
                Date: req.body.Date
            })
            const newDayUpdate = await dailyUpdate.save()
            res.status(201).json(newDayUpdate)
        } if (recentRecord.length === 1 && recentRecord[0]["Date"].setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)) {

            const find2 = await HealthStatus.find({"_id": recentRecord[0]["_id"]})
            var deleteEntry = await HealthStatus.deleteOne({"_id": ObjectId(recentRecord[0]["_id"])})
            var recentRecord = await HealthStatus.find({patientId: req.body.patientId}).sort({"Date": -1}).limit(1)
            if (req.body.temperature > 37 || req.body.symptom.length !== 0 ) {
                // get worse
                updatedDays = 0

                await patientsNotification.deleteOne({"userId": ObjectId(req.body.patientId)})


            } else {
                // get better
                updatedDays = recentRecord[0]['daysOfNoSymptom'] + 1

                if(updatedDays>=14){
                    const filterPatient = await patientsNotification.find({userId:req.body.patientId})
                    const notification = new patientsNotification({
                        userId: req.body.patientId,
                        email: findUsers[0]['email'],
                        registrationDate:findUsers[0]['createdDate'],
                        noSymptomsDays:updatedDays
                    })
                    console.log("here",filterPatient)
                    if(filterPatient.length!==0){
                        await patientsNotification.deleteOne({"userId": ObjectId(req.body.patientId)})
                        await notification.save()

                    }else if(filterPatient.length===0){
                        await notification.save()
                    }
                }
            }
            const dailyUpdate = new HealthStatus({
                patientId: req.body.patientId,
                patientName: findPatientId['firstname'],
                daysOfNoSymptom: updatedDays,
                temperature: req.body.temperature,
                symptom: req.body.symptom,// Give me an array of symptoms,
                Date: req.body.Date
            })
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
        //Query data on single data
        if (date_from !== undefined && date_to !== undefined) {
            const findDate = await HealthStatus.find({Date: {$gte: date_from, $lt: date_to}})
            console.log(findDate)

            for (var i = 0; i < findDate.length; i++) {
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

// Single patient health status in a period of time
router.get('/:id', Signin.authenticateToken, async (req, res) => {

    var requestPerson = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    // Patient case
    if (requestPerson[0]['role'] === 'patient') {
        if (requestPerson[0]["_id"].equals(ObjectId(req.params.id))) {
            // This patient can access his health status
            var date_from = req.query['from'];
            var date_to = req.query['to'];
            if (date_from !== undefined && date_to === undefined) {
                const findDate = await HealthStatus.find({Date: {$gte: date_from}, patientId: req.params.id})
                res.status(200).json(findDate)
            }
            if (date_from !== undefined && date_to !== undefined) {
                const findDate = await HealthStatus.find({
                    Date: {$gte: date_from, $lt: date_to},
                    patientId: req.params.id
                })
                res.status(200).json(findDate)
            } else {
                res.status(400).json({message: "wrong format"})

            }
        }
    }
    // Doctor case
    if (requestPerson[0]['role'] === 'doctor') {
        var patientList = requestPerson[0]['patientList']
        console.log(patientList)
        var patientInfo = await Users.findById(req.params.id)
        console.log(patientInfo)
        var patientEmail = patientInfo['email']
        console.log(patientEmail)

        if (patientList.includes(patientEmail)) {
            var date_from = req.query['from'];
            var date_to = req.query['to'];
            if (date_from !== undefined && date_to === undefined) {
                const findDate = await HealthStatus.find({Date: {$gte: date_from, patientId: req.params.id}})
                res.status(200).json(findDate)
            }
            if (date_from !== undefined && date_to !== undefined) {
                const findDate = await HealthStatus.find({
                    Date: {$gte: date_from, $lte: date_to},
                    patientId: req.params.id
                })
                res.status(200).json(findDate)
            } else {
                res.status(400).json({message: "wrong format"})
            }
        } else {
            res.status(403).json({message: "you don't have permission"})
        }
    } else {
        res.status(403).json({message: "you don't have permission"})
    }

})


module.exports = router;
