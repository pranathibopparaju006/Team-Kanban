const db=require('../config/db');
async function logActivity({projectId,taskId=null,userId=null,action,message,metadata=null}){
  await db.execute('INSERT INTO activity_logs(project_id,task_id,user_id,action,message,metadata) VALUES (?,?,?,?,?,?)',[projectId,taskId,userId,action,message,metadata?JSON.stringify(metadata):null]);
}
module.exports={logActivity};
