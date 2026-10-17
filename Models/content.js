const { default: mongoose } = require('mongoose');
const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
    {
        title:{
            type:String,
            required:true,
            trim:true,
        },
        description:{
            type:String,
            required:true,
        },

        category:{
            type:String,
            enum:["free","premium"],
            required:true,
        },

        price:{
            type:Number,
            default:0,
            min:0,
        },
    },
    {timestamps:true}
);

module.exports = mongoose.Model("content",contentSchema);

