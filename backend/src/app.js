const express=require('express');
const cors=require('cors');
const {createRoutes}=require('./routes/api');
function createApp(db,env){
 const app=express();app.disable('x-powered-by');
 const origins=(env.ALLOWED_ORIGINS??'').split(',').map(s=>s.trim()).filter(Boolean);
 app.use(cors({origin(origin,done){done(null,!origin||origins.includes(origin));}}));
 app.use(express.json({limit:'16kb'}));
 app.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 app.get('/health',(req,res)=>res.json({ok:true,service:'CommunityCare Express'}));
 app.use('/api',createRoutes(db,env));
 app.use((req,res)=>res.status(404).json({error:'Route not found.'}));
 app.use((error,req,res,next)=>{if(res.headersSent)return next(error);res.status(error.status>=400&&error.status<600?error.status:500).json({error:error.status?error.message:'Backend could not complete the request. Check server configuration.'});});
 return app;
}
module.exports={createApp};
