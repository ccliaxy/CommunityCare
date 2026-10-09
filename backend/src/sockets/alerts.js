// Transitional 5-second DB checks, delivered via Socket.IO. No resident payload broadcast.
// Each socket revalidates identity and queries with that user's RLS token on every check.
function attachAlerts(io,db){
 io.use(async(socket,next)=>{try{await db.authenticate(socket.handshake.auth?.token);next();}catch{next(new Error('Sign in required.'));}});
 io.on('connection',socket=>{
  let stopped=false,previous, timer;
  async function tick(){
   try{
    const actor=await db.authenticate(socket.handshake.auth?.token);
    const rows=await db.table('emergency_alerts','id,updated_at',actor.token);
    const snapshot=JSON.stringify(rows);
    if(!stopped && previous!==undefined && snapshot!==previous) socket.emit('alerts:changed');
    previous=snapshot;
   }catch{socket.disconnect(true);}
   finally{if(!stopped && socket.connected) timer=setTimeout(tick,5000);}
  }
  socket.on('disconnect',()=>{stopped=true;clearTimeout(timer);});
  void tick();
 });
}
module.exports={attachAlerts};
