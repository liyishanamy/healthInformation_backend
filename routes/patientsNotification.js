const express = require('express')
const router = express.Router()
const Signin=require('./signin')
const Users = require('../models/users')
var mongoose = require('mongoose');
ObjectId = require('mongodb').ObjectID

// Doctor get all the patients' information who do not have symptoms for 2 weeks
router.get('/', Signin.authenticateToken, async (req,res)=> {

})
module.exports = router;
