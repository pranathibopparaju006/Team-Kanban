const jwt = require('jsonwebtoken');
function auth(req,res,next){
  const h=req.headers.authorization||''; const token=h.startsWith('Bearer ')?h.slice(7):null;
  if(!token) return res.status(401).json({error:'Authentication required'});
  try { req.user=jwt.verify(token,process.env.JWT_SECRET||'dev-secret-change-me'); next(); }
  catch(e){ return res.status(401).json({error:'Invalid or expired token'}); }
}
function roles(...allowed){ return (req,res,next)=> allowed.includes(req.user.role)?next():res.status(403).json({error:'Insufficient permissions'}); }
module.exports={auth,roles};
