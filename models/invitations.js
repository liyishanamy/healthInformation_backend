const mongoose = require('mongoose')

const invitationSchema = new mongoose.Schema({
    doctorId:{
        type:String,
        required:true
    },
    invitationCode:{
        type: String,
        required:true
    }

});


module.exports=mongoose.model('invitation',invitationSchema)