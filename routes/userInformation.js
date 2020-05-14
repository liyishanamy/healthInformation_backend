const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const Users = require('../models/users')
const Signin=require('./signin')
const Invitation = require('../models/invitations')
ObjectId = require('mongodb').ObjectID
var mongoose = require('mongoose');
router.get('/', Signin.authenticateToken, async (req,res)=>{
    try{
        // Check the role of the users
        const findUsers = await Users.find({"email":req.user["email"]})
        const role = findUsers[0]["role"]
        console.log(findUsers)
        if (role === "doctor"){
            console.log("doctorrrr")
            const patients = findUsers[0]["patientList"]
            console.log(patients)
            Users.find({'email':{$in: patients}},function (err,docs) {
                console.log(docs)
                res.status(200).json(docs)
            })
            //const users = await Users.find()


        }if (role==="patient"){
            console.log("patient")
            res.status(403).send("You don't have permission")
        }

        //res.json(users.filter(user=>user.email === req.user.email))
    }catch(err){
        res.status(500).json({message:err.message})
    }
})
/**
router.get('/:id',Signin.authenticateToken,async (req,res)=>{
    //res.send(req.params.id)
    const finduser = await Users.find({"_id":req.params.id})
    console.log(finduser[0])
    if(finduser[0]["email"] === req.user["email"]){
        res.status(200).json(finduser[0])
    }else{
        // no permission. If access toke does not match up
        res.status(403).send("Unauthorized")
    }
})
*/

router.post('/', async (req,res)=>{
    const hashedPassword = await bcrypt.hash(req.body.password,10)
    var role = await req.body.role
    var user;
    if(role==="doctor"){
        user = new Users({
            firstname:req.body.firstname,
            lastname:req.body.lastname,
            gender:req.body.gender,
            role:req.body.role,
            street:req.body.street,
            city:req.body.city,
            state:req.body.state,
            postcode:req.body.postcode,
            birthday:req.body.birthday,
            email:req.body.email,
            password:hashedPassword,
            confirmedPassword:hashedPassword,
            patientList:[]
        })}
    if(role === "patient"){
            user = new Users({
                firstname:req.body.firstname,
                lastname:req.body.lastname,
                gender:req.body.gender,
                role:req.body.role,
                street:req.body.street,
                city:req.body.city,
                state:req.body.state,
                postcode:req.body.postcode,
                invitation:req.body.invitation,
                birthday:req.body.birthday,
                email:req.body.email,
                password:hashedPassword,
                confirmedPassword:hashedPassword
            })

        }

    const users = await Users.find({email:req.body.email},null,{limit:1})
    console.log("user",user)

    //const result = users.filter(user=>user.email === req.user.email)
    //console.log("result",result)
    console.log("users",users)
    try{
        if(users.length!==0){
            res.status(400).json({"message":"The user email has been already in use."})
        }
        else{
            if (user["role"]==="doctor"){
                console.log("this is a doctor, update invitation collections")
            }
            if (user["role"]==="patient"){
                let patientEmail = user["email"]
                let code = user["invitation"]
                console.log(patientEmail)
                const findDoctorEntry = await Invitation.find({invitationCode:code},null,{limit:1})
                console.log("findDoctorEntry",findDoctorEntry)
                console.log(findDoctorEntry[0]['doctorId'])
                console.log(mongoose.Types.ObjectId.isValid(ObjectId(findDoctorEntry[0]['doctorId'])));
                //const findDoctorId = await Users.findById(findDoctorEntry[0]['doctorId'])
                //console.log("findDoctorId",findDoctorId)
                Users.update({_id:findDoctorEntry[0]['doctorId']},{$addToSet:{patientList:[patientEmail]}},function (err,result) {
                    if(err){
                        console.log(err)
                    }

                })
                console.log("this is a patient, add the id to the invitation collections")
            }
            const newUser = await user.save()
            res.status(201).json(newUser)
        }
    }catch(err){
        res.status(400).json({message:err.message})
    }
})
/**

router.put('/:id',getUsers, function (req,res){
    var conditions = {_id:req.params.id}
    Users.update(conditions,req.body)
        .then(doc=>{
            if(!doc){return res.status(404).end()}
            return res.status(200).json(doc)
        })

})*/
router.patch('/:id',getUsers,async (req,res)=>{
    console.log(req.body.lastname)
    if(!req.body.firstname){
        res.user.firstname = req.body.firstname
    }

    if(!req.body.lastname){
        console.log("lastname")
        res.user.lastname = req.body.lastname
    }
    if(!req.body.gender){
        res.user.gender = req.body.gender
    }
    if(req.body.street!==null){
        res.user.street = req.body.street
    }
    if(req.body.city!==null){
        res.user.city = req.body.city
    }

    if(req.body.state!==null){
        res.user.state = req.body.state
    }
    if(req.body.postcode!==null){
        res.user.postcode = req.body.postcode
    }
    if(req.body.invitation!==null){
        res.user.invitation = req.body.invitation
    }
    if(req.body.birthday!==null){
        res.user.birthday = req.body.birthday
    }

    if(req.body.email!==null){
        res.user.email=req.body.email
    }


    try{

       const updatedUser = await res.user.save()
        console.log(res)
       res.json(updatedUser)

    }catch(err){
        res.status(400).json({message:err.message})
    }

})
router.delete('/:id',getUsers, async (req,res)=>{
    try{
        await res.user.remove();
        res.json({message:'Delete'})
    }catch(err){
        res.status(500).json({message:err.message})
    }
})

async function getUsers(req,res,next){
    let user;
    try{
        user = await Users.findById(req.params.id)
        console.log(user)
        if (user ==null){
            return res.status(404).json({message:"cannot find user"})
        }

    } catch(err){
        return res.status(500).json({message:err.message})
    }
    res.user = user;
    next();

    }




module.exports=router
