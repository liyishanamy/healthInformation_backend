const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const Users = require('../models/users')
const Signin=require('./signin')
const Invitation = require('../models/invitations')
ObjectId = require('mongodb').ObjectID
var mongoose = require('mongoose');

router.get('/getPatientList',Signin.authenticateToken,async (req,res)=>{
    const findUsers = await Users.find({"email":req.user["email"]})
    if(findUsers[0]["role"]==="doctor"){
        res.status(200).json(findUsers[0]["patientList"])
    } else if(findUsers[0]["role"]==="patient"){
        res.status(403).json({message:"You do not have permission"})
    }
})
router.get('/', Signin.authenticateToken, paginatedResults(Users), async (req,res)=> {
    try {

        if(res.patientData === "You do not have permission"){
            res.status(403).json({"message":res.patientData})
        }else if(res.patientData==="You have to add the active filter."){
            res.status(400).json({message:res.patientData})
        }
        else{
            res.status(200).json(res.patientData)
        }

        //res.json(users.filter(user=>user.email === req.user.email))
    } catch (err) {
        res.status(500).json({message: err.message})
    }
})

// Get total patients that belongs to particular doctor
router.get('/totalPatients', Signin.authenticateToken, async (req,res)=> {
    const findUsers = await Users.find({"email":req.user["email"]})
    const doctorId = findUsers[0]["_id"].toString()
    const findArchived = await Users.find({myDoctor:doctorId,active:false})
    const role = findUsers[0]["role"]
    // true or false
    const status = req.query["active"]
    if (role === "doctor"){
        const patients = findUsers[0]["patientList"]
        console.log(patients.length)
        if(status==="true"){
            res.status(200).json({totalPatients:patients.length})
        }else if(status==="false"){
            res.status(200).json({totalPatients:findArchived.length})
        }
    }if (role==="patient"){
        res.status(403).json({message:"You don't have permission"})
    }
})

// Get people who joined on particular date(today)
router.get('/totalJoinPatients', Signin.authenticateToken, async (req,res)=> {
    var joinDate = req.query["queryDate"]
    const findUser= await Users.find({"email":req.user["email"]})
    const findPatients = findUser[0]["patientList"]
    console.log("find patient",findPatients)
    joinDate = new Date(joinDate)
    console.log("format date",new Date(joinDate).getFullYear(), new Date(joinDate).getMonth(),new Date(joinDate).getUTCDate())
    joinDate = new Date(new Date(joinDate).getFullYear(), new Date(joinDate).getMonth(),new Date(joinDate).getUTCDate())
    console.log(joinDate)

    const target = await Users.find({createdDate: {$eq: joinDate},email:{$in : findPatients}})
    console.log(target)
    const role = findUser[0]["role"]
    if (role === "doctor"){
        res.status(200).json({totalJoinPatients:target.length})
    }if (role==="patient"){
        res.status(403).json({message:"You don't have permission"})
    }
})

// Get the gender=0,1,2 number(male,female,other)
router.get('/gender',  Signin.authenticateToken, async (req,res)=>{
    const findUsers = await Users.find({"email":req.user["email"]})
    const role = findUsers[0]["role"]
    if (role === "doctor"){
        const patients = findUsers[0]["patientList"]
        console.log(patients)
        Users.find({'email':{$in: patients}},function (err,docs) {
            console.log(docs)
            var female = docs.filter(function (data) {
                return data.gender==="female"
            })
            var male = docs.filter(function (data) {
                return data.gender==="male"
            })
            var other = docs.filter(function (data) {
                return data.gender==="other"
            })
            res.status(200).json({"female":female.length,"male":male.length,"other":other.length})
        })
    }if (role==="patient"){
        res.status(403).json({message:"You don't have permission"})
    }
})
// Doctor gets the address of the patients=> map display purpose
router.get('/address',Signin.authenticateToken,async (req,res)=>{
    const requestUsers = await Users.find({email:req.user['email']})
    if(requestUsers[0]['role']==="doctor"){
        const field = await Users.aggregate([{$match: {email: {$in: requestUsers[0]['patientList']}}},
            { $project : { email:1, street : 1, city : 1, state: 1, postcode:1 }} ])
        res.status(200).json(field)
    }else if(requestUsers[0]['role']==='patient'){
        res.status(403).json({message:"You do not have permission to see."})
    }
})

