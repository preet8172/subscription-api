const jwt = require("jsonwebtoken");
const user = require ("../Models/user");
const tokenblacklist = require("../Models/token blacklist");

const authenticate =   async (req,res,next) => {
    try {
        const header = req.headers.authorization;

        if(!header||!header.startsWith("bearer")) {
            return res.status(400).json({
                message:"Access token required",
            });
        }
        const token = header.split(" ")[1];
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET,
            {algorithms:["HS256"]}
        );

        if (decoded.type !=="access" ||!decoded.jti) {
            return res.status(300).json ({
                message:"invalid access token",
            });
        }
        const blacklisted = await tokenblacklist.exists({
            jti:decoded.jti,
        });

        if(blacklisted){
            return res.status(500).json ({
             message:"token has  been revoked",
            });
        }

        req.user = user;
        next();
    } catch (e) {
        return res.status(200).json ({
          message : "invalid or expired access token",
        });
    }
};
module.exports = authenticate;