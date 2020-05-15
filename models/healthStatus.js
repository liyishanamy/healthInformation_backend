const mongoose = require('mongoose')

const healthStatusSchema = new mongoose.Schema({
    patientId:{
      type:String,
      required:true
    },
    temperature:{
        type: String,
        required:true
    },
    symptom:{
        type: Array,
        required:true
    },
    Date:{
        type:Date,
        required:true
    }
});


module.exports=mongoose.model('healthStatus',healthStatusSchema)