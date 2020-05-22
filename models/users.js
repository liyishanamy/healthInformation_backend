const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  firstname:{
      type:String,
      required:true
  },
    lastname:{
      type:String,
        required:true
    },
    gender:{
      type:String,
        required:true
    },
  role:{
    type:String,
    required:true
  },
    street:{
        type:String,
        required:true
    },
    city:{
      type:String,
        required:true
    },
    state:{
      type:String,
        required:true
    },
    postcode:{
      type:String,
        required:true
    },
  invitation:{
    type:String,
    required:false
  },
  birthday:{
    type:Date,
    required:true,
    default:Date.now
  },
  age:{
    type:Number,
    required:true
  },
  email:{
    type:String,
    required:true
  },
    password:{
      type:String,
        required:true
    },
  confirmedPassword:{
    type:String,
    required:true
  },
  patientList:{
    type:Array,
    required:false
  },
  myDoctor:{
    type:String,
    required:false
  },
  createdDate:{
    type:Array,
    required:true,
    default: Date.now
  }

});


module.exports=mongoose.model('userInformation',userSchema)