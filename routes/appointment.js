const express = require('express')
const router = express.Router()
const Signin = require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
const Appointment = require('../models/appointment')
const Timeslot = require('../models/appointmentTimeSlot')
const patientsNotification = require('../models/patientsNotification')
const HealthStatus = require('../models/healthStatus')
ObjectId = require('mongodb').ObjectID
//Given a date, return all the available time period back.
router.post('/availableDate',Signin.authenticateToken,async (req, res)=>{
    const queryDate = req.body['date']
    console.log(req.query)
    if (!queryDate){
        res.status(400).json({message:"You must select an appointment date"})
    }else {
        console.log(new Date(queryDate).setHours(0, 0, 0, 0))
        const findDateAvaliability = await Timeslot.find({date: new Date(queryDate).setHours(0, 0, 0, 0)})
        //const findDateAvaliability = await Timeslot.find({date: queryDate})
        console.log("findDateAvaliability", findDateAvaliability)
        if (findDateAvaliability.length===0) {
            res.status(200).json({results: [{"hour": 9, "minute": 0},
                    {"hour": 9, "minute": 30},{"hour": 10, "minute": 0},
                    {"hour": 10, "minute": 30},{"hour": 11, "minute": 0},
                    {"hour": 11, "minute": 30},{"hour": 13, "minute": 0},
                    {"hour": 13, "minute": 30},{"hour": 14, "minute": 0},
                    {"hour": 14, "minute": 30},{"hour": 15, "minute": 0},
                    {"hour": 15, "minute": 30},{"hour": 16, "minute": 0},
                    {"hour": 16, "minute": 30},{"hour": 17, "minute": 0},
                ]
            })
            console.log("Not found")

        }else{
            const timeslot = findDateAvaliability[0]['availableTimeSlot']
            console.log(timeslot)
            res.status(200).json({results:timeslot})
            console.log("found")
        }
    }

})
// Book an appointment - I assume one appointment lasts 30 mins
router.post('/', Signin.authenticateToken, async (req, res) => {
    const requestUser = req.user["email"]
    const findUser = await Users.find({email: requestUser})
    // Check to see if this user has already booked an appointment
    const bookAppointment = await Appointment.find({patientId: findUser[0]['_id']})
    // Check appointment date conflict
    if (bookAppointment.length === 0) {
        const patientId = findUser[0]['_id']
        const startDate = new Date(req.body.appointmentTime)
        const date = new Date(req.body.appointmentTime)
        const endDate = new Date(date.setMinutes((date.getMinutes() + 30)))
        if (findUser[0]['role'] === "patient") {
            const appointment = new Appointment({
                patientId: findUser[0]['_id'],
                patientEmail: findUser[0]['email'],
                patientName: findUser[0]['firstname'] + " " + findUser[0]['lastname'],
                myDoctorId: findUser[0]['myDoctor'],
                appointmentStart:startDate,
                appointmentTime: {"startTime": startDate, "endTime": endDate}
            })
            // find the date record
            const findDate = await Timeslot.find({date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())})
            if (findDate.length === 0) {
                console.log("test point", new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()))
                const timeslot = new Timeslot({
                    date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
                    timeSlotTaken: [
                        {
                            patientId: patientId,
                            startTime: {
                                "time": startDate.getTime(),
                                "hour": startDate.getHours(),
                                "minute": startDate.getMinutes()
                            },
                            endTime: {
                                "time": endDate.getTime(),
                                "hour": endDate.getHours(),
                                "minute": endDate.getMinutes()
                            }
                        }]
                })
                await timeslot.save()

                // Update available time slot list, remove the time slot from the array
                await Timeslot.updateOne({date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())}, {
                    $pull: {
                        availableTimeSlot: {
                            "hour": startDate.getHours(),
                            "minute": startDate.getMinutes()
                        }
                    }
                }, function (err, result) {
                    if (err) {
                        console.log(err)
                    }
                })

                await appointment.save()
                res.status(200).json(appointment)
            } else if (findDate.length === 1) {// Someone has already booked an appointment on that particular date
                // Check to see if the chosen timeslot has been picked by other people
                const findAvailability = findDate[0]["availableTimeSlot"]
                console.log(findAvailability)
                const available = findAvailability.find(element => element.hour === startDate.getHours() && element.minute === startDate.getMinutes())
                console.log("available", available)
                if (!available) {
                    // if not found
                    res.status(400).json({message: "Sorry, this time period has either been already booked or it is unavailable"})
                } else {
                    //if found
                    await Timeslot.updateOne({date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())}, {
                        $addToSet: {
                            timeSlotTaken: {
                                patientId: patientId,
                                startTime: {
                                    "time": startDate.getTime(),
                                    "hour": startDate.getHours(),
                                    "minute": startDate.getMinutes()
                                },
                                endTime: {
                                    "time": endDate.getTime(),
                                    "hour": endDate.getHours(),
                                    "minute": endDate.getMinutes()
                                }
                            }
                        }
                    }, function (err, result) {
                        if (err) {
                            console.log(err)
                        }
                    })

                    // Update available time slot list, remove the time slot from the array
                    await Timeslot.updateOne({date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())}, {
                        $pull: {
                            availableTimeSlot: {
                                "hour": startDate.getHours(),
                                "minute": startDate.getMinutes()
                            }
                        }
                    }, function (err, result) {
                        if (err) {
                            console.log(err)
                        }
                    })
                    await appointment.save()
                    res.status(200).json(appointment)
                }
            }
        } else if (findUser[0]['role'] === "doctor") {
            res.status(403).json({message: "You do not have permission"})
        }
    } else {
        res.status(400).json({message: "You have already booked one appointment. If you want to rebook one, please cancel the existing one first"})
    }
})

