const express = require('express')
const router = express.Router()
const Invitation = require('../models/invitations')
const Signin=require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
ObjectId = require('mongodb').ObjectID

router.post('/resetPassword', async (req,res)=>{
    Users.findOne({email:req.body.email}).select().exec(function (err,user) {
        if (err){
            res.json({success:false,message:err})
        }
        else{
            if(!user){
                res.status(404).json({success:false,message:'Email was not found'})
            }else{
                /**
                var email = {
                    from :'Health Track Team',
                    to : user.email,
                    subject: 'Reset Password',
                    text: "Hello" + user.name+', you recently requested a new account activation link http://localhost:8000',
                    html:'<h4><b>Reset Password</b></h4>'

                };
                client.sendMail(email,function (err,info) {
                    if(err) console.log(err)

                })*/
                res.status(200).json({success:true,message:'Username has been sent to the e-mail'})
            }
        }

    })

})

module.exports = router;
