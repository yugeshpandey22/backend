const asyncHandler = (reqestHandler) =>{
    (req,res,next)=>{
        Promise.resolve(reqestHandler(req,res,next)).
        catch((err)=> next(err))
    }
}




export {asyncHandler}






//const asyncHandler = ()=> {}
//const asyncHandler =(func)=>()=>{}
//const asyncHandler = (fn)=>asyn()=>{}

// const asyncHandler = (fn) => async(req,res,next)=> {
// try{
//   await fn(req,res,next)
// } catch (errro){
//     res.status(errro.code||500).json({
//         success:false,
//         message:errro.massage
//     })
// }
// }