require('dotenv').config();
const path=require('path');
const express=require('express');
const http=require('http');
const helmet=require('helmet');
const cors=require('cors');
const {Server}=require('socket.io');
const jwt=require('jsonwebtoken');
const db=require('./config/db');
const {JWT_SECRET}=require('./middleware/auth');
const api=require('./routes/api');
const {notFound,errorHandler}=require('./middleware/error');
const app=express(); const server=http.createServer(app);
const io=new Server(server,{cors:{origin:true,methods:['GET','POST','PATCH','DELETE']}}); app.set('io',io);
app.use(helmet({contentSecurityPolicy:false}));app.use(cors({origin:true}));app.use(express.json({limit:'1mb'}));app.use(express.urlencoded({extended:true}));
app.use('/api/v1',api); app.use(express.static(path.join(__dirname,'../../frontend')));
app.get('/api/v1/health',(req,res)=>res.json({success:true}));
app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Route not found'});res.sendFile(path.join(__dirname,'../../frontend/index.html'));});
io.use((socket,next)=>{
  const token=socket.handshake.auth&&socket.handshake.auth.token;
  if(!token)return next(new Error('Authentication required'));
  try{
    socket.data.user=jwt.verify(token,JWT_SECRET);
    return next();
  }catch(error){
    return next(new Error('Invalid or expired token'));
  }
});
io.on('connection',socket=>{
  socket.on('project:join',async value=>{
    const projectId=Number(value);
    if(!Number.isSafeInteger(projectId)||projectId<=0)return;
    try{
      const [membership]=await db.execute(
        'SELECT 1 FROM project_members WHERE project_id=? AND user_id=?',
        [projectId,socket.data.user.id]
      );
      if(!membership.length){
        socket.emit('project:error',{error:'Project membership required'});
        return;
      }
      await socket.join(`project:${projectId}`);
    }catch(error){
      socket.emit('project:error',{error:'Unable to join project updates'});
    }
  });
  socket.on('project:leave',value=>{
    const projectId=Number(value);
    if(Number.isSafeInteger(projectId)&&projectId>0)socket.leave(`project:${projectId}`);
  });
});
app.use(notFound);app.use(errorHandler);
const port=Number(process.env.PORT||5000);server.listen(port,()=>console.log(`TeamKanban running at http://localhost:${port}`));
