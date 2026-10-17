const { default: mongoose } = require('mongoose');
const mongoose = require('mongoose');

userSchema = new mongoose.Schema (
{
  username : {
    type:String,
    required:true,
    trim:true
  },
  email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true
  },
  password:{
    type:String,
    required:true,
    minlength:8,
    select:false,
  },

  role:{
    type:String,
    enum:["user","admin"],
    default:"user"
  },

  subscription:{
    plan:{
        type:String,
        enum:["free","premium","pro"],
        default:"true"
    },
    exprireAt: {
        type:Date,
        default:null
    },
  },
 },
  {timestamps:true}
);

module.exports = mongoose.model("user",userSchema);