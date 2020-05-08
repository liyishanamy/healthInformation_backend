const express=require("express");
const path = require("path");
const app=express();
const port = 3000
app.get('/',(req,res)=>{
    res.send("hello world")
});

app.listen(port,()=>console.log("listen on port 3000"))