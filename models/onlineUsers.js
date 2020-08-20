const mongoose = require('mongoose')
const onlineSchema = new mongoose.Schema({
    myDoctor:{
        type: String,
        required: false
    },
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    createdDate:{
        type: Date,
        required: true,
        default:Date.now()

    }
});


module.exports = mongoose.model('onlineUsers', onlineSchema)
