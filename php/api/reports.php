<?php
header('Content-Type: application/json; charset=utf-8');
$host=getenv('DB_HOST') ?: '127.0.0.1'; $port=getenv('DB_PORT') ?: '3306'; $db=getenv('DB_NAME') ?: 'teamkanban'; $user=getenv('DB_USER') ?: 'root'; $pass=getenv('DB_PASSWORD') ?: '';
try{$pdo=new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);}catch(Throwable $e){http_response_code(503);echo json_encode(['success'=>false,'error'=>'Database unavailable']);exit;}
$project=(int)($_GET['project_id']??0); if(!$project){http_response_code(400);echo json_encode(['success'=>false,'error'=>'project_id is required']);exit;}
$stmt=$pdo->prepare("SELECT COUNT(*) total,SUM(status='done') done,SUM(status='blocked') blocked,SUM(priority='critical') critical,SUM(priority='high') high FROM tasks WHERE project_id=?");$stmt->execute([$project]);$summary=$stmt->fetch(PDO::FETCH_ASSOC);
$stmt=$pdo->prepare("SELECT DATE(created_at) day,COUNT(*) created FROM tasks WHERE project_id=? GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 14");$stmt->execute([$project]);echo json_encode(['success'=>true,'data'=>['summary'=>$summary,'daily'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]],JSON_UNESCAPED_UNICODE);
