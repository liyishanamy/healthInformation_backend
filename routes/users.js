var express = require('express');
var router = express.Router();
const Signin = require('./signin')
const Users = require('../models/users')
const Online=require('../models/onlineUsers')
// User logs in => add to the active list

// get active user
router.get('/', Signin.authenticateToken,async (req, res)=> {
  const findUser = await Users.find({email:req.user["email"]})
  if(findUser[0]["role"]==="doctor"){

    const myId = findUser[0]["_id"].toString()
    const findActive = await Online.find({"myDoctor":myId})
    console.log("findActive",findActive)
    res.status(200).json(findActive)
  }else if(findUser[0]["role"]==="patient"){
    const doctorId = findUser[0]["myDoctor"]
    const findUserDoctor=await Users.find({_id:ObjectId(doctorId)})
    const findActive = await Online.find({"myDoctor":doctorId,email:findUserDoctor[0]["email"]})

    res.status(200).json(findActive)
  }
});

// User logs out  => logs out/ remove out from the list
router.delete('/',async (req, res) =>{
  const email = req.body.email
  const findEmail= await Online.find({email:email})
  console.log("test",email,findEmail)
  if(findEmail.length!==0){
    await Online.deleteOne({email:email})
    res.status(200).json({message:email+" is offline"})
  }else{
    res.status(404).json({message:"Cannot find the user"})
  }


});

// Check whether a particular user is online
router.post('/', Signin.authenticateToken,async (req, res)=> {
  const target = req.body.email
  const findUser = await Users.find({email:req.user["email"]})
  if(!target){
    res.status(400).json({message:"You have to input the user email"})
  }
  if(findUser[0]["role"]==="doctor"){
    const myId = findUser[0]["_id"].toString()
    const findActive = await Online.find({"myDoctor":myId,email:target})
    res.status(200).json(findActive)
  }else if(findUser[0]["role"]==="patient"){

    res.status(403).json({message:"You do not have permission to view"})
  }
});
module.exports = router;