router.get('/age',Signin.authenticateToken, async (req,res)=>{
    const findUsers = await Users.find({"email":req.user["email"]})
    console.log(findUsers)
    const role = findUsers[0]["role"]
    var age_from = parseInt(req.query['from']);
    var age_to = parseInt(req.query['to']);
    const patients =  findUsers[0]['patientList']
    console.log("age_from",age_from)
    console.log("age_to",age_to)
    if (role === "doctor"){
        Users.find({'email':{$in: patients}},async function (err,docs) {
            console.log(docs)
            if (age_from!==undefined && age_to===undefined){
                const findAge = docs.filter(function (data) {
                    return data.age>=age_from})
                res.status(200).json({ageRange:age_from+"-"+age_to,number:findAge.length,users:findAge})
            }
            if(age_from!==undefined && age_to!==undefined){
                console.log("age_from",age_from)
                console.log("age_to",age_to)
                console.log(age_to>age_from)
                if (age_to>age_from){
                    const findAge = docs.filter(function (data) {
                        return data.age>=age_from && data.age<age_to})
                    console.log("findAge",findAge)
                    res.status(200).json({ageRange:age_from+"-"+age_to,number:findAge.length,users:findAge})
                }else{
                    res.status(400).json({message:"wrong format"})
                }

            }else{
                res.status(400).json({message:"wrong format"})

            }})}

    if (role==="patient"){
        res.status(403).json({message:"You don't have permission"})
    }
})

router.post('/signup', async (req,res)=>{
    const hashedPassword = await bcrypt.hash(req.body.password,10)
    var role = await req.body.role
    var user;
    let birthday = req.body.birthday
    let ageDif = Date.now()-Date.parse(birthday);
    var ageDate = new Date(ageDif)
    var userAge = Math.abs(ageDate.getUTCFullYear()-1970)
    const invitation = Math.random().toString(36).substring(7)

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
            phone:req.body.phone,
            age:userAge,
            email:req.body.email,
            password:hashedPassword,
            confirmedPassword:hashedPassword,
            patientList:[],
            invitationCode:invitation
        })}
    if(role === "patient"){
        //check Invitation code validation, if not valid, return 400 error
            user = new Users({
                firstname:req.body.firstname,
                lastname:req.body.lastname,
                gender:req.body.gender,
                role:req.body.role,
                street:req.body.street,
                city:req.body.city,
                state:req.body.state,
                postcode:req.body.postcode,
                phone:req.body.phone,
                invitation:req.body.invitation,
                birthday:req.body.birthday,
                age:userAge,
                email:req.body.email,
                password:hashedPassword,
                confirmedPassword:hashedPassword,
                result:"positive"
            })
        }
    console.log(user)
    const users = await Users.find({email:req.body.email},null,{limit:1})
    try{
        // Check email existence
        if(users.length!==0){
            res.status(400).json({"message":"The user email has been already in use."})
        }
        else{
            useremail={email:req.body.email}
            const accessToken = Signin.generateAccessToken(useremail)
            console.log(accessToken)
            if(user["role"]==="doctor"){
                await user.save()
                const doctorId = await Users.find({email:req.body.email})


                res.status(201).json({
                    accessToken:accessToken,
                    firstname:req.body.firstname,
                    lastname:req.body.lastname,
                    gender:req.body.gender,
                    role:req.body.role,
                    street:req.body.street,
                    city:req.body.city,
                    state:req.body.state,
                    postcode:req.body.postcode,
                    birthday:req.body.birthday,
                    phone:req.body.phone,
                    age:userAge,
                    email:req.body.email,
                    patientList:[],
                    invitationCode:invitation
                })
                const invite = new Invitation({
                    doctorId:doctorId[0]['_id'],
                    invitationCode:invitation
                })
                await invite.save();
            }
            if (user["role"]==="patient"){
                let patientEmail = user["email"]
                let code = user["invitation"]
                const findDoctorEntry = await Invitation.find({invitationCode:code})
                console.log("findDocotor",findDoctorEntry)
                if (findDoctorEntry.length ===0){
                    res.status(404).json({message:"The doctor invitation code is not valid"})
                }else{
                    Users.update({_id:findDoctorEntry[0]['doctorId']},{$addToSet:{patientList:[patientEmail]}},function (err,result) {
                        if(err){
                            console.log(err)
                        }})
                    user["myDoctor"]=findDoctorEntry[0]['doctorId']
                    await user.save()
                    res.status(201).json({
                        accessToken:accessToken,
                        firstname:req.body.firstname,
                        lastname:req.body.lastname,
                        gender:req.body.gender,
                        role:req.body.role,
                        street:req.body.street,
                        city:req.body.city,
                        state:req.body.state,
                        postcode:req.body.postcode,
                        phone:req.body.phone,
                        invitation:req.body.invitation,
                        birthday:req.body.birthday,
                        age:userAge,
                        email:req.body.email,
                    })
                }
            }
        }
    }catch(err){
        res.status(400).json({message:"Please make sure all the required field has been filled."})
    }
})


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

