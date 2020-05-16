const express = require('express')
const router = express.Router()
const HealthStatus = require('../models/healthStatus')
const Invitation = require('../models/invitations')
const Signin=require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
ObjectId = require('mongodb').ObjectID

router.post('/',Signin.authenticateToken, async (req,res)=>{
    const findUsers = await Users.find({"email":req.user["email"]},null,{limit:1})
    const requestPerson = findUsers[0]["_id"]
    if (findUsers ==null){
        return res.status(404).json({message:"cannot find user"})
    }
    if (requestPerson.equals(ObjectId(req.body.patientId))){
        const dailyUpdate = new HealthStatus({
            patientId:req.body.patientId,
            temperature:req.body.temperature,
            symptom:req.body.symptom,// Give me an array of symtoms,
            Date:req.body.Date
        })
        const newDayUpdate = await dailyUpdate.save()
        res.status(201).json(newDayUpdate)
    }else{
        res.status(403).json({"message":"You do not have permission"})
    }
})

// Single patient health status
router.get('/:id',Signin.authenticateToken, async (req,res)=> {

    var requestPerson = await Users.find({"email":req.user["email"]},null,{limit:1})
    console.log(requestPerson)
    // Patient case
    if(requestPerson[0]['role']==='patient'){
        if (requestPerson[0]["_id"].equals(ObjectId(req.params.id)) ){
            // This patient can access his health status
            var date_from = req.query['from'];
            var date_to = req.query['to'];
            if (date_from!==undefined && date_to===undefined){
                const findDate = await HealthStatus.find({Date:{$gte:date_from}})
                res.status(200).json(findDate)
            }
            if(date_from!==undefined && date_to!==undefined){
                const findDate = await HealthStatus.find({Date:{$gte:date_from,$lte:date_to}})
                res.status(200).json(findDate)
            }else{
                res.status(400).json({message:"wrong format"})

            }
        }
    }
    // Doctor case
    if(requestPerson[0]['role']==='doctor'){
        var patientList = requestPerson[0]['patientList']
        console.log(patientList)
        var patientInfo = await Users.findById(req.params.id)
        console.log(patientInfo)
        var patientEmail = patientInfo['email']
        console.log(patientEmail)

        if(patientList.includes(patientEmail)){
            var date_from = req.query['from'];
            var date_to = req.query['to'];
            if (date_from!==undefined && date_to===undefined){
                const findDate = await HealthStatus.find({Date:{$gte:date_from}})
                res.status(200).json(findDate)
            }
            if(date_from!==null && date_to!==0){
                const findDate = await HealthStatus.find({Date:{$gte:date_from,$lte:date_to}})
                res.status(200).json(findDate)
            }else{
                res.status(400).json({message:"wrong format"})

            }

        }else{
            res.status(403).json({message:"you don't have permission"})
        }
    }else{
        res.status(403).json({message:"you don't have permission"})
    }




    //const findUsers = await HealthStatus.find({patientId:req.params.id})
    //console.log(findUsers)





})
module.exports = router;
