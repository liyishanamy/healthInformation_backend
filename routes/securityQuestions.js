const express = require('express')
const router = express.Router()
const Users = require('../models/users')
const Signin=require('./signin')
const security = require('../models/securityQuestions')


// set the security questions
router.post('/',Signin.authenticateToken,async (req,res)=>{
    var findUsers =  await Users.find({"email":req.user["email"]},null,{limit:1})
    console.log(req.body)
    const questions = new security({
        userEmail:req.body.userEmail,
        question1:{"question_1":req.body.question1.question_1, "answer_1":req.body.question1.answer_1},
        question2:{"question_2":req.body.question2.question_2, "answer_2":req.body.question2.answer_2},
        question3:{"question_3":req.body.question3.question_3, "answer_3":req.body.question3.answer_3},
    })
    const requestPerson = findUsers[0]["email"]
    const findRecord = await security.find({"userEmail": questions.userEmail})
    console.log(findRecord)
    if (findRecord.length!==0){
        res.status(400).json({message:"Security questions has already been set"})
    }else{
        if (requestPerson===questions.userEmail) {
            const securityQuestions = await questions.save()
            res.status(201).json(securityQuestions)
        }
        else if(requestPerson!==questions.userEmail) {
            res.status(403).json({message:"You do not have permission."})
        }else{
            res.status(400).json({message:"bad request"})
        }
    }
})
// Get the security questions
router.post('/getQuestions',async (req,res)=>{
    console.log("amy",req.body)
    const userEmail = req.body.email
    console.log(userEmail)
    var findUsers =  await security.find({userEmail:userEmail})
    const test = await security.find()
    console.log("findUser",test)
    console.log(findUsers)

    if(findUsers.length===1){
        res.status(200).json({question1: findUsers[0].question1["question_1"],question2: findUsers[0].question2["question_2"],
            question3: findUsers[0].question3["question_3"]})
    }
    else if(findUsers.length===0){
        res.status(404).json({message:"The user has not set the security questions yet"})
    }

})

// answer the security questions
router.post('/authenticate',async (req,res)=>{
    // You must get authentication(email/all security questions to reset the password)
    var userEmail = req.body.email

    var findSecurityQuestions = await security.find({"userEmail":userEmail})
    console.log("findSecurityQuestions",findSecurityQuestions)
    if(findSecurityQuestions.length===0){
        res.status(403).json({message:"Failed to authenticate"})
    }else{
        // Get the answer from the front end
        var user_answer1 = req.body.question1.answer_1
        var user_answer2 = req.body.question2.answer_2
        var user_answer3 = req.body.question3.answer_3

        // get the answer from the backend
        var correct_answer1 = findSecurityQuestions[0]["question1"]["answer_1"]
        var correct_answer2 = findSecurityQuestions[0]["question2"]["answer_2"]
        var correct_answer3 = findSecurityQuestions[0]["question3"]["answer_3"]
        if (user_answer1 ===correct_answer1 && user_answer2 ===correct_answer2 && user_answer3 ===correct_answer3){
            const accessToken = Signin.generateAccessToken({email:userEmail})
            res.status(200).json({accessToken:accessToken})
        }else{
            res.status(401).json({message:"Authentication failed"})
        }
    }






})
module.exports = router;
