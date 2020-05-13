const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const Users = require('../models/users')
const Signin=require('./signin')

router.get('/', Signin.authenticateToken, async (req,res)=>{
    try{
        const users = await Users.find()
        console.log(users)
        console.log(users.filter(user=>user.email === req.user.email))

        res.json(users.filter(user=>user.email === req.user.email))
    }catch(err){
        res.status(500).json({message:err.message})
    }
})

router.get('/:id',Signin.authenticateToken,(req,res)=>{
    //res.send(req.params.id)

    res.send(res.user)

})

router.post('/', async (req,res)=>{
    const hashedPassword = await bcrypt.hash(req.body.password,10)
    console.log(hashedPassword)
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
        password:hashedPassword,
        confirmedPassword:hashedPassword


    })
    console.log(user)

    try{

        const newUser = await user.save()
        res.json(201).json(newUser)
    }catch(err){
        res.status(400).json(err)
        res.status(400).json({message:err.message})
    }


})

router.put('/:id',getUsers, function (req,res){
    var conditions = {_id:req.params.id}
    Users.update(conditions,req.body)
        .then(doc=>{
            if(!doc){return res.status(404).end()}
            return res.status(200).json(doc)
        })

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