// Doctor Update the test done
router.put('/testDone', Signin.authenticateToken, async (req, res) => {
    const requestUser = req.user["email"]
    const findUser = await Users.find({email: requestUser})
    const patientList = findUser[0]['patientList']
    const patientEmail = req.body.patientEmail;
    const findPatient = await Users.find({email:patientEmail})
    if(findPatient.length===0){
        res.status(404).json({message:"Cannot find patient email"})
    }
    const patientId = findPatient[0]['_id']
    const testDone = req.body.testDone;
    if (findUser[0]['role'] === "doctor") {
        if (patientList.includes(patientEmail)) {
            const update = await Appointment.updateOne({"patientId": patientId}, {$set: {"testDone": testDone}})
            if (update.nModified !== 0) {
                res.status(200).json({message: "Test has been updated."})
            } else {
                // Did not update any entry
                const findPatient = await Appointment.find({patientId: patientId})
                if (findPatient.length !== 0) {
                    res.status(200).json({message: "The test has already been done"})
                } else {
                    res.status(404).json({message: "The user is archived"})
                }
            }
        } else {
            res.status(404).json({message: "Cannot find your patient id"})
        }


    } else if (findUser[0]['role'] === "patient") {
        res.status(403).json({message: "You do not have permission"})
    }
})

// Doctor Update the test note
router.put('/testNote', Signin.authenticateToken, async (req, res) => {
    const requestUser = req.user["email"]
    const findUser = await Users.find({email: requestUser})
    const patientList = findUser[0]['patientList']
    const patientEmail = req.body.patientEmail;
    const findPatient = await Users.find({email:patientEmail})
    if(findPatient.length===0){
        res.status(404).json({message:"Cannot find patient email"})
    }
    const patientId = findPatient[0]['_id']
    const testNote = req.body.testNote;
    if (findUser[0]['role'] === "doctor") {
        if (patientList.includes(patientEmail)) {
            const update = await Appointment.updateOne({"patientId": patientId}, {$set: {"testNote": testNote}})
            if (update.nModified !== 0) {
                res.status(200).json({message: "Test note has been updated."})
            } else {
                // Did not update any entry
                const findPatient = await Appointment.find({patientId: patientId})
                if (findPatient.length !== 0) {
                    res.status(200).json({message: "The test has already been done"})
                } else {
                    res.status(404).json({message: "The user is archived"})
                }
            }
        } else {
            res.status(404).json({message: "Cannot find your patient id"})
        }


    } else if (findUser[0]['role'] === "patient") {
        res.status(403).json({message: "You do not have permission"})
    }
})


