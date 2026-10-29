<?php
header('Content-Type: application/json; charset=utf-8');
$host=getenv('DB_HOST') ?: '127.0.0.1';$port=getenv('DB_PORT') ?: '3306';$db=getenv('DB_NAME') ?: 'teamkanban';$user=getenv('DB_USER') ?: 'root';$pass=getenv('DB_PASSWORD') ?: '';
try{$pdo=new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);}catch(Throwable $e){http_response_code(503);echo json_encode(['success'=>false,'error'=>'Database unavailable']);exit;}
$project=(int)($_GET['project_id']??0);$limit=min(100,max(1,(int)($_GET['limit']??25)));$stmt=$pdo->prepare("SELECT a.id,a.action,a.message,a.created_at,u.name user_name FROM activity_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.project_id=? ORDER BY a.created_at DESC LIMIT $limit");$stmt->execute([$project]);echo json_encode(['success'=>true,'data'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
