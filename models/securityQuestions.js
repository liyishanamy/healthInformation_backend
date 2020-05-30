const mongoose = require('mongoose')

const securityQuestionsSchema = new mongoose.Schema({
    userId:{
        type:String,
        required:true
    },
    question1:{
        type:Object,
        required:true,
        default:null
    },
    question2:{
        type:Object,
        required:true,
        default: null

    },
    question3:{
        type:Object,
        required:true,
        default:null
    }


});


module.exports=mongoose.model('securityQuestions',securityQuestionsSchema)
