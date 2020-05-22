const express = require('express')
const router = express.Router()
const Users = require('../models/users')
const Signin=require('./signin')



router.get('/:id',Signin.authenticateToken,async (req,res)=>{
    //res.send(req.params.id)
    const finduser = await Users.find({"_id":req.params.id})

    if(finduser[0]["email"] === req.user["email"]){
        res.status(200).json(finduser[0])
    }else{
        // no permission. If access toke does not match up
        res.status(403).json({"message":"You do not have permission"})
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