// Doctor Update the test result
router.put('/testResult', Signin.authenticateToken, async (req, res) => {
    const requestUser = req.user["email"]
    const findUser = await Users.find({email: requestUser})
    const testResult = req.body.testResult;

    const patientList = findUser[0]['patientList']
    const patientEmail = req.body.patientEmail;
    const findPatient = await Users.find({email:patientEmail})
    if(findPatient.length===0){
        res.status(404).json({message:"Cannot find patient email"})
    }
    const patientId = findPatient[0]['_id']

    if (testResult === "positive" || testResult === "negative" || testResult === "Not Done") {
        if (findUser[0]['role'] === "doctor") {
            if (patientList.includes(patientEmail)) {
                const update = await Appointment.updateOne({"patientId": patientId}, {$set: {"testResult": testResult}})
                const updateUser = await Users.updateOne({_id: patientId}, {$set: {"result": testResult}})

                if (update.nModified !== 0 && updateUser.nModified!==0) {
                    if(testResult==="positive"){
                        // Remove this patient from the patient notification collection
                        await patientsNotification.deleteOne({"userEmail": patientEmail})
                        // Set the "daysOfNoSymptoms" to 0 in health status collection
                        await HealthStatus.updateMany({patientEmail:patientEmail},{$set:{daysOfNoSymptom:0}})
                    }
                    res.status(200).json({message: "Test result has been updated."})
                } else {
                    // Did not update any entry
                    const findPatient = await Appointment.find({patientId: patientId})
                    if (findPatient.length !== 0) {
                        res.status(200).json({message: "The test result has already been up to date"})
                    } else {
                        res.status(404).json({message: "The user is archived"})
                    }
                }
            } else {
                res.status(404).json({message: "Cannot find your patient id"})
            }
        } else if (findUser[0]['role'] === "patient") {
            res.status(403).json({message: "You do not have permission"})
        }
    } else {
        res.status(400).json({message: "Please check your input.You should either input positive or negative"})
    }
})


// Patient can view her own appointment
router.post('/myAppointment', Signin.authenticateToken, async (req, res) => {
    const requestUser = req.user["email"]
    var doctorFindId = await Users.find({email:requestUser})
    var expectDoctorId = doctorFindId[0]["_id"].toString()
    const target = req.body['email']
    //Find patient's doctor Id
    const findDoctorId = await Users.find({email:target})
    var doctorId = findDoctorId[0]["myDoctor"]

    //Find doctor record
    const findUser = await Users.find({email: requestUser})
    // Check to see if this user has already booked an appointment
    const bookAppointment = await Appointment.find({patientEmail: target})
    const findPatientList = findUser[0]['patientList']
    console.log("doctorid",doctorFindId,)



    if (findUser[0]['role'] === "doctor" && doctorId===expectDoctorId) {
        res.status(200).json(bookAppointment)
    }
    else if(findUser[0]['role'] === "doctor" && doctorId!==expectDoctorId) {
        res.status(403).json({message: "You do not have permission"})
        //Patient wants to see his own appointment
    } else if (findUser[0]['role'] === 'patient' && requestUser===target) {
        if (bookAppointment.length === 0) {
            res.status(404).json({message: "You do not have a booked appointment yet."})
        } else if (bookAppointment.length === 1) {
            res.status(200).json(bookAppointment)
        }
        //Patient wants to see other patient's appointment
    } else if (findUser[0]['role'] === 'patient' && requestUser!==target){
        res.status(403).json({message:"You do not have permission"})
    }

})

// Doctor can view all the appointments made by the patients
router.get('/allPatients', Signin.authenticateToken,paginatedResults(Appointment), async (req, res) => {
    const requestUser = req.user["email"]
    const findUser = await Users.find({email: requestUser})
    const doctorId = findUser[0]['_id']
    const date_from = req.query.from
    const date_to = req.query.to

    if (findUser[0]['role'] === "doctor") {
       // const findPatients  =await Appointment.find({appointmentStart: {$gte: date_from, $lt: date_to},myDoctorId: doctorId})
        //console.log(findPatients)

        res.status(200).json(res.patientAppointmentData)
    } else if (findUser[0]['role'] === "patient") {
        res.status(403).json({message: "You do not have permission"})
    }
})

