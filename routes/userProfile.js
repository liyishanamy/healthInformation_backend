const express = require('express')
const router = express.Router()
const Users = require('../models/users')
const Signin = require('./signin')
var fs = require('fs');
var multer = require('multer')
//var upload=multer({dest:'uploads/'})
var ProfileImage = require('../models/profileImage')
var path = require('path')
var hash = require('object-hash')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images');
    },
    filename: function (req, file, cb) {
        var hashImage = hash.sha1(file)
        cb(null, hashImage+file.originalname)

    }
});

const upload = multer({
    storage: storage,
    limits:
        {fileSize: 1024 * 1024 * 5},
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
            return callback(new Error('Only images are allowed'))
        }
        callback(null, true)
    },

});
router.post('/', Signin.authenticateToken, async (req, res) => {
    const bodyEmail = req.body.userEmail // The person's profile that the request person wants to search it up
    const requestPerson = req.user['email']
    const findUser = await Users.find({"email": bodyEmail})
    const request = await Users.find({"email": requestPerson})
    const requestPersonRole = request[0]['role']
    if (requestPersonRole === "doctor") {
        const patientList = request[0]['patientList']
        if (bodyEmail === requestPerson) {
            // Doctor wants to see his own profile
            res.status(200).json({
                firstname: findUser[0]['firstname'],
                lastname: findUser[0]['lastname'],
                gender: findUser[0]['gender'],
                role: findUser[0]['role'],
                street: findUser[0]['street'],
                city: findUser[0]['city'],
                state: findUser[0]['state'],
                postcode: findUser[0]['postcode'],
                birthday: findUser[0]['birthday'],
                phone: findUser[0]['phone'],
                age: findUser[0]['age'],
                email: findUser[0]['email'],
                patientList: findUser[0]['patientList'],
                invitationCode: findUser[0]['invitationCode']
            })

        } else if (bodyEmail !== requestPerson && patientList.includes(bodyEmail)) {
            // The target user is one of the doctors' patients
            res.status(200).json({
                firstname: findUser[0]['firstname'],
                lastname: findUser[0]['lastname'],
                gender: findUser[0]['gender'],
                role: findUser[0]['role'],
                street: findUser[0]['street'],
                city: findUser[0]['city'],
                state: findUser[0]['state'],
                postcode: findUser[0]['postcode'],
                birthday: findUser[0]['birthday'],
                phone: findUser[0]['phone'],
                age: findUser[0]['age'],
                email: findUser[0]['email'],
                myDoctor: findUser[0]['myDoctor']
            })

        } else {
            //Doctor tries to view other patients' profile
            res.status(403).json({message: "You do not have permission"})
        }
    } else if (requestPersonRole === "patient") {
        if (requestPerson === bodyEmail) {
            // View his own profile
            res.status(200).json({
                firstname: findUser[0]['firstname'],
                lastname: findUser[0]['lastname'],
                gender: findUser[0]['gender'],
                role: findUser[0]['role'],
                street: findUser[0]['street'],
                city: findUser[0]['city'],
                state: findUser[0]['state'],
                postcode: findUser[0]['postcode'],
                birthday: findUser[0]['birthday'],
                phone: findUser[0]['phone'],
                age: findUser[0]['age'],
                email: findUser[0]['email'],
                myDoctor: findUser[0]['myDoctor']
            })
        } else {
            //No permission
            res.status(403).json({message: "You do not have permission"})
        }

    }
})

//Update the profiles
router.put('/', Signin.authenticateToken, async (req, res) => {
    const findUsers = await Users.find({"email": req.user["email"]}, null, {limit: 1})
    const requestPerson = findUsers[0]["_id"]
    const putBody = req.body.email
    if (putBody === req.user['email']) {
        var conditions = {_id: requestPerson}
        Users.update(conditions, req.body.update)
            .then(doc => {
                if (!doc) {
                    return res.status(404).end()
                }
                return res.status(200).json({"message": "update user profile successfully!"})
            })
    } else {
        res.status(403).json({"message": "You do not have permission"})
    }

})

// Upload image
router.post("/profileImage", Signin.authenticateToken, upload.single('image'), async (req, res) => {
    console.log("file",req.file)
    //var hashImage = hash.sha1(req.file)
    console.log(req.body.email)
    //console.log(hashImage)
    const profileImages = new ProfileImage({
        userEmail: req.body.email,
        image: req.file.path.substring(6),
        imageName: req.file.filename
    });
    const findImage = await ProfileImage.find({userEmail: req.body.email})
    if (findImage.length !== 0) {
        res.status(400).json({message: "You have already uploaded a profile image"})
    } else {
        profileImages
            .save()
            .then(result => {
                console.log(result)
                if (!result) {
                    return res.status(404).end()
                }
                res.status(201).json({
                    message: "Created product successfully",
                    createdProfileImage: {
                        _id: result._id,
                        request: {
                            type: 'GET',
                            url: "http://localhost:3000/images/"+ req.file.filename
                        }
                    }
                })

            })
            .catch(err => {
                console.log(err);
                res.status(500).json({
                    error: err
                });
            })
    }

})
// Get the profile image
router.post('/getImage', Signin.authenticateToken, async (req, res) => {
    const userEmail = req.body['userEmail']

    const result = await ProfileImage.find({userEmail: userEmail})
    if (result.length === 0) {
        res.status(404).json({message: "Cannot find the profile image"})
    } else {
        console.log("C:\\backup\\".replace(/\/\//g, "/"))
        const path = result[0]['image']
        const afterRegex = path.replace(/\/\//g, "/")
        res.status(200).json({url: "http://localhost:3000/images/" + result[0]['imageName']})
    }

});
// Change a profile picture
router.put('/changeProfileImage', Signin.authenticateToken, upload.single('image'), async (req, res) => {
    console.log(req.file)
    ProfileImage.updateOne({userEmail: req.user['email']}, {$set: {image: req.file.path}})
        .exec()
        .then(result => {
            res.status(200).json({
                message: 'Profile image updated',
                request: {
                    type: 'GET',
                    url: "http://localhost:3000/public/images/" + req.file.filename
                }
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});


router.delete('/removeProfileImage', Signin.authenticateToken,async (req,res)=>{
    const result = await ProfileImage.deleteOne({userEmail: req.user['email']})
    if(result['deletedCount']===1){
        res.status(200).json({message:"Profile picture is removed"})
    }else{
        res.status(404).json({message:"Cannot find your profile picture"})
    }
})

module.exports = router;
