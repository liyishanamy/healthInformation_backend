const mongoose = require('mongoose')

const profileImageSchema = new mongoose.Schema({
    userEmail:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    imageName:{
        type:String,
        required:true
    }


})


module.exports=mongoose.model('profileImage',profileImageSchema)