// Cancel an appointment
router.delete('/', Signin.authenticateToken, async (req, res) => {
    const requestUser = req.user["email"]
    const findUser = await Users.find({email: requestUser})
    const bookAppointment = await Appointment.find({patientId: findUser[0]['_id']})
    if (findUser[0]['role'] === "doctor") {
        res.status(403).json({message: "You do not have permission"})

    } else if (findUser[0]['role'] === "patient") {
        if (bookAppointment.length === 0) {
            res.status(404).json({message: "You do not have a booked appointment yet."})
        } else if (bookAppointment.length === 1) {
            // Find the record in the appointment collections and appointment time slots collection.
            const patientId = bookAppointment[0]['patientId']
            const appointmentDate = bookAppointment[0]['appointmentTime'].startTime
            const appointmentHour = appointmentDate.getHours()
            const appointmentMinutes = appointmentDate.getMinutes()
            console.log("date", appointmentDate, appointmentHour, appointmentMinutes)
            await Timeslot.updateOne({date: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate())}, {
                $pull: {
                    timeSlotTaken: {
                        patientId: ObjectId(patientId)
                    }
                }
            }, function (err, result) {
                if (err) {
                    console.log(err)
                }
            })

            await Timeslot.updateOne({date: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate())}, {
                $addToSet: {
                    availableTimeSlot: {
                        "hour": appointmentHour,
                        "minute": appointmentMinutes
                    }
                }
            }, function (err, result) {
                if (err) {
                    console.log(err)
                }
            })

            // Delete
            await Appointment.deleteOne({patientId: findUser[0]['_id']})
            res.status(200).json({message: "You successfully cancelled the appointment"})
        }
    }

})

// retest stats
router.get('/stats', Signin.authenticateToken, async (req, res) => {
    const requestPerson = req.user['email']
    const requestUserProfile = await Users.find({email:requestPerson})
    const requestRole = requestUserProfile[0]['role']
    if(requestRole==="doctor"){
        const doctorId = requestUserProfile[0]['_id']
        const findPositivePatients = await Appointment.find({myDoctorId:doctorId.toString(),testResult:"positive"})
        const findNegativePatients = await Appointment.find({myDoctorId:doctorId.toString(),testResult:"negative"})
        const findNotDonePatients = await Appointment.find({myDoctorId:doctorId.toString(),testResult:"Not Done"})
        const positiveNum = findPositivePatients.length
        const negativeNum = findNegativePatients.length
        const notDoneNum = findNotDonePatients.length
        res.status(200).json({
            positive:positiveNum,
            negative:negativeNum,
            notDone:notDoneNum
        })



    }else if(requestRole==="patient"){
        res.status(403).json({message:"You do not have permission"})
    }


})



function paginatedResults(model) {
    return async (req, res, next) => {
        const page = parseInt(req.query.page)
        const limit = parseInt(req.query.limit)

        const requestUser = req.user["email"]
        const findUser = await Users.find({email: requestUser})
        const doctorId = findUser[0]['_id']
        const date_from = req.query.from
        const date_to = req.query.to

        console.log("page",page)
        console.log("limit",limit)
        const startIndex = (page - 1) * limit
        const endIndex = page * limit

        const results = {}

        if (endIndex < await model.countDocuments().exec()) {
            results.next = {
                page: page + 1,
                limit: limit
            }
        }
        if (startIndex > 0) {
            results.previous = {
                page: page - 1,
                limit: limit
            }
        }


        const findUsers = await Users.find({"email": req.user["email"]})
        const role = findUsers[0]["role"]

        var patientAppointmentData;

        if (role === "doctor") {
            const patients = findUsers[0]["patientList"]
            //patientAppointmentData= await model.find({patientEmail: {$in: patients}},null,{limit:limit,skip:startIndex})
            patientAppointmentData  =await model.find({appointmentStart: {$gte: date_from, $lt: date_to},myDoctorId: doctorId},null,{limit:limit,skip:startIndex})


        }
        if(role==="patient"){
            patientAppointmentData="You do not have permission"
        }



        //200 case
        try {
            res.patientAppointmentData= patientAppointmentData
            next()
        } catch (e) {
            res.status(500).json({message: e.message})
        }
    }


}







module.exports = router;
