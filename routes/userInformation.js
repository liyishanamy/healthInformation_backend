const express = require('express')
const router = express.Router()
const Users = require('../models/users')

router.get('/',async (req,res)=>{
    try{
        const users = await Users.find()
        res.json(users)
    }catch(err){
        res.status(500).json({message:err.message})
    }
})

router.get('/:id',getUsers,(req,res)=>{
    res.send(res.user)

})

router.post('/', async (req,res)=>{
    console.log("request",req)
    const user = new Users({
        firstname:req.body.firstname,
        lastname:req.body.lastname,
        gender:req.body.gender,
        street:req.body.street,
        city:req.body.city,
        state:req.body.state,
        postcode:req.body.postcode,
        invitation:req.body.invitation,
        birthday:req.body.birthday,
        email:req.body.email,
        password:req.body.password,
        confirmedPassword:req.body.confirmedPassword

    })
    try{

        const newUser = await user.save()
        res.json(201).json(newUser)

    }catch(err){
        res.status(400).json(err)
        res.status(400).json({message:err.message})

    }

})
router.patch('/:id',getUsers,async (req,res)=>{
    if(req.body.firstname!=null){
        res.user.firstname = req.body.firstname
    }
    if(req.body.email!=null){
        res.user.email=req.body.email
    }
    try{
       const updatedUser = await res.user.save()
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