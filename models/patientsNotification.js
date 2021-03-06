const mongoose = require('mongoose')

const patientNotificationSchema = new mongoose.Schema({
    userEmail:{
        type:String,
        required:true
    },
    myDoctorId:{
      type:String,
      required:true
    },
    registrationDate:{
        type:Date,
        required:true
    },
    noSymptomsDays:{
        type:Number,
        required:true
    },
    retest:{
        type:Boolean,
        required:true,
        default:false
    }
});


module.exports=mongoose.model('patientNotification',patientNotificationSchema)
