const express = require('express')
const router = express.Router()
const Signin = require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
const Appointment = require('../models/appointment')
const Timeslot = require('../models/appointmentTimeSlot')
ObjectId = require('mongodb').ObjectID

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
            } else if (findDate.length === 1) {// Someone has already booked an appoint on that particular date
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

// Doctor Update the test done ---bug -cannot update properly
router.put('/testDone', Signin.authenticateToken, async (req, res) => {
    const requestUser = req.user["email"]
    const findUser = await Users.find({email: requestUser})
    const patientList = findUser[0]['patientList']
    const patientId = req.body.patientId;
    const findPatient = await Users.findById(ObjectId(patientId))
    if(!findPatient){
        res.status(404).json({message:"Cannot find patient id"})
    }const patientEmail = findPatient.email



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
                    res.status(404).json({message: "Cannot find the patient id"})
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
    const patientId = req.body.patientId;
    const testResult = req.body.testResult;

    const patientList = findUser[0]['patientList']
    const findPatient = await Users.findById(ObjectId(patientId))
    if(!findPatient){
        res.status(404).json({message:"Cannot find patient id"})
    }
    const patientEmail = findPatient.email


    if (testResult === "positive" || testResult === "negative" || testResult === "Not Done") {
        if (findUser[0]['role'] === "doctor") {
            if (patientList.includes(patientEmail)) {
                const update = await Appointment.updateOne({"patientId": patientId}, {$set: {"testResult": testResult}})
                if (update.nModified !== 0) {
                    res.status(200).json({message: "Test has been updated."})
                } else {
                    // Did not update any entry
                    const findPatient = await Appointment.find({patientId: patientId})
                    if (findPatient.length !== 0) {
                        res.status(200).json({message: "The test result has already been up to date"})
                    } else {
                        res.status(404).json({message: "Cannot find the patient id"})
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
router.get('/myAppointment', Signin.authenticateToken, async (req, res) => {
    const requestUser = req.user["email"]
    const findUser = await Users.find({email: requestUser})
    // Check to see if this user has already booked an appointment
    const bookAppointment = await Appointment.find({patientId: findUser[0]['_id']})
    if (findUser[0]['role'] === "doctor") {
        res.status(403).json({message: "You do not have permission"})
    } else if (findUser[0]['role'] === 'patient') {
        if (bookAppointment.length === 0) {
            res.status(404).json({message: "You do not have a booked appointment yet."})
        } else if (bookAppointment.length === 1) {
            res.status(200).json(bookAppointment)
        }
    }

})

// Doctor can view all the appointments made by the patients
router.get('/allPatients', Signin.authenticateToken, async (req, res) => {
    const requestUser = req.user["email"]
    const findUser = await Users.find({email: requestUser})
    const doctorId = findUser[0]['_id']
    const date_from = req.query.from
    const date_to = req.query.to

    if (findUser[0]['role'] === "doctor") {
        const findPatients  =await Appointment.find({appointmentStart: {$gte: date_from, $lt: date_to},myDoctorId: doctorId})
        console.log(findPatients)
        //const findPatients = await Appointment.find({myDoctorId: doctorId},{appointmentStart: {$gte: date_from, $lt:date_to}})

        res.status(200).json({findPatients})
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

})

// Doctor can query the appointments on one particular day.
router.get('/patient', Signin.authenticateToken, async (req, res) => {
    const date = req.query['date']


})

module.exports = router;
