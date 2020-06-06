const mongoose = require('mongoose')

const appointmentTimeSlotSchema = new mongoose.Schema({
    createdDate:{
      type:Date,
      required:true,
      default: Date.now()
    },
    date:{
        type:Date,
        required:true
    },
    timeSlotTaken:{
        type:Array,
        required:true
    },
    availableTimeSlot:{
        type:Array,
        required:true,
        default:[{"hour":9,"minute":0},{"hour":9,"minute":30},{"hour":10,"minute":0},{"hour":10,"minute":30},{"hour":11,"minute":0},{"hour":11,"minute":30},
            {"hour":13,"minute":0},{"hour":13,"minute":30}, {"hour":14,"minute":0},{"hour":14,"minute":30},{"hour":15,"minute":0},{"hour":15,"minute":30},
            {"hour":16,"minute":0},{"hour":16,"minute":30},{"hour":17,"minute":0}
        ]

    }
});


module.exports=mongoose.model('appointmentTimeSlot',appointmentTimeSlotSchema)
