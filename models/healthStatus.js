const mongoose = require('mongoose')

const healthStatusSchema = new mongoose.Schema({
    myDoctor:{
        type:String,
        required:true
    },
    patientEmail:{
      type:String,
      required:true
    },
    patientName:{
        type:String,
        required:true,
    },
    temperature:{
        type: Number,
        required:true
    },
    symptom:{
        type: Array,
        required:true
    },
    daysOfNoSymptom:{
        type:Number,
        required:true
    },
    Date:{
        type:Date,
        required:true,
        default: Date.now()
    },
    placesFrom:{
        type:String,
        required:false,
    },
    placesTo:{
        type:String,
        required:false,
    },
    mask:{
        type:Boolean,
        required:false
    }
});


module.exports=mongoose.model('healthStatus',healthStatusSchema)