router.post('/archive',Signin.authenticateToken, async (req,res)=>{
    const email = req.user["email"]
    const patientEmail = req.body.patientEmail
    const findUser = await Users.find({email:email})
    const findPatient= await Users.find({email:patientEmail})
    let patients = findUser[0]["patientList"]
    console.log("findUserdelete",findPatient)

    if(findPatient.length===0){
        res.status(404).json({message:"Cannot find the patient"})
    }else{
        if(findUser[0]["role"]==="doctor" ){
            if(findPatient[0]['active']){
                //await Users.remove({email:patientEmail})
                patients = patients.filter(item=>item!==patientEmail)
                // Remove the user from the active patient lists
                await Users.update({email:email},{$set:{patientList: patients}})
                await Users.update({email:patientEmail},{$set:{active:false}})
                // await archiveUser.save()
                res.status(200).json({message:'The user has been successfully archived',active:false})
            }else{
                // already archived
                res.status(400).json({message:'The user has already been archived',active:false})
            }

        }else if(findUser[0]["role"]==="patient"){
            res.status(403).json({message:"You do not have permission"})
        }
    }
})
router.post('/getStatus',Signin.authenticateToken, async (req,res)=>{
    const email = req.user["email"]
    const patientEmail = req.body.patientEmail
    const findUser =  await Users.find({email:email})
    const findPatient= await Users.find({email:patientEmail})
    const doctorId = findUser[0]["_id"].toString()
    const expectDoctorId  =findPatient[0]["myDoctor"]
    if(findPatient.length===0){
        res.status(404).json({message:"Cannot find the patient"})
    }
    else{
        if(findUser[0]["role"]==="doctor" ){
            if(doctorId===expectDoctorId){
                // have permission
                res.status(200).json({"active":findPatient[0]["active"]})
            }else{
                // No permission
                res.status(403).json({message:"You do not have permission"})
            }
        }else if(findUser[0]["role"]==="patient"){
            if(email===patientEmail){
                //Okay to see status
                res.status(200).json({"active":findPatient[0]["active"]})
            }else{
                res.status(403).json({message:"You do not have permission"})
            }
        }}
    }

)
router.post('/activate',Signin.authenticateToken, async (req,res)=>{
    const email = req.user["email"]
    const patientEmail = req.body.patientEmail
    const findUser = await Users.find({email:email})
    const findPatient= await Users.find({email:patientEmail})
    let patients = findUser[0]["patientList"]

    if(findPatient.length===0){
        res.status(404).json({message:"Cannot find the patient"})
    }else{
        if(findUser[0]["role"]==="doctor" ){
            if(!findPatient[0]['active']){
                //await Users.remove({email:patientEmail})
                patients = patients.concat(patientEmail)

                // Remove the user from the active patient lists
                await Users.update({email:email},{$set:{patientList: patients}})
                await Users.update({email:patientEmail},{$set:{active:true}})
                // await archiveUser.save()
                res.status(200).json({message:'The user has been successfully activated',active:true})
            }else{
                // User already activated
                res.status(400).json({message:'The user has already been activated',active:true})

            }

        }else if(findUser[0]["role"]==="patient"){
            res.status(403).json({message:"You do not have permission"})
        }
    }

})
async function getUsers(req,res,next) {
    let user;
    try {
        user = await Users.findById(req.params.id)
        if (user == null) {
            return res.status(404).json({message: "cannot find user"})
        }

    } catch (err) {
        return res.status(500).json({message: err.message})
    }
    res.user = user;
    next();

}


function paginatedResults(model) {
    return async (req, res, next) => {
        const page = parseInt(req.query.page)
        const limit = parseInt(req.query.limit)
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
        const patientId = findUsers[0]["_id"]

        var patientData;

        var filterGender = req.query["gender"]
        var filterActive = req.query["active"]
        if (role === "doctor") {
            const patients = findUsers[0]["patientList"]
            if (filterGender !== undefined) {
                if (filterGender === '0') {
                    patientData= await model.find({email: {$in: patients},gender:"female"},null,{limit:limit,skip:startIndex})
                } else if (filterGender === '1') {
                        // gender = male
                    patientData= await model.find({email: {$in: patients},gender:"male"},null,{limit:limit,skip:startIndex})
                } else if (filterGender === '2') {
                    // gender = other
                    patientData= await model.find({email: {$in: patients},gender:"other"},null,{limit:limit,skip:startIndex})
                }

                }

            else {// If no query is specified
                if(filterActive==="true"){
                    patientData= await model.find({email: {$in: patients},active:filterActive},null,{limit:limit,skip:startIndex})
                }else if(filterActive==="false"){
                    patientData= await model.find({myDoctor: patientId,active:filterActive},null,{limit:limit,skip:startIndex})
                }else if(filterActive===undefined){
                    patientData="You have to add the active filter."
                }

            }
            }
        if(role==="patient"){
            patientData="You do not have permission"
        }
            //200 case
            try {
                res.patientData= patientData
                next()
            } catch (e) {
                res.status(500).json({message: e.message})
            }
        }

        }

module.exports=router
