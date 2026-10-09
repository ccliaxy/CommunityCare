const {createTaskService}=require('../services/tasks');
const {registerDevice}=require('../services/devices');
const {createUnitService}=require('../services/units');
const express=require('express');
const {createResidentService}=require('../services/residents');
const {readDashboard,readAlerts}=require('../services/dashboard');
function createRoutes(db,env){
 const router=express.Router(), residents=createResidentService(db,env), tasks=createTaskService(db);
 router.get('/mobile/tasks',async(req,res)=>{
  const actor=await db.authenticate(req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1],['elderly','family']);
  res.json(await tasks.mobile(actor));
 });
 router.post('/mobile/device',async(req,res)=>{
  const actor=await db.authenticate(req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1],['elderly']);
  res.json(await registerDevice(db,actor,req.body));
 });
 router.use(async(req,res,next)=>{req.actor=await db.authenticate(req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1]);next();});
 router.get('/dashboard',async(req,res)=>res.json(await readDashboard(db,req.actor)));
 router.get('/alerts',async(req,res)=>res.json(await readAlerts(db,req.actor)));
 router.use('/residents',(req,res,next)=>req.actor.role==='property_staff'?next():res.status(403).json({error:'Property staff account required.'}));
 router.get('/residents',async(req,res)=>res.json(await residents.list(req.actor)));
 router.post('/residents',async(req,res)=>res.status(201).json(await residents.invite(req.actor,req.body)));
 router.patch('/residents/:id',async(req,res)=>res.json({id:await residents.save(req.actor,req.params.id,req.body)}));
 const units=createUnitService(db);
 router.use('/units',(req,res,next)=>req.actor.role==='property_staff'?next():res.status(403).json({error:'Property staff account required.'}));
 router.get('/units',async(req,res)=>res.json(await units.list(req.actor)));
 router.post('/units',async(req,res)=>{const result=await units.create(req.actor,req.body);res.status(result.created?201:200).json(result);});
 router.use('/tasks',(req,res,next)=>req.actor.role==='property_staff'?next():res.status(403).json({error:'Property staff account required.'}));
 router.get('/tasks',async(req,res)=>res.json(await tasks.list(req.actor)));
 router.post('/tasks',async(req,res)=>{const result=await tasks.create(req.actor,req.body);res.status(result.replayed?200:201).json(result);});
 router.patch('/tasks/:id',async(req,res)=>res.json(await tasks.update(req.actor,req.params.id,req.body)));
 return router;
}
module.exports={createRoutes};
