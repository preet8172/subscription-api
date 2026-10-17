const { default: mongoose } = require('mongoose');
const mongoose = require('mongoose');

const tokenblacklistSchema = new mongoose.Schema ({
    jti :{
        type:String,
        require:true,
        unique:true,
    },
    expireAt:{
        type:Date,
        require:true,
    },
});

tokenblacklistSchema.index(
    {expireAt:1},
    {expireAfterSeconds:0}
);

module.exports = mongoose.model(
    "TokenBlacklist",
    tokenblacklistSchema
);