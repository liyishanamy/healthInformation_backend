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
    required:true
  },
  birthday:{
    type:Date,
    required:true,
    default:Date.now
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
  isDeleted:{
    type:Boolean,
    default: false
  }
});
userSchema.methods.generateHash = function(password){
  return bcrypt.hashSync(password,bcrypt.genSaltSync(8),null);
};
userSchema.methods.validPassword = function(password){
  return bcrypt.compareSync(password,this.password);
};

module.exports=mongoose.model('userInformation',userSchema)