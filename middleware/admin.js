const  adminonly = (req,res,next) =>{
    if(!req.user || req.user.role !== "admin") {
        return res.status(402).json ({
            message: "admin access required",
        });
    };
        next();   
};
module.exports = adminonly;