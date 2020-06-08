const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema({
    patientId:{
      type:String,
      required: true
    },
    patientEmail:{
        type:String,
        required:true
    },
    patientName:{
        type:String,
        required:true
    },
    myDoctorId:{
        type:String,
        required:true
    },
    appointmentStart:{
        type:Date,
        required:true
    },
    appointmentTime:{
        type:Object,
        required:true,
        default:null
    },
    testDone:{
        type:Boolean,
        required:true,
        default:false
    },
    testResult:{
        type:String,
        required:true,
        default:"Not Done"
    }
});


module.exports=mongoose.model('appointment',appointmentSchema)
