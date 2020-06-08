const express = require('express')
const router = express.Router()
const Users = require('../models/users')
const Signin=require('./signin')



router.post('/',Signin.authenticateToken,async (req,res)=>{
    const bodyEmail = req.body.userEmail // The person's profile that the request person wants to search it up
    const requestPerson = req.user['email']
    const findUser = await Users.find({"email":bodyEmail})
    const request = await Users.find({"email":requestPerson})
    const requestPersonRole = request[0]['role']
    if(requestPersonRole === "doctor"){
        const patientList = request[0]['patientList']
        if(bodyEmail === requestPerson){
            // Doctor wants to see his own profile
            res.status(200).json({
                firstname:findUser[0]['firstname'],
                lastname:findUser[0]['lastname'],
                gender:findUser[0]['gender'],
                role:findUser[0]['role'],
                street:findUser[0]['street'],
                city:findUser[0]['city'],
                state:findUser[0]['state'],
                postcode:findUser[0]['postcode'],
                birthday:findUser[0]['birthday'],
                phone:findUser[0]['phone'],
                age:findUser[0]['age'],
                email:findUser[0]['email'],
                patientList:findUser[0]['patientList'],
                invitationCode:findUser[0]['invitationCode']
            })

        }else if(bodyEmail !== requestPerson && patientList.includes(bodyEmail)){
            // The target user is one of the doctors' patients
            res.status(200).json({
                firstname:findUser[0]['firstname'],
                lastname:findUser[0]['lastname'],
                gender:findUser[0]['gender'],
                role:findUser[0]['role'],
                street:findUser[0]['street'],
                city:findUser[0]['city'],
                state:findUser[0]['state'],
                postcode:findUser[0]['postcode'],
                birthday:findUser[0]['birthday'],
                phone:findUser[0]['phone'],
                age:findUser[0]['age'],
                email:findUser[0]['email'],
                myDoctor:findUser[0]['myDoctor']
                })

        }else{
            //Doctor tries to view other patients' profile
            res.status(403).json({message:"You do not have permission"})
        }
    }else if(requestPersonRole === "patient"){
        if (requestPerson===bodyEmail){
            // View his own profile
            res.status(200).json({
                firstname:findUser[0]['firstname'],
                lastname:findUser[0]['lastname'],
                gender:findUser[0]['gender'],
                role:findUser[0]['role'],
                street:findUser[0]['street'],
                city:findUser[0]['city'],
                state:findUser[0]['state'],
                postcode:findUser[0]['postcode'],
                birthday:findUser[0]['birthday'],
                phone:findUser[0]['phone'],
                age:findUser[0]['age'],
                email:findUser[0]['email'],
                myDoctor:findUser[0]['myDoctor']
            })
        }else{
            //No permission
            res.status(403).json({message:"You do not have permission"})
        }

    }
})

router.put('/:id',Signin.authenticateToken, async (req,res)=>{
    const findUsers = await Users.find({"email":req.user["email"]},null,{limit:1})
    const requestPerson = findUsers[0]["_id"]
    if (requestPerson.equals(ObjectId(req.params.id))) {
        var conditions = {_id: req.params.id}
        Users.update(conditions, req.body)
            .then(doc => {
                if (!doc) {
                    return res.status(404).end()
                }
                return res.status(200).json({"message":"update user profile properly!"})
            })
    }
    else{
        res.status(403).json({"message":"You do not have permission"})
    }

})

module.exports = router;